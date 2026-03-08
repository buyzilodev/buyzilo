import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getBuyerDigestAutomationConfig,
  getBuyerDigestAutomationStats,
  getBuyerDigestEmailPayload,
  markBuyerDigestSent,
} from '@/lib/actions/buyerDigestDelivery'
import { sendBuyerDigestEmail } from '@/lib/email'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!session?.user || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await getBuyerDigestAutomationStats()
  return NextResponse.json(data)
}

export async function POST() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const config = await getBuyerDigestAutomationConfig()
  if (!config.enabled) {
    return NextResponse.json({ error: 'Buyer digest automation is disabled' }, { status: 400 })
  }

  const stats = await getBuyerDigestAutomationStats()
  const eligibleUsers = stats.users.filter((entry) => entry.eligible)
  let sent = 0

  for (const user of eligibleUsers) {
    try {
      const payload = await getBuyerDigestEmailPayload(user.id)
      await sendBuyerDigestEmail({
        to: payload.user.email,
        name: payload.user.name ?? 'Buyer',
        digest: payload.digest,
      })
      await markBuyerDigestSent(user.id, 'automation')
      sent += 1
    } catch {
      // Continue the batch even if one user fails.
    }
  }

  return NextResponse.json({ success: true, sent })
}
