import { prisma } from '@/lib/prisma'
import { getBuyerDigest } from '@/lib/actions/buyerDigest'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'

export type BuyerDigestAutomationConfig = {
  enabled: boolean
  respectUserFrequency: boolean
  dailySendHourUtc: number
}

type BuyerDigestDeliveryState = {
  lastSentAt?: string | null
  lastManualSentAt?: string | null
}

const defaultBuyerDigestAutomationConfig: BuyerDigestAutomationConfig = {
  enabled: false,
  respectUserFrequency: true,
  dailySendHourUtc: 9,
}

function getDigestDeliveryKey(userId: string) {
  return `buyerDigestDelivery:${userId}`
}

export async function getBuyerDigestAutomationConfig(): Promise<BuyerDigestAutomationConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'buyerDigestAutomationConfig' },
  })

  if (!row?.value) {
    return defaultBuyerDigestAutomationConfig
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<BuyerDigestAutomationConfig>
    return {
      enabled: parsed.enabled ?? defaultBuyerDigestAutomationConfig.enabled,
      respectUserFrequency: parsed.respectUserFrequency ?? defaultBuyerDigestAutomationConfig.respectUserFrequency,
      dailySendHourUtc: typeof parsed.dailySendHourUtc === 'number' ? parsed.dailySendHourUtc : defaultBuyerDigestAutomationConfig.dailySendHourUtc,
    }
  } catch {
    return defaultBuyerDigestAutomationConfig
  }
}

export async function getBuyerDigestDeliveryState(userId: string): Promise<BuyerDigestDeliveryState> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getDigestDeliveryKey(userId) },
  })

  if (!row?.value) {
    return {}
  }

  try {
    return JSON.parse(row.value) as BuyerDigestDeliveryState
  } catch {
    return {}
  }
}

export async function markBuyerDigestSent(userId: string, mode: 'manual' | 'automation') {
  const current = await getBuyerDigestDeliveryState(userId)
  const timestamp = new Date().toISOString()
  const next: BuyerDigestDeliveryState = {
    ...current,
    lastSentAt: timestamp,
    ...(mode === 'manual' ? { lastManualSentAt: timestamp } : {}),
  }

  await prisma.siteSettings.upsert({
    where: { key: getDigestDeliveryKey(userId) },
    update: { value: JSON.stringify(next) },
    create: { key: getDigestDeliveryKey(userId), value: JSON.stringify(next) },
  })

  return next
}

function shouldSendByFrequency(lastSentAt: string | null | undefined, frequency: 'off' | 'daily' | 'weekly') {
  if (frequency === 'off') {
    return false
  }
  if (!lastSentAt) {
    return true
  }
  const diffMs = Date.now() - new Date(lastSentAt).getTime()
  const requiredMs = frequency === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return diffMs >= requiredMs
}

export async function getBuyerDigestAutomationStats() {
  const config = await getBuyerDigestAutomationConfig()
  const buyers = await prisma.user.findMany({
    where: { role: 'BUYER' },
    select: { id: true, email: true, name: true },
  })

  const details = await Promise.all(
    buyers.map(async (buyer) => {
      const [preferences, deliveryState] = await Promise.all([
        getNotificationPreferences(buyer.id),
        getBuyerDigestDeliveryState(buyer.id),
      ])
      return {
        ...buyer,
        digestFrequency: preferences.digestFrequency,
        lastSentAt: deliveryState.lastSentAt ?? null,
        eligible: shouldSendByFrequency(deliveryState.lastSentAt, preferences.digestFrequency),
      }
    })
  )

  return {
    config,
    stats: {
      totalBuyers: details.length,
      dailyUsers: details.filter((entry) => entry.digestFrequency === 'daily').length,
      weeklyUsers: details.filter((entry) => entry.digestFrequency === 'weekly').length,
      eligibleNow: details.filter((entry) => entry.eligible).length,
    },
    users: details.slice(0, 50),
  }
}

export async function getBuyerDigestEmailPayload(userId: string) {
  const [user, digest, deliveryState, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    getBuyerDigest(userId),
    getBuyerDigestDeliveryState(userId),
    getNotificationPreferences(userId),
  ])

  if (!user?.email) {
    throw new Error('User email not available for digest delivery')
  }

  return {
    user,
    digest,
    deliveryState,
    preferences,
  }
}
