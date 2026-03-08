import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApiPermission } from '@/lib/admin/api'
import { resolvePagination, buildPaginationMeta } from '@/lib/helpers/pagination'
import { ORDER_STATUSES } from '@/lib/constants/statuses'

export async function GET(req: Request) {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const page = Number(searchParams.get('page') ?? '1')
  const limitParam = Number(searchParams.get('limit') ?? '50')
  const { limit, offset } = resolvePagination({ page, limit: limitParam, maxLimit: 100 })

  const where = status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])
    ? { status: status as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' }
    : {}

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { name: true, store: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ orders, ...buildPaginationMeta(total, page > 0 ? page : 1, limit) })
}

export async function PATCH(req: Request) {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }
  const body = await req.json() as { id: string; status: string }
  const order = await prisma.order.update({
    where: { id: body.id },
    data: { status: body.status as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' },
  })
  return NextResponse.json(order)
}
