import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReferralSummary } from '@/lib/actions/referrals'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const referral = await getReferralSummary(userId)
  return NextResponse.json({ referral })
}
