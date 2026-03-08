import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getVendorCategoryFeeMap } from '@/lib/actions/vendorCategoryFees'
import { requireAdminApiPermission } from '@/lib/admin/api'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function GET() {
  const access = await requireAdminApiPermission('manage_finance')
  if (!access.ok) {
    return access.response
  }

  const [payouts, stores, categoryFeeMap] = await Promise.all([
    prisma.payout.findMany({
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            pendingPayout: true,
            totalEarned: true,
            stripeAccountId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.store.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        pendingPayout: true,
        totalEarned: true,
        stripeAccountId: true,
        commissionRate: true,
        vendor: { select: { name: true, email: true } },
      },
      orderBy: { totalEarned: 'desc' },
      take: 100,
    }),
    getVendorCategoryFeeMap(),
  ])
  const storeIds = stores.map((store) => store.id)
  const categoryFeeExposureByStore = new Map<string, number>()
  if (storeIds.length > 0) {
    const orderItems = await prisma.orderItem.findMany({
      where: { product: { storeId: { in: storeIds } } },
      select: {
        quantity: true,
        price: true,
        product: { select: { storeId: true, categoryId: true } },
      },
    })

    for (const item of orderItems) {
      const feePercent = categoryFeeMap.get(item.product.categoryId) ?? 0
      const feeAmount = item.price * item.quantity * (feePercent / 100)
      categoryFeeExposureByStore.set(
        item.product.storeId,
        Number(((categoryFeeExposureByStore.get(item.product.storeId) ?? 0) + feeAmount).toFixed(2))
      )
    }
  }

  return NextResponse.json({
    payouts,
    stores: stores.map((store) => ({
      ...store,
      categoryFeeExposure: categoryFeeExposureByStore.get(store.id) ?? 0,
    })),
  })
}

export async function PATCH(req: Request) {
  const access = await requireAdminApiPermission('manage_finance')
  if (!access.ok) {
    return access.response
  }

  const body = await req.json() as {
    id?: string
    status?: 'APPROVED' | 'REJECTED' | 'PAID'
    note?: string
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'Payout id and status are required' }, { status: 400 })
  }

  const payout = await prisma.payout.findUnique({
    where: { id: body.id },
    include: { store: true },
  })
  if (!payout) {
    return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
  }

  if (body.status === 'PAID') {
    if (!payout.store.stripeAccountId) {
      return NextResponse.json({ error: 'Vendor has no connected Stripe account' }, { status: 400 })
    }
    if (payout.store.pendingPayout < payout.amount) {
      return NextResponse.json({ error: 'Store pending balance is lower than requested payout' }, { status: 400 })
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(payout.amount * 100),
      currency: 'usd',
      destination: payout.store.stripeAccountId,
    })

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'PAID',
          note: body.note?.trim() || payout.note,
          stripeTransferId: transfer.id,
          processedAt: new Date(),
        },
      })
      await tx.store.update({
        where: { id: payout.storeId },
        data: {
          pendingPayout: Math.max(0, payout.store.pendingPayout - payout.amount),
        },
      })
      return next
    })
    return NextResponse.json({ success: true, payout: updated })
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: body.status,
      note: body.note?.trim() || payout.note,
      processedAt: new Date(),
    },
  })
  return NextResponse.json({ success: true, payout: updated })
}
