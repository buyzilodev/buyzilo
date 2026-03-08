import { NextResponse } from 'next/server'
import { requireAdminApiPermission } from '@/lib/admin/api'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'
import { prisma } from '@/lib/prisma'
import { getOrderContactName, getOrderPhone, sendShipmentStatusSms } from '@/lib/helpers/sms'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

async function syncOrderStatus(orderId: string, shipmentStatus: string) {
  if (shipmentStatus === 'SHIPPED' || shipmentStatus === 'IN_TRANSIT') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED' } })
  }
  if (shipmentStatus === 'DELIVERED') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } })
  }
}

async function maybeSendShipmentSms(orderId: string, status: 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED', trackingNumber?: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, shippingAddress: true },
  })

  if (!order) {
    return
  }

  const phone = getOrderPhone(order.shippingAddress)
  if (!phone) {
    return
  }

  const enabled = order.buyerId ? (await getNotificationPreferences(order.buyerId)).smsOrderUpdates : true
  if (!enabled) {
    return
  }

  await sendShipmentStatusSms({
    phone,
    name: getOrderContactName(order.shippingAddress),
    orderId: order.id,
    status,
    trackingNumber,
  })
}

export async function GET() {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }

  const shipments = await prisma.shipment.findMany({
    include: {
      warehouse: {
        select: { id: true, name: true, code: true },
      },
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          buyerEmail: true,
          shippingMethodLabel: true,
          shippingAmount: true,
          items: {
            select: {
              product: {
                select: {
                  storeId: true,
                  store: {
                    select: {
                      warehouses: {
                        where: { isActive: true },
                        select: { id: true, name: true, code: true, isDefault: true },
                        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({
    shipments: shipments.map((shipment) => ({
      ...shipment,
      warehouseOptions: Array.from(
        new Map(
          shipment.order.items.flatMap((item) =>
            item.product.store.warehouses.map((warehouse) => [warehouse.id, warehouse] as const)
          )
        ).values()
      ),
    })),
  })
}

export async function POST(req: Request) {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }

  const body = await req.json() as {
    orderId?: string
    warehouseId?: string
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
    status?: 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'
  }

  if (!body.orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const shipment = await prisma.shipment.create({
    data: {
      orderId: body.orderId,
      warehouseId: body.warehouseId || null,
      carrier: body.carrier?.trim() || null,
      trackingNumber: body.trackingNumber?.trim() || null,
      trackingUrl: body.trackingUrl?.trim() || null,
      status: body.status ?? 'PENDING',
      shippedAt: body.status === 'SHIPPED' || body.status === 'IN_TRANSIT' ? new Date() : null,
      deliveredAt: body.status === 'DELIVERED' ? new Date() : null,
    },
  })

  await syncOrderStatus(body.orderId, shipment.status)
  if (shipment.status === 'SHIPPED' || shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED') {
    try {
      await maybeSendShipmentSms(shipment.orderId, shipment.status, shipment.trackingNumber)
    } catch (error) {
      console.warn('Shipment SMS failed:', error)
    }
  }
  try {
    await dispatchZapierEvent('shipment.updated', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      warehouseId: shipment.warehouseId,
      actorType: 'admin',
    })
  } catch (error) {
    console.warn('Zapier shipment.updated failed:', error)
  }
  return NextResponse.json({ success: true, shipment })
}

export async function PATCH(req: Request) {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }

  const body = await req.json() as {
    id?: string
    warehouseId?: string | null
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
    status?: 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'
  }

  if (!body.id) {
    return NextResponse.json({ error: 'shipment id is required' }, { status: 400 })
  }

  const shipment = await prisma.shipment.update({
    where: { id: body.id },
    data: {
      ...(body.carrier !== undefined ? { carrier: body.carrier?.trim() || null } : {}),
      ...(body.warehouseId !== undefined ? { warehouseId: body.warehouseId || null } : {}),
      ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber?.trim() || null } : {}),
      ...(body.trackingUrl !== undefined ? { trackingUrl: body.trackingUrl?.trim() || null } : {}),
      ...(body.status
        ? {
          status: body.status,
          shippedAt: body.status === 'SHIPPED' || body.status === 'IN_TRANSIT' ? new Date() : undefined,
          deliveredAt: body.status === 'DELIVERED' ? new Date() : undefined,
        }
        : {}),
    },
  })

  await syncOrderStatus(shipment.orderId, shipment.status)
  if (shipment.status === 'SHIPPED' || shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED') {
    try {
      await maybeSendShipmentSms(shipment.orderId, shipment.status, shipment.trackingNumber)
    } catch (error) {
      console.warn('Shipment SMS failed:', error)
    }
  }
  try {
    await dispatchZapierEvent('shipment.updated', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      warehouseId: shipment.warehouseId,
      actorType: 'admin',
    })
  } catch (error) {
    console.warn('Zapier shipment.updated failed:', error)
  }
  return NextResponse.json({ success: true, shipment })
}
