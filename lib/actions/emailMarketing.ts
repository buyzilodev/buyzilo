import { prisma } from '@/lib/prisma'

export type EmailMarketingSegment = 'marketing-consented' | 'recent-buyers-30d' | 'loyalty-members'

export type EmailCampaignRecord = {
  id: string
  subject: string
  previewText?: string | null
  body: string
  segment: EmailMarketingSegment
  sentAt: string
  recipientCount: number
  actorId?: string | null
  testEmail?: string | null
}

type GdprConsentRecord = {
  marketingConsent?: boolean
}

const CAMPAIGN_KEY = 'emailMarketingCampaigns'

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return (JSON.parse(value) as T) ?? fallback
  } catch {
    return fallback
  }
}

function getConsentKey(userId: string) {
  return `gdprConsent:${userId}`
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function getMarketingConsentMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, boolean>()

  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: userIds.map((userId) => getConsentKey(userId)) } },
    select: { key: true, value: true },
  })

  const map = new Map<string, boolean>()
  for (const row of rows) {
    const userId = row.key.replace('gdprConsent:', '')
    const consent = parseJson<GdprConsentRecord>(row.value, {})
    map.set(userId, consent.marketingConsent === true)
  }

  return map
}

export async function listEmailCampaigns() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: CAMPAIGN_KEY },
    select: { value: true },
  })

  return parseJson<EmailCampaignRecord[]>(row?.value, [])
}

async function saveEmailCampaigns(campaigns: EmailCampaignRecord[]) {
  await prisma.siteSettings.upsert({
    where: { key: CAMPAIGN_KEY },
    update: { value: JSON.stringify(campaigns.slice(0, 30)) },
    create: { key: CAMPAIGN_KEY, value: JSON.stringify(campaigns.slice(0, 30)) },
  })
}

export async function getEmailMarketingAudience(segment: EmailMarketingSegment) {
  const buyers = await prisma.user.findMany({
    where: { role: 'BUYER' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { orders: true } },
      orders: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const consentMap = await getMarketingConsentMap(buyers.map((buyer) => buyer.id))
  const rewardsRows = await prisma.siteSettings.findMany({
    where: { key: { in: buyers.map((buyer) => `rewards:${buyer.id}`) } },
    select: { key: true, value: true },
  })
  const rewardMap = new Map<string, { points?: number }>()
  for (const row of rewardsRows) {
    rewardMap.set(row.key.replace('rewards:', ''), parseJson(row.value, {}))
  }

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000

  return buyers.filter((buyer) => {
    if (!buyer.email || !consentMap.get(buyer.id)) return false
    if (segment === 'marketing-consented') return true
    if (segment === 'recent-buyers-30d') {
      return Boolean(buyer.orders[0]?.createdAt && buyer.orders[0].createdAt.getTime() >= cutoff)
    }
    if (segment === 'loyalty-members') {
      return Number(rewardMap.get(buyer.id)?.points ?? 0) > 0 || buyer._count.orders > 0
    }
    return false
  })
}

export async function getEmailMarketingStats() {
  const [buyers, campaigns, marketingAudience, recentAudience, loyaltyAudience] = await Promise.all([
    prisma.user.count({ where: { role: 'BUYER' } }),
    listEmailCampaigns(),
    getEmailMarketingAudience('marketing-consented'),
    getEmailMarketingAudience('recent-buyers-30d'),
    getEmailMarketingAudience('loyalty-members'),
  ])

  return {
    buyers,
    consentedBuyers: marketingAudience.length,
    recentBuyers30d: recentAudience.length,
    loyaltyAudience: loyaltyAudience.length,
    campaigns,
  }
}

export async function recordEmailCampaign(input: Omit<EmailCampaignRecord, 'id' | 'sentAt'>) {
  const campaigns = await listEmailCampaigns()
  const record: EmailCampaignRecord = {
    id: `campaign_${Date.now()}`,
    subject: input.subject.trim(),
    previewText: input.previewText?.trim() || null,
    body: input.body,
    segment: input.segment,
    sentAt: new Date().toISOString(),
    recipientCount: input.recipientCount,
    actorId: input.actorId || null,
    testEmail: input.testEmail || null,
  }

  await saveEmailCampaigns([record, ...campaigns])
  return record
}

export function renderEmailCampaignHtml(input: {
  subject: string
  previewText?: string | null
  body: string
}) {
  const preview = input.previewText?.trim() || stripHtml(input.body).slice(0, 140)
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background:#0f172a;padding:28px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:28px;">Buyzilo</h1>
        <p style="color:#cbd5e1;margin:8px 0 0;">Marketplace updates and offers</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="color:#0f172a;margin-top:0;">${input.subject}</h2>
        <div style="color:#334155;line-height:1.65;font-size:15px;">
          ${input.body}
        </div>
        <p style="margin-top:32px;color:#94a3b8;font-size:12px;">
          You received this message because marketing email is enabled for your Buyzilo account.
        </p>
      </div>
    </div>
  `
}
