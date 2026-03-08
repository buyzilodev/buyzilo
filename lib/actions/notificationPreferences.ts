import { prisma } from '@/lib/prisma'

export type NotificationPreferences = {
  stockAlerts: boolean
  priceDropAlerts: boolean
  savedSearchAlerts: boolean
  loyaltyAlerts: boolean
  referralAlerts: boolean
  storeCreditAlerts: boolean
  smsOrderUpdates: boolean
  digestFrequency: 'off' | 'daily' | 'weekly'
}

const defaultPreferences: NotificationPreferences = {
  stockAlerts: true,
  priceDropAlerts: true,
  savedSearchAlerts: true,
  loyaltyAlerts: true,
  referralAlerts: true,
  storeCreditAlerts: true,
  smsOrderUpdates: true,
  digestFrequency: 'daily',
}

function getPreferenceKey(userId: string) {
  return `notificationPreferences:${userId}`
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getPreferenceKey(userId) },
  })

  if (!row?.value) {
    return defaultPreferences
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<NotificationPreferences>
    return {
      stockAlerts: parsed.stockAlerts ?? defaultPreferences.stockAlerts,
      priceDropAlerts: parsed.priceDropAlerts ?? defaultPreferences.priceDropAlerts,
      savedSearchAlerts: parsed.savedSearchAlerts ?? defaultPreferences.savedSearchAlerts,
      loyaltyAlerts: parsed.loyaltyAlerts ?? defaultPreferences.loyaltyAlerts,
      referralAlerts: parsed.referralAlerts ?? defaultPreferences.referralAlerts,
      storeCreditAlerts: parsed.storeCreditAlerts ?? defaultPreferences.storeCreditAlerts,
      smsOrderUpdates: parsed.smsOrderUpdates ?? defaultPreferences.smsOrderUpdates,
      digestFrequency: parsed.digestFrequency ?? defaultPreferences.digestFrequency,
    }
  } catch {
    return defaultPreferences
  }
}

export async function updateNotificationPreferences(userId: string, input: Partial<NotificationPreferences>) {
  const current = await getNotificationPreferences(userId)
  const next: NotificationPreferences = {
    stockAlerts: input.stockAlerts ?? current.stockAlerts,
    priceDropAlerts: input.priceDropAlerts ?? current.priceDropAlerts,
    savedSearchAlerts: input.savedSearchAlerts ?? current.savedSearchAlerts,
    loyaltyAlerts: input.loyaltyAlerts ?? current.loyaltyAlerts,
    referralAlerts: input.referralAlerts ?? current.referralAlerts,
    storeCreditAlerts: input.storeCreditAlerts ?? current.storeCreditAlerts,
    smsOrderUpdates: input.smsOrderUpdates ?? current.smsOrderUpdates,
    digestFrequency: input.digestFrequency ?? current.digestFrequency,
  }

  await prisma.siteSettings.upsert({
    where: { key: getPreferenceKey(userId) },
    update: { value: JSON.stringify(next) },
    create: { key: getPreferenceKey(userId), value: JSON.stringify(next) },
  })

  return next
}

export async function getNotificationPreferenceMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) {
    return new Map<string, NotificationPreferences>()
  }

  const rows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: uniqueIds.map((userId) => getPreferenceKey(userId)),
      },
    },
  })

  const map = new Map<string, NotificationPreferences>()
  for (const userId of uniqueIds) {
    const row = rows.find((entry) => entry.key === getPreferenceKey(userId))
    if (!row?.value) {
      map.set(userId, defaultPreferences)
      continue
    }
    try {
      const parsed = JSON.parse(row.value) as Partial<NotificationPreferences>
      map.set(userId, {
        stockAlerts: parsed.stockAlerts ?? defaultPreferences.stockAlerts,
        priceDropAlerts: parsed.priceDropAlerts ?? defaultPreferences.priceDropAlerts,
        savedSearchAlerts: parsed.savedSearchAlerts ?? defaultPreferences.savedSearchAlerts,
        loyaltyAlerts: parsed.loyaltyAlerts ?? defaultPreferences.loyaltyAlerts,
        referralAlerts: parsed.referralAlerts ?? defaultPreferences.referralAlerts,
        storeCreditAlerts: parsed.storeCreditAlerts ?? defaultPreferences.storeCreditAlerts,
        smsOrderUpdates: parsed.smsOrderUpdates ?? defaultPreferences.smsOrderUpdates,
        digestFrequency: parsed.digestFrequency ?? defaultPreferences.digestFrequency,
      })
    } catch {
      map.set(userId, defaultPreferences)
    }
  }

  return map
}
