import { prisma } from '@/lib/prisma'
import { grantRewardBonusPoints } from '@/lib/actions/rewards'

export type ReferralProgramConfig = {
  referrerBonusPoints: number
  referredBonusPoints: number
}

type ReferralEvent = {
  id: string
  referredUserId: string
  referredEmail: string
  createdAt: string
  status: 'REGISTERED'
  referrerBonusPoints: number
  referredBonusPoints: number
}

type ReferralLedger = {
  code: string
  referrals: ReferralEvent[]
}

const defaultReferralConfig: ReferralProgramConfig = {
  referrerBonusPoints: 50,
  referredBonusPoints: 25,
}

function getReferralLedgerKey(userId: string) {
  return `referrals:${userId}`
}

function getReferralCodeKey(code: string) {
  return `referralCode:${code.toUpperCase()}`
}

function createReferralCode(userId: string) {
  return `BZ${userId.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`
}

export async function getReferralProgramConfig(): Promise<ReferralProgramConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'referralProgramConfig' },
  })

  if (!row?.value) {
    return defaultReferralConfig
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<ReferralProgramConfig>
    return {
      referrerBonusPoints: typeof parsed.referrerBonusPoints === 'number' ? parsed.referrerBonusPoints : defaultReferralConfig.referrerBonusPoints,
      referredBonusPoints: typeof parsed.referredBonusPoints === 'number' ? parsed.referredBonusPoints : defaultReferralConfig.referredBonusPoints,
    }
  } catch {
    return defaultReferralConfig
  }
}

async function getReferralLedger(userId: string): Promise<ReferralLedger> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getReferralLedgerKey(userId) },
  })

  if (!row?.value) {
    const code = createReferralCode(userId)
    const ledger: ReferralLedger = { code, referrals: [] }
    await prisma.siteSettings.upsert({
      where: { key: getReferralLedgerKey(userId) },
      update: { value: JSON.stringify(ledger) },
      create: { key: getReferralLedgerKey(userId), value: JSON.stringify(ledger) },
    })
    await prisma.siteSettings.upsert({
      where: { key: getReferralCodeKey(code) },
      update: { value: userId },
      create: { key: getReferralCodeKey(code), value: userId },
    })
    return ledger
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<ReferralLedger>
    const code = typeof parsed.code === 'string' && parsed.code ? parsed.code.toUpperCase() : createReferralCode(userId)
    const ledger = {
      code,
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
    }
    await prisma.siteSettings.upsert({
      where: { key: getReferralCodeKey(code) },
      update: { value: userId },
      create: { key: getReferralCodeKey(code), value: userId },
    })
    return ledger
  } catch {
    const code = createReferralCode(userId)
    return { code, referrals: [] }
  }
}

async function saveReferralLedger(userId: string, ledger: ReferralLedger) {
  await prisma.siteSettings.upsert({
    where: { key: getReferralLedgerKey(userId) },
    update: { value: JSON.stringify(ledger) },
    create: { key: getReferralLedgerKey(userId), value: JSON.stringify(ledger) },
  })
  await prisma.siteSettings.upsert({
    where: { key: getReferralCodeKey(ledger.code) },
    update: { value: userId },
    create: { key: getReferralCodeKey(ledger.code), value: userId },
  })
}

export async function getReferralSummary(userId: string) {
  const [config, ledger] = await Promise.all([
    getReferralProgramConfig(),
    getReferralLedger(userId),
  ])

  return {
    code: ledger.code,
    config,
    shareUrl: `/register?ref=${encodeURIComponent(ledger.code)}`,
    summary: {
      invites: ledger.referrals.length,
      registeredInvites: ledger.referrals.length,
      totalReferrerBonusPoints: ledger.referrals.reduce((sum, item) => sum + item.referrerBonusPoints, 0),
      totalReferredBonusPoints: ledger.referrals.reduce((sum, item) => sum + item.referredBonusPoints, 0),
    },
    referrals: ledger.referrals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  }
}

export async function applyReferralOnRegistration(params: {
  referralCode?: string | null
  newUserId: string
  newUserEmail: string
}) {
  const code = params.referralCode?.trim().toUpperCase()
  if (!code) {
    return null
  }

  const codeRow = await prisma.siteSettings.findUnique({
    where: { key: getReferralCodeKey(code) },
  })
  const referrerId = codeRow?.value?.trim()
  if (!referrerId || referrerId === params.newUserId) {
    return null
  }

  const [config, ledger] = await Promise.all([
    getReferralProgramConfig(),
    getReferralLedger(referrerId),
  ])

  if (ledger.referrals.some((item) => item.referredUserId === params.newUserId || item.referredEmail.toLowerCase() === params.newUserEmail.toLowerCase())) {
    return null
  }

  const event: ReferralEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    referredUserId: params.newUserId,
    referredEmail: params.newUserEmail,
    createdAt: new Date().toISOString(),
    status: 'REGISTERED',
    referrerBonusPoints: config.referrerBonusPoints,
    referredBonusPoints: config.referredBonusPoints,
  }

  ledger.referrals.unshift(event)
  await saveReferralLedger(referrerId, ledger)
  await prisma.siteSettings.upsert({
    where: { key: `referredBy:${params.newUserId}` },
    update: { value: JSON.stringify({ code, referrerId, createdAt: event.createdAt }) },
    create: { key: `referredBy:${params.newUserId}`, value: JSON.stringify({ code, referrerId, createdAt: event.createdAt }) },
  })

  await Promise.all([
    grantRewardBonusPoints(referrerId, config.referrerBonusPoints, 'REFERRAL_INVITE_REGISTERED', {
      referredUserId: params.newUserId,
      referredEmail: params.newUserEmail,
    }),
    grantRewardBonusPoints(params.newUserId, config.referredBonusPoints, 'REFERRED_SIGNUP_BONUS', {
      referrerId,
      referralCode: code,
    }),
  ])

  return {
    referrerId,
    code,
    referrerBonusPoints: config.referrerBonusPoints,
    referredBonusPoints: config.referredBonusPoints,
  }
}
