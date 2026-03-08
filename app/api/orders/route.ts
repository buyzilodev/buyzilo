import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (sessionId) {
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        items: { include: { product: { select: { name: true, slug: true, images: true } } } },
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: {
      items: {
        include: { product: { select: { name: true, slug: true, price: true, images: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ orders })
}
