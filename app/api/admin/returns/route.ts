import { NextResponse } from 'next/server'
import { requireAdminApiPermission } from '@/lib/admin/api'
import { prisma } from '@/lib/prisma'
import { issueAdminStoreCredit } from '@/lib/actions/storeCredit'

export async function GET() {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }

  const requests = await prisma.returnRequest.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      store: { select: { id: true, name: true } },
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

  const creditRows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: requests.map((request) => `returnCredit:${request.id}`),
      },
    },
  })

  const creditMap = new Map(
    creditRows.map((row) => {
      try {
        return [row.key.replace('returnCredit:', ''), JSON.parse(row.value) as { amount?: number; createdAt?: string }]
      } catch {
        return [row.key.replace('returnCredit:', ''), null]
      }
    })
  )

  return NextResponse.json({
    requests: requests.map((request) => ({
      ...request,
      refundCredit: creditMap.get(request.id) ?? null,
    })),
  })
}

export async function PATCH(req: Request) {
  const access = await requireAdminApiPermission('manage_orders')
  if (!access.ok) {
    return access.response
  }

  const body = await req.json() as {
    id?: string
    status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED'
    resolutionNote?: string
    refundToStoreCredit?: boolean
    refundAmount?: number
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'Return request id and status are required' }, { status: 400 })
  }

  const existingCredit = await prisma.siteSettings.findUnique({
    where: { key: `returnCredit:${body.id}` },
  })

  const currentRequest = await prisma.returnRequest.findUnique({
    where: { id: body.id },
    include: {
      user: { select: { id: true } },
      order: { select: { id: true } },
    },
  })

  if (!currentRequest) {
    return NextResponse.json({ error: 'Return request not found' }, { status: 404 })
  }

  if (body.status === 'REFUNDED' && body.refundToStoreCredit) {
    if (existingCredit) {
      return NextResponse.json({ error: 'Store credit has already been issued for this return' }, { status: 400 })
    }
    if (!currentRequest.user?.id) {
      return NextResponse.json({ error: 'Return request has no buyer attached for store-credit refund' }, { status: 400 })
    }
    const refundAmount = Number(body.refundAmount ?? 0)
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than zero' }, { status: 400 })
    }

    await issueAdminStoreCredit(
      currentRequest.user.id,
      refundAmount,
      `Return refund credit for order ${currentRequest.order.id}`
    )

    await prisma.siteSettings.create({
      data: {
        key: `returnCredit:${body.id}`,
        value: JSON.stringify({
          amount: refundAmount,
          createdAt: new Date().toISOString(),
        }),
      },
    })
  }

  const requestRecord = await prisma.returnRequest.update({
    where: { id: body.id },
    data: {
      status: body.status,
      resolutionNote: body.resolutionNote?.trim() || null,
    },
  })

  return NextResponse.json({ success: true, request: requestRecord })
}
