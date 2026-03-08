import { NextResponse } from 'next/server'
import { requireAnyAdminApiPermission } from '@/lib/admin/api'
import { prisma } from '@/lib/prisma'
import { getSupportMetaMap } from '@/lib/actions/supportMeta'

export async function GET(req: Request) {
  const access = await requireAnyAdminApiPermission(['manage_orders', 'manage_users'])
  if (!access.ok) {
    return access.response
  }

  const { searchParams } = new URL(req.url)
  const typeFilter = searchParams.get('type') === 'CALL_REQUEST' ? 'CALL_REQUEST' : null

  const requests = await prisma.supportRequest.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      store: { select: { id: true, name: true, slug: true, vendor: { select: { id: true, name: true, email: true } } } },
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
    take: 150,
  })

  const metaMap = await getSupportMetaMap(requests.map((request) => request.id))
  const decorated = requests
    .map((request) => ({
      ...request,
      meta: metaMap[request.id] ?? { type: 'TICKET' },
    }))
    .filter((request) => !typeFilter || request.meta.type === typeFilter)

  return NextResponse.json({ requests: decorated })
}
