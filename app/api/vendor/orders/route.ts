import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: (session.user as { id: string }).id },
  })
  if (!store) {
    return NextResponse.json({ orders: [] })
  }
  const orderItems = await prisma.orderItem.findMany({
    where: { product: { storeId: store.id } },
    include: {
      order: {
        include: { buyer: { select: { name: true, email: true } } },
      },
      product: { select: { name: true, slug: true, images: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  })
  const byOrder = new Map<string, { order: typeof orderItems[0]['order']; items: typeof orderItems }>()
  for (const oi of orderItems) {
    const id = oi.orderId
    if (!byOrder.has(id)) {
      byOrder.set(id, { order: oi.order, items: [] })
    }
    byOrder.get(id)!.items.push(oi)
  }
  const orders = Array.from(byOrder.values()).map(({ order, items }) => ({
    id: order.id,
    status: order.status,
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    createdAt: order.createdAt,
    buyer: order.buyer,
    items,
  }))
  return NextResponse.json({ orders })
}
