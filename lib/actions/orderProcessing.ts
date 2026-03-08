import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'
import { getVendorCategoryFeeMap } from '@/lib/actions/vendorCategoryFees'
import { sendOrderConfirmation } from '@/lib/email'
import { allocateInventory, assignShipmentWarehouseForOrder } from '@/lib/helpers/warehouses'
import { getOrderContactName, getOrderPhone, sendOrderCreatedSms } from '@/lib/helpers/sms'
import { consumeStoreCredit } from '@/lib/actions/storeCredit'
import { dispatchZapierEvent } from '@/lib/actions/zapier'
import { assignLicenseKeysForOrder } from '@/lib/actions/licenseKeys'
import { assignDigitalDownloadsForOrder } from '@/lib/actions/digitalDownloads'
import { parseProductMeta } from '@/lib/helpers/productMeta'

export type FinalizeOrderItemPayload = {
  productId: string
  variantId?: string
  variantLabel?: string
  quantity: number
  price: number
}

export async function finalizeCheckoutOrder(input: {
  buyerId?: string | null
  buyerEmail?: string | null
  customerName?: string | null
  stripeSessionId?: string | null
  stripePaymentId?: string | null
  paymentStatus?: string
  orderItems: FinalizeOrderItemPayload[]
  orderTotal: number
  shippingAmount?: number
  shippingMethodCode?: string | null
  shippingMethodLabel?: string | null
  shippingAddress?: Record<string, unknown>
  couponCode?: string | null
  storeCreditApplied?: number
}) {
  const metaRows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: input.orderItems.map((item) => `productMeta:${item.productId}`),
      },
    },
  })
  const metaMap = new Map(
    metaRows.map((row) => [row.key.replace('productMeta:', ''), parseProductMeta(row.value)]),
  )
  const hasPhysicalShipmentItems = input.orderItems.some((item) => {
    const meta = metaMap.get(item.productId)
    return (meta?.catalog?.listingType ?? 'FOR_SALE') !== 'LICENSE_KEYS'
  })

  const order = await prisma.order.create({
    data: {
      buyerId: input.buyerId || undefined,
      buyerEmail: input.buyerEmail || null,
      status: hasPhysicalShipmentItems ? 'PENDING' : 'DELIVERED',
      total: input.orderTotal,
      shippingAmount: input.shippingAmount ?? 0,
      shippingMethodCode: input.shippingMethodCode || null,
      shippingMethodLabel: input.shippingMethodLabel || null,
      shippingAddress: (input.shippingAddress ?? {}) as Prisma.InputJsonValue,
      stripeSessionId: input.stripeSessionId || undefined,
      stripePaymentId: input.stripePaymentId || undefined,
      items: {
        create: input.orderItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    include: { items: { include: { product: { select: { name: true } } } } },
  })

  if (hasPhysicalShipmentItems) {
    const warehouse = await assignShipmentWarehouseForOrder(order.id)

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        warehouseId: warehouse?.id,
        status: 'PENDING',
      },
    })
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      stripePaymentId: input.stripePaymentId || input.stripeSessionId || `manual-${order.id}`,
      amount: input.orderTotal,
      status: input.paymentStatus || 'succeeded',
    },
  })

  const orderItemsWithStore = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    include: {
      product: {
        include: {
          store: { select: { id: true, commissionRate: true } },
          category: { select: { id: true } },
        },
      },
    },
  })

  const categoryFeeMap = await getVendorCategoryFeeMap()
  const vendorEarnings = new Map<string, number>()
  for (const item of orderItemsWithStore) {
    const gross = item.price * item.quantity
    const baseRate = item.product.store.commissionRate
    const categoryRate = categoryFeeMap.get(item.product.category.id) ?? 0
    const totalFeeRate = Math.min(100, baseRate + categoryRate) / 100
    const net = Number((gross * (1 - totalFeeRate)).toFixed(2))
    vendorEarnings.set(item.product.store.id, Number(((vendorEarnings.get(item.product.store.id) ?? 0) + net).toFixed(2)))
  }

  for (const [storeId, amount] of vendorEarnings.entries()) {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        totalEarned: { increment: amount },
        pendingPayout: { increment: amount },
      },
    })
  }

  for (const item of input.orderItems) {
    await allocateInventory(item.productId, item.quantity, item.variantId)
  }

  await assignLicenseKeysForOrder(order.id)
  await assignDigitalDownloadsForOrder(order.id)

  if (input.couponCode) {
    await prisma.coupon.updateMany({
      where: { code: input.couponCode, isActive: true },
      data: { usedCount: { increment: 1 } },
    })
  }

  if (input.buyerId && input.storeCreditApplied && input.storeCreditApplied > 0) {
    await consumeStoreCredit(input.buyerId, input.storeCreditApplied, `Applied to order ${order.id}`)
  }

  if (input.buyerId) {
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: input.buyerId } },
    })
  }

  const emailTo = input.buyerEmail || (input.buyerId ? (await prisma.user.findUnique({ where: { id: input.buyerId }, select: { email: true } }))?.email : null)
  const buyerName = input.customerName || (input.buyerId ? (await prisma.user.findUnique({ where: { id: input.buyerId }, select: { name: true } }))?.name : null) || 'Customer'
  if (emailTo) {
    try {
      await sendOrderConfirmation({
        to: emailTo,
        name: buyerName || 'Customer',
        orderId: order.id,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
        })),
        total: order.total,
      })
    } catch (error) {
      console.warn('Order confirmation email failed:', error)
    }
  }

  const smsPhone = getOrderPhone(order.shippingAddress)
  const smsEnabled = input.buyerId ? (await getNotificationPreferences(input.buyerId)).smsOrderUpdates : true
  if (smsPhone && smsEnabled) {
    try {
      await sendOrderCreatedSms({
        phone: smsPhone,
        name: getOrderContactName(order.shippingAddress, buyerName),
        orderId: order.id,
        total: order.total,
      })
    } catch (error) {
      console.warn('Order confirmation SMS failed:', error)
    }
  }

  try {
    await dispatchZapierEvent('order.created', {
      orderId: order.id,
      buyerId: input.buyerId ?? null,
      buyerEmail: input.buyerEmail ?? null,
      total: order.total,
      shippingAmount: order.shippingAmount,
      shippingMethodLabel: order.shippingMethodLabel,
      itemCount: input.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      items: input.orderItems,
    })
  } catch (error) {
    console.warn('Zapier order.created failed:', error)
  }

  return order
}
