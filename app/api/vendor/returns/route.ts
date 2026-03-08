import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) {
    return NextResponse.json({ requests: [] })
  }

  const requests = await prisma.returnRequest.findMany({
    where: { storeId: store.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, status: true, createdAt: true } },
      orderItem: {
        include: {
          product: { select: { name: true, slug: true } },
          variant: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}
