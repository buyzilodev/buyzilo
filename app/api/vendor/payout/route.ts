import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | null)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await req.json()
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { vendorId: userId } })
    if (!store || !store.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      )
    }

    if (store.pendingPayout < amount) {
      return NextResponse.json({ error: 'Insufficient pending payout balance' }, { status: 400 })
    }

    const openRequest = await prisma.payout.findFirst({
      where: {
        storeId: store.id,
        status: { in: ['REQUESTED', 'APPROVED'] },
      },
    })
    if (openRequest) {
      return NextResponse.json({ error: 'You already have a payout request in progress' }, { status: 400 })
    }

    const payout = await prisma.payout.create({
      data: {
        storeId: store.id,
        amount,
        status: 'REQUESTED',
      },
    })

    try {
      await dispatchZapierEvent('payout.requested', {
        payoutId: payout.id,
        storeId: store.id,
        vendorUserId: userId,
        amount: payout.amount,
        status: payout.status,
      })
    } catch (error) {
      console.warn('Zapier payout.requested failed:', error)
    }

    return NextResponse.json({ success: true, payoutId: payout.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
