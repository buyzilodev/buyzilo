import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'
import { quoteEligibleBundles } from '@/lib/actions/bundles'
import { finalizeCheckoutOrder } from '@/lib/actions/orderProcessing'
import { getStoreCreditSummary } from '@/lib/actions/storeCredit'
import { parseShippingMethods, resolveShippingMethod } from '@/lib/helpers/shipping'
import { resolveCheckoutItems } from '@/lib/actions/checkout'
import { prisma } from '@/lib/prisma'
import { checkoutRequestSchema } from '@/lib/validators/checkout'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const parsed = checkoutRequestSchema.parse(body)

    const items = await resolveCheckoutItems(
      parsed,
      session?.user?.id ? (session.user as { id: string }).id : undefined
    )

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid items to checkout' }, { status: 400 })
    }

    const buyerId = session?.user?.id ? (session.user as { id: string }).id : undefined
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
    const shippingSettings = await prisma.siteSettings.findUnique({ where: { key: 'shippingMethodsConfig' } })
    const shippingConfig = parseShippingMethods(shippingSettings?.value)
    const shippingSelection = resolveShippingMethod(
      shippingConfig,
      parsed.shippingMethodCode,
      subtotal,
      parsed.shippingCountry
    )
    const shippingAmount = shippingSelection.shippingAmount

    const bundleQuote = await quoteEligibleBundles(items)
    let discountAmount = bundleQuote.discountAmount
    let appliedCouponCode: string | null = null
    if (parsed.couponCode) {
      const couponCode = parsed.couponCode.trim().toUpperCase()
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode, isActive: true },
      })

      if (coupon) {
        const isExpired = coupon.expiresAt ? coupon.expiresAt < new Date() : false
        const isMaxed = coupon.maxUses != null && coupon.usedCount >= coupon.maxUses
        const meetsMinOrder = coupon.minOrder == null || subtotal >= coupon.minOrder

        if (!isExpired && !isMaxed && meetsMinOrder) {
          const couponDiscount = coupon.isPercent ? (subtotal * coupon.discount) / 100 : coupon.discount
          discountAmount += couponDiscount
          discountAmount = Math.min(discountAmount, subtotal)
          discountAmount = roundMoney(discountAmount)
          appliedCouponCode = couponCode
        }
      }
    }

    const preCreditTotal = roundMoney(Math.max(0, subtotal - discountAmount + shippingAmount))
    const storeCreditBalance = buyerId && parsed.applyStoreCredit ? (await getStoreCreditSummary(buyerId)).balance : 0
    const storeCreditApplied = roundMoney(Math.min(preCreditTotal, storeCreditBalance))
    const total = roundMoney(Math.max(0, preCreditTotal - storeCreditApplied))

    const orderPayload = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
      price: i.price,
    }))

    const metadata: Record<string, string> = {
      orderItems: JSON.stringify(orderPayload),
      subtotal: String(subtotal),
      shippingAmount: String(shippingAmount),
      shippingMethodCode: shippingSelection.method.code,
      shippingMethodLabel: shippingSelection.method.label,
      discountAmount: String(discountAmount),
      orderTotal: String(total),
      bundleDiscountAmount: String(bundleQuote.discountAmount),
      storeCreditApplied: String(storeCreditApplied),
    }

    if (appliedCouponCode) {
      metadata.couponCode = appliedCouponCode
    }
    if (bundleQuote.bundles.length > 0) {
      metadata.bundleSummary = JSON.stringify(
        bundleQuote.bundles.map((bundle) => ({
          title: bundle.title,
          savings: bundle.savings,
          applications: bundle.applications,
        }))
      )
    }
    if (buyerId) {
      metadata.buyerId = buyerId
    }
    metadata.customerName = `${parsed.firstName} ${parsed.lastName}`.trim()
    metadata.customerEmail = parsed.email
    metadata.customerPhone = parsed.phone
    metadata.shippingLine1 = parsed.address
    metadata.shippingCity = parsed.city
    metadata.shippingPostalCode = parsed.zip
    metadata.shippingCountry = parsed.country

    if (total === 0) {
      const order = await finalizeCheckoutOrder({
        buyerId: buyerId ?? null,
        buyerEmail: session?.user?.email ?? null,
        customerName: metadata.customerName || session?.user?.name || null,
        paymentStatus: 'succeeded',
        orderItems: orderPayload,
        orderTotal: total,
        shippingAmount,
        shippingMethodCode: shippingSelection.method.code,
        shippingMethodLabel: shippingSelection.method.label,
        shippingAddress: {
          name: metadata.customerName || null,
          email: parsed.email,
          phone: parsed.phone,
          line1: parsed.address,
          city: parsed.city,
          postal_code: parsed.zip,
          country: parsed.country,
        },
        couponCode: appliedCouponCode,
        storeCreditApplied,
      })

      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/order-success?order_id=${order.id}`,
      })
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Buyzilo order (${items.length} item${items.length > 1 ? 's' : ''})`,
          },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      },
    ]

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cart`,
      shipping_address_collection: {
        allowed_countries: ['US', 'GB', 'PK', 'AE', 'CA', 'AU'],
      },
      metadata,
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
