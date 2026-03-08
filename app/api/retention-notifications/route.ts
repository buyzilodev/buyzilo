import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRetentionNotifications, markRetentionNotificationsRead } from '@/lib/actions/retentionNotifications'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const notifications = await getRetentionNotifications(userId)
  return NextResponse.json({ notifications })
}

export async function PATCH() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const notifications = await markRetentionNotificationsRead(userId)
  return NextResponse.json({ success: true, notifications })
}
