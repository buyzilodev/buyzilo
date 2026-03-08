import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createThreadWithMessage } from '@/lib/actions/messages'
import { getSupportMetaMap, setSupportMeta } from '@/lib/actions/supportMeta'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await prisma.supportRequest.findMany({
    where: { userId },
    include: {
      order: { select: { id: true, status: true } },
      store: { select: { id: true, name: true, slug: true } },
      thread: {
        include: {
          messages: {
            include: { sender: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  const metaMap = await getSupportMetaMap(requests.map((request) => request.id))
  const decorated = requests.map((request) => ({
    ...request,
    meta: metaMap[request.id] ?? { type: 'TICKET' },
  }))

  return NextResponse.json({ requests: decorated })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    subject?: string
    message?: string
    orderId?: string
    storeId?: string
    type?: 'TICKET' | 'CALL_REQUEST'
    callbackPhone?: string
    callbackWindow?: string
  }

  if (!body.subject?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const requestType = body.type === 'CALL_REQUEST' ? 'CALL_REQUEST' : 'TICKET'
  const callbackPhone = body.callbackPhone?.trim() || ''
  const callbackWindow = body.callbackWindow?.trim() || ''

  if (requestType === 'CALL_REQUEST' && !callbackPhone) {
    return NextResponse.json({ error: 'Callback phone is required' }, { status: 400 })
  }

  let participantIds = [userId]
  let storeId = body.storeId?.trim() || null

  if (body.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: body.orderId, buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              include: { store: { select: { id: true, vendorId: true } } },
            },
          },
          take: 1,
        },
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    storeId = storeId || order.items[0]?.product.store.id || null
    if (order.items[0]?.product.store.vendorId) {
      participantIds = [userId, order.items[0].product.store.vendorId]
    }
  } else if (storeId) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { vendorId: true },
    })
    if (store?.vendorId) {
      participantIds = [userId, store.vendorId]
    }
  }

  const thread = await createThreadWithMessage({
    subject: body.subject.trim(),
    category: 'SUPPORT',
    participantIds,
    senderId: userId,
    body: body.message.trim(),
  })

  const requestRecord = await prisma.supportRequest.create({
    data: {
      userId,
      storeId,
      orderId: body.orderId?.trim() || null,
      threadId: thread.id,
      subject: body.subject.trim(),
      message: body.message.trim(),
      status: 'OPEN',
    },
  })

  await setSupportMeta(requestRecord.id, {
    type: requestType,
    callbackPhone: callbackPhone || null,
    callbackWindow: callbackWindow || null,
  })

  try {
    await dispatchZapierEvent('support.created', {
      supportRequestId: requestRecord.id,
      userId,
      storeId,
      orderId: requestRecord.orderId,
      subject: requestRecord.subject,
      status: requestRecord.status,
      type: requestType,
      callbackPhone: callbackPhone || null,
      callbackWindow: callbackWindow || null,
    })
  } catch (error) {
    console.warn('Zapier support.created failed:', error)
  }

  return NextResponse.json({
    success: true,
    request: {
      ...requestRecord,
      meta: {
        type: requestType,
        callbackPhone: callbackPhone || null,
        callbackWindow: callbackWindow || null,
      },
    },
  })
}
