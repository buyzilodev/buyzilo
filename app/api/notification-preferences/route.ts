import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/actions/notificationPreferences'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const preferences = await getNotificationPreferences(userId)
  return NextResponse.json({ preferences })
}

export async function PATCH(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    stockAlerts?: boolean
    priceDropAlerts?: boolean
    savedSearchAlerts?: boolean
    loyaltyAlerts?: boolean
    referralAlerts?: boolean
    storeCreditAlerts?: boolean
    smsOrderUpdates?: boolean
    digestFrequency?: 'off' | 'daily' | 'weekly'
  }

  const preferences = await updateNotificationPreferences(userId, body)
  return NextResponse.json({ success: true, preferences })
}
