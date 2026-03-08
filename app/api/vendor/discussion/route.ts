import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string } | undefined

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({
    where: { vendorId: user.id },
    select: { id: true },
  })

  if (!store) {
    return NextResponse.json({ items: [] })
  }

  const items = await prisma.productDiscussion.findMany({
    where: {
      product: { storeId: store.id },
      parentId: null,
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      product: { select: { id: true, name: true, slug: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({ items })
}
