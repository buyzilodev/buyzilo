import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviews = await prisma.review.findMany({
    where: { userId: (session.user as { id: string }).id },
    include: { product: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reviews })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    productId?: string
    rating?: number
    comment?: string
  } | null

  const productId = body?.productId?.trim()
  const rating = Number(body?.rating ?? 0)
  const comment = body?.comment?.trim() || null

  if (!productId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, approvalStatus: true },
  })
  if (!product || !product.isActive || product.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Product not available for review' }, { status: 404 })
  }

  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        buyerId: userId,
        status: { in: ['SHIPPED', 'DELIVERED', 'REFUNDED'] },
      },
    },
    select: { id: true },
  })

  if (!purchased) {
    return NextResponse.json({ error: 'Only buyers with completed orders can review this product' }, { status: 403 })
  }

  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId } },
    update: { rating, comment },
    create: { productId, userId, rating, comment },
    include: { product: { select: { id: true, name: true, slug: true } } },
  })

  return NextResponse.json({ review })
}
