import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { finalizeCheckoutOrder, type FinalizeOrderItemPayload } from '@/lib/actions/orderProcessing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session & {
          metadata?: {
            buyerId?: string
            orderItems?: string
            orderTotal?: string
            couponCode?: string
            shippingAmount?: string
            shippingMethodCode?: string
            shippingMethodLabel?: string
            storeCreditApplied?: string
            customerName?: string
            customerEmail?: string
            customerPhone?: string
            shippingLine1?: string
            shippingCity?: string
            shippingPostalCode?: string
            shippingCountry?: string
          }
        }
        const metadata = session.metadata ?? {}
        if (!metadata.orderItems) {
          console.warn('No orderItems in session metadata')
          break
        }

        let orderItems: FinalizeOrderItemPayload[]
        try {
          orderItems = JSON.parse(metadata.orderItems) as FinalizeOrderItemPayload[]
        } catch {
          console.warn('Invalid orderItems JSON')
          break
        }

        const shippingAddress: Record<string, unknown> = {}
        const collectedShipping = session.collected_information?.shipping_details
        if (collectedShipping?.address) {
          const address = collectedShipping.address
          shippingAddress.line1 = address.line1
          shippingAddress.line2 = address.line2 ?? null
          shippingAddress.city = address.city
          shippingAddress.state = address.state
          shippingAddress.postal_code = address.postal_code
          shippingAddress.country = address.country
        }
        if (collectedShipping?.name) {
          shippingAddress.name = collectedShipping.name
        }
        if (session.customer_details?.email) {
          shippingAddress.email = session.customer_details.email
        }
        if (!shippingAddress.name && session.customer_details?.name) {
          shippingAddress.name = session.customer_details.name
        }
        if (metadata.customerPhone) {
          shippingAddress.phone = metadata.customerPhone
        }
        if (!shippingAddress.line1 && metadata.shippingLine1) {
          shippingAddress.line1 = metadata.shippingLine1
        }
        if (!shippingAddress.city && metadata.shippingCity) {
          shippingAddress.city = metadata.shippingCity
        }
        if (!shippingAddress.postal_code && metadata.shippingPostalCode) {
          shippingAddress.postal_code = metadata.shippingPostalCode
        }
        if (!shippingAddress.country && metadata.shippingCountry) {
          shippingAddress.country = metadata.shippingCountry
        }
        if (!shippingAddress.email && metadata.customerEmail) {
          shippingAddress.email = metadata.customerEmail
        }
        if (!shippingAddress.name && metadata.customerName) {
          shippingAddress.name = metadata.customerName
        }

        const fallbackTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const metadataTotal = Number.parseFloat(metadata.orderTotal ?? '')
        const total = Number.isFinite(metadataTotal) ? metadataTotal : fallbackTotal
        const shippingAmount = Number.parseFloat(metadata.shippingAmount ?? '0')
        const storeCreditApplied = Number.parseFloat(metadata.storeCreditApplied ?? '0')

        const order = await finalizeCheckoutOrder({
          buyerId: metadata.buyerId || null,
          buyerEmail: (session.customer_details?.email as string) || metadata.customerEmail || null,
          customerName: (session.customer_details?.name as string) || metadata.customerName || null,
          stripeSessionId: session.id,
          stripePaymentId: (session.payment_intent as string) || session.id,
          paymentStatus: 'succeeded',
          orderItems,
          orderTotal: total,
          shippingAmount: Number.isFinite(shippingAmount) ? shippingAmount : 0,
          shippingMethodCode: metadata.shippingMethodCode || null,
          shippingMethodLabel: metadata.shippingMethodLabel || null,
          shippingAddress,
          couponCode: metadata.couponCode?.trim().toUpperCase() || null,
          storeCreditApplied: Number.isFinite(storeCreditApplied) ? storeCreditApplied : 0,
        })

        console.log('Order created:', order.id)
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        console.log('Payment failed:', paymentIntent.id)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Event handling error: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
