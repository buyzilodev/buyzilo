import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'
import { prisma } from '@/lib/prisma'
import { getOrderContactName, getOrderPhone, sendShipmentStatusSms } from '@/lib/helpers/sms'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

async function getVendorStore() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) return null
  return prisma.store.findUnique({ where: { vendorId: userId } })
}

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
  const store = await getVendorStore()
  if (!store) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const shipments = await prisma.shipment.findMany({
    where: {
      order: {
        items: {
          some: {
            product: { storeId: store.id },
          },
        },
      },
    },
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
            where: { product: { storeId: store.id } },
            select: {
              quantity: true,
              price: true,
              product: { select: { id: true, name: true } },
              variant: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })

  const warehouses = await prisma.warehouse.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true, code: true, isDefault: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({
    shipments: shipments.map((shipment) => ({
      ...shipment,
      warehouseOptions: warehouses,
    })),
    store: { id: store.id, name: store.name },
  })
}

export async function PATCH(req: Request) {
  const store = await getVendorStore()
  if (!store) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: body.id,
      order: {
        items: {
          some: {
            product: { storeId: store.id },
          },
        },
      },
    },
  })

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  }

  if (body.warehouseId) {
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: body.warehouseId, storeId: store.id, isActive: true },
    })
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      ...(body.warehouseId !== undefined ? { warehouseId: body.warehouseId || null } : {}),
      ...(body.carrier !== undefined ? { carrier: body.carrier?.trim() || null } : {}),
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

  await syncOrderStatus(updated.orderId, updated.status)
  if (updated.status === 'SHIPPED' || updated.status === 'IN_TRANSIT' || updated.status === 'DELIVERED') {
    try {
      await maybeSendShipmentSms(updated.orderId, updated.status, updated.trackingNumber)
    } catch (error) {
      console.warn('Shipment SMS failed:', error)
    }
  }
  try {
    await dispatchZapierEvent('shipment.updated', {
      shipmentId: updated.id,
      orderId: updated.orderId,
      status: updated.status,
      carrier: updated.carrier,
      trackingNumber: updated.trackingNumber,
      trackingUrl: updated.trackingUrl,
      warehouseId: updated.warehouseId,
      actorType: 'vendor',
      storeId: store.id,
    })
  } catch (error) {
    console.warn('Zapier shipment.updated failed:', error)
  }
  return NextResponse.json({ success: true, shipment: updated })
}
