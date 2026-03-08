import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBuyerDigest } from '@/lib/actions/buyerDigest'
import { getBuyerDigestEmailPayload, markBuyerDigestSent } from '@/lib/actions/buyerDigestDelivery'
import { sendBuyerDigestEmail } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const digest = await getBuyerDigest(userId)
  return NextResponse.json({ digest })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getBuyerDigestEmailPayload(userId)
    await sendBuyerDigestEmail({
      to: payload.user.email,
      name: payload.user.name ?? 'Buyer',
      digest: payload.digest,
    })
    const deliveryState = await markBuyerDigestSent(userId, 'manual')
    return NextResponse.json({ success: true, deliveryState })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send digest email' }, { status: 400 })
  }
}
