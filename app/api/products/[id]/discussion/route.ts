import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function normalizeThread(items: Array<{
  id: string
  type: string
  status: string
  body: string
  createdAt: Date
  user: { name: string | null; email: string; role: string }
  replies: Array<{
    id: string
    type: string
    status: string
    body: string
    createdAt: Date
    user: { name: string | null; email: string; role: string }
  }>
}>) {
  return items.map((item) => ({
    ...item,
    replies: item.replies.filter((reply) => reply.status === 'APPROVED'),
  }))
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    },
    select: { id: true },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const items = await prisma.productDiscussion.findMany({
    where: { productId: product.id, parentId: null, status: 'APPROVED' },
    include: {
      user: { select: { name: true, email: true, role: true } },
      replies: {
        where: { status: 'APPROVED' },
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 80,
  })

  return NextResponse.json({ items: normalizeThread(items) })
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await req.json().catch(() => null)) as {
    type?: 'QUESTION' | 'ANSWER' | 'COMMENT'
    body?: string
    parentId?: string
  } | null

  const message = body?.body?.trim()
  const type = body?.type

  if (!message || !type || !['QUESTION', 'ANSWER', 'COMMENT'].includes(type)) {
    return NextResponse.json({ error: 'Invalid discussion payload' }, { status: 400 })
  }

  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, store: { select: { vendorId: true } } },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  let parentProductId: string | null = null
  if (body?.parentId) {
    const parent = await prisma.productDiscussion.findUnique({
      where: { id: body.parentId },
      select: { id: true, productId: true, parentId: true },
    })
    if (!parent || parent.parentId) {
      return NextResponse.json({ error: 'Invalid discussion parent' }, { status: 400 })
    }
    parentProductId = parent.productId
  }

  if (parentProductId && parentProductId !== product.id) {
    return NextResponse.json({ error: 'Discussion parent does not belong to this product' }, { status: 400 })
  }

  const isPrivileged = user.role === 'ADMIN' || (user.role === 'VENDOR' && user.id === product.store.vendorId)
  if (type === 'ANSWER' && !isPrivileged) {
    return NextResponse.json({ error: 'Only store owners or admins can post answers' }, { status: 403 })
  }

  const status = isPrivileged ? 'APPROVED' : type === 'ANSWER' ? 'APPROVED' : 'PENDING'

  const created = await prisma.productDiscussion.create({
    data: {
      productId: product.id,
      userId: user.id,
      parentId: body?.parentId ?? null,
      type,
      status,
      body: message,
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      replies: {
        where: { status: 'APPROVED' },
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return NextResponse.json({ item: created })
}
