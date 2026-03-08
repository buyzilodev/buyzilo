import { prisma } from '@/lib/prisma'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'

export type RetentionNotificationKind =
  | 'LOYALTY_REWARD'
  | 'REFERRAL_BONUS'
  | 'STORE_CREDIT'

export type RetentionNotificationItem = {
  id: string
  kind: RetentionNotificationKind
  title: string
  body: string
  isRead: boolean
  createdAt: string
  href?: string
}

type RetentionNotificationFeed = {
  items: RetentionNotificationItem[]
}

function getRetentionNotificationKey(userId: string) {
  return `retentionNotifications:${userId}`
}

async function getRetentionNotificationFeed(userId: string): Promise<RetentionNotificationFeed> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getRetentionNotificationKey(userId) },
  })

  if (!row?.value) {
    return { items: [] }
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<RetentionNotificationFeed>
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch {
    return { items: [] }
  }
}

async function saveRetentionNotificationFeed(userId: string, feed: RetentionNotificationFeed) {
  await prisma.siteSettings.upsert({
    where: { key: getRetentionNotificationKey(userId) },
    update: { value: JSON.stringify(feed) },
    create: { key: getRetentionNotificationKey(userId), value: JSON.stringify(feed) },
  })
}

export async function getRetentionNotifications(userId: string) {
  const feed = await getRetentionNotificationFeed(userId)
  return feed.items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function markRetentionNotificationsRead(userId: string) {
  const feed = await getRetentionNotificationFeed(userId)
  feed.items = feed.items.map((item) => ({ ...item, isRead: true }))
  await saveRetentionNotificationFeed(userId, feed)
  return feed.items
}

export async function pushRetentionNotification(input: {
  userId: string
  kind: RetentionNotificationKind
  title: string
  body: string
  href?: string
}) {
  const preferences = await getNotificationPreferences(input.userId)
  if (
    (input.kind === 'LOYALTY_REWARD' && preferences.loyaltyAlerts === false) ||
    (input.kind === 'REFERRAL_BONUS' && preferences.referralAlerts === false) ||
    (input.kind === 'STORE_CREDIT' && preferences.storeCreditAlerts === false)
  ) {
    return null
  }

  const feed = await getRetentionNotificationFeed(input.userId)
  feed.items.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    isRead: false,
    createdAt: new Date().toISOString(),
  })
  feed.items = feed.items.slice(0, 40)
  await saveRetentionNotificationFeed(input.userId, feed)
  return feed.items[0]
}
