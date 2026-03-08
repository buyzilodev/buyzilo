import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await prisma.returnRequest.findMany({
    where: { userId },
    include: {
      order: true,
      orderItem: {
        include: {
          product: { select: { name: true, slug: true } },
          variant: { select: { title: true } },
        },
      },
      store: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    orderId?: string
    orderItemId?: string
    quantity?: number
    reason?: string
    details?: string
  }

  if (!body.orderId || !body.reason?.trim()) {
    return NextResponse.json({ error: 'Order and reason are required' }, { status: 400 })
  }

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, buyerId: userId },
    include: {
      items: {
        include: {
          product: { select: { storeId: true } },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
    return NextResponse.json({ error: 'Returns are only available after shipment or delivery' }, { status: 400 })
  }

  const orderItem = body.orderItemId ? order.items.find((item) => item.id === body.orderItemId) : null
  if (body.orderItemId && !orderItem) {
    return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
  }

  const quantity = Math.max(1, Number(body.quantity ?? 1))
  if (orderItem && quantity > orderItem.quantity) {
    return NextResponse.json({ error: 'Return quantity exceeds purchased quantity' }, { status: 400 })
  }

  const requestRecord = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      orderItemId: orderItem?.id,
      userId,
      storeId: orderItem?.product.storeId ?? null,
      quantity,
      reason: body.reason.trim(),
      details: body.details?.trim() || null,
    },
    include: {
      order: true,
      orderItem: {
        include: {
          product: { select: { name: true, slug: true } },
          variant: { select: { title: true } },
        },
      },
      store: { select: { id: true, name: true } },
    },
  })

  try {
    await dispatchZapierEvent('return.requested', {
      returnRequestId: requestRecord.id,
      orderId: requestRecord.orderId,
      orderItemId: requestRecord.orderItemId,
      userId,
      storeId: requestRecord.store?.id ?? null,
      quantity: requestRecord.quantity,
      reason: requestRecord.reason,
      status: requestRecord.status,
    })
  } catch (error) {
    console.warn('Zapier return.requested failed:', error)
  }

  return NextResponse.json({ success: true, request: requestRecord })
}
