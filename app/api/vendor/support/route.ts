import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSupportMetaMap } from '@/lib/actions/supportMeta'

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

  const requests = await prisma.supportRequest.findMany({
    where: { storeId: store.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, status: true } },
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
    take: 100,
  })

  const metaMap = await getSupportMetaMap(requests.map((request) => request.id))
  const decorated = requests.map((request) => ({
    ...request,
    meta: metaMap[request.id] ?? { type: 'TICKET' },
  }))

  return NextResponse.json({ requests: decorated, store: { id: store.id, name: store.name } })
}
