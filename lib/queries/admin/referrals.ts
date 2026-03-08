import { prisma } from '@/lib/prisma'
import { getReferralProgramConfig } from '@/lib/actions/referrals'

type ReferralLedger = {
  code: string
  referrals: Array<{
    id: string
    referredUserId: string
    referredEmail: string
    createdAt: string
    status: 'REGISTERED'
    referrerBonusPoints: number
    referredBonusPoints: number
  }>
}

export async function getAdminReferralReportData() {
  const [config, rows] = await Promise.all([
    getReferralProgramConfig(),
    prisma.siteSettings.findMany({
      where: {
        key: {
          startsWith: 'referrals:',
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const ledgers = rows.flatMap((row) => {
    try {
      const parsed = JSON.parse(row.value) as Partial<ReferralLedger>
      if (!parsed.code || !Array.isArray(parsed.referrals)) {
        return []
      }
      return [{
        ownerId: row.key.replace('referrals:', ''),
        code: parsed.code,
        referrals: parsed.referrals,
      }]
    } catch {
      return []
    }
  })

  const userIds = Array.from(new Set(ledgers.map((ledger) => ledger.ownerId)))
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []

  const userMap = new Map(users.map((user) => [user.id, user]))
  const flattened = ledgers.flatMap((ledger) => ledger.referrals.map((referral) => ({
    ...referral,
    ownerId: ledger.ownerId,
    code: ledger.code,
    ownerName: userMap.get(ledger.ownerId)?.name ?? null,
    ownerEmail: userMap.get(ledger.ownerId)?.email ?? null,
  })))
  const sortedReferrals = flattened.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return {
    config,
    stats: {
      activeCodes: ledgers.filter((ledger) => ledger.referrals.length > 0).length,
      totalCodes: ledgers.length,
      totalRegistrations: flattened.length,
      totalReferrerBonusPoints: flattened.reduce((sum, entry) => sum + entry.referrerBonusPoints, 0),
      totalReferredBonusPoints: flattened.reduce((sum, entry) => sum + entry.referredBonusPoints, 0),
    },
    topReferrers: ledgers
      .map((ledger) => ({
        ownerId: ledger.ownerId,
        ownerName: userMap.get(ledger.ownerId)?.name ?? null,
        ownerEmail: userMap.get(ledger.ownerId)?.email ?? null,
        code: ledger.code,
        referrals: ledger.referrals.length,
        totalReferrerBonusPoints: ledger.referrals.reduce((sum, entry) => sum + entry.referrerBonusPoints, 0),
      }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10),
    recentReferrals: sortedReferrals.slice(0, 25),
  }
}
