import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { claimBuyerRewardCoupon, getBuyerRewards } from '@/lib/actions/rewards'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rewards = await getBuyerRewards(userId)
  return NextResponse.json({ rewards })
}

export async function POST() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await claimBuyerRewardCoupon(userId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to claim reward coupon' },
      { status: 400 }
    )
  }
}
