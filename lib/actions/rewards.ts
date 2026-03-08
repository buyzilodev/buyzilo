import { prisma } from '@/lib/prisma'
import { pushRetentionNotification } from '@/lib/actions/retentionNotifications'

type RewardCouponLedgerItem = {
  couponId: string
  code: string
  discount: number
  pointsSpent: number
  claimedAt: string
  expiresAt: string | null
}

type RewardBonusEvent = {
  id: string
  reason: string
  points: number
  createdAt: string
  meta?: Record<string, string>
}

type RewardsLedger = {
  redeemedPoints: number
  bonusPoints: number
  bonusEvents: RewardBonusEvent[]
  coupons: RewardCouponLedgerItem[]
}

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD'

export type LoyaltyProgramConfig = {
  pointsPerCurrencyUnit: number
  rewardCouponPointsCost: number
  rewardCouponDiscount: number
  rewardCouponMinOrder: number
  rewardCouponExpiryDays: number
  tierThresholds: Array<{ tier: LoyaltyTier; minPoints: number }>
}

const defaultLoyaltyProgramConfig: LoyaltyProgramConfig = {
  pointsPerCurrencyUnit: 0.1,
  rewardCouponPointsCost: 100,
  rewardCouponDiscount: 5,
  rewardCouponMinOrder: 25,
  rewardCouponExpiryDays: 30,
  tierThresholds: [
    { tier: 'BRONZE', minPoints: 0 },
    { tier: 'SILVER', minPoints: 250 },
    { tier: 'GOLD', minPoints: 750 },
  ],
}

function getNormalizedTierThresholds(input?: LoyaltyProgramConfig['tierThresholds']) {
  const allowedTiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD']
  const rows = Array.isArray(input) ? input : defaultLoyaltyProgramConfig.tierThresholds
  return rows
    .filter((row): row is { tier: LoyaltyTier; minPoints: number } => (
      !!row
      && allowedTiers.includes(row.tier)
      && typeof row.minPoints === 'number'
      && Number.isFinite(row.minPoints)
    ))
    .sort((a, b) => a.minPoints - b.minPoints)
}

function getRewardsKey(userId: string) {
  return `rewards:${userId}`
}

export async function getLoyaltyProgramConfig(): Promise<LoyaltyProgramConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'loyaltyProgramConfig' },
  })

  if (!row?.value) {
    return defaultLoyaltyProgramConfig
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<LoyaltyProgramConfig>
    const tierThresholds = getNormalizedTierThresholds(parsed.tierThresholds)
    return {
      pointsPerCurrencyUnit: typeof parsed.pointsPerCurrencyUnit === 'number' ? parsed.pointsPerCurrencyUnit : defaultLoyaltyProgramConfig.pointsPerCurrencyUnit,
      rewardCouponPointsCost: typeof parsed.rewardCouponPointsCost === 'number' ? parsed.rewardCouponPointsCost : defaultLoyaltyProgramConfig.rewardCouponPointsCost,
      rewardCouponDiscount: typeof parsed.rewardCouponDiscount === 'number' ? parsed.rewardCouponDiscount : defaultLoyaltyProgramConfig.rewardCouponDiscount,
      rewardCouponMinOrder: typeof parsed.rewardCouponMinOrder === 'number' ? parsed.rewardCouponMinOrder : defaultLoyaltyProgramConfig.rewardCouponMinOrder,
      rewardCouponExpiryDays: typeof parsed.rewardCouponExpiryDays === 'number' ? parsed.rewardCouponExpiryDays : defaultLoyaltyProgramConfig.rewardCouponExpiryDays,
      tierThresholds: tierThresholds.length > 0 ? tierThresholds : defaultLoyaltyProgramConfig.tierThresholds,
    }
  } catch {
    return defaultLoyaltyProgramConfig
  }
}

async function getRewardsLedger(userId: string): Promise<RewardsLedger> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getRewardsKey(userId) },
  })

  if (!row?.value) {
    return { redeemedPoints: 0, bonusPoints: 0, bonusEvents: [], coupons: [] }
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<RewardsLedger>
    return {
      redeemedPoints: typeof parsed.redeemedPoints === 'number' ? parsed.redeemedPoints : 0,
      bonusPoints: typeof parsed.bonusPoints === 'number' ? parsed.bonusPoints : 0,
      bonusEvents: Array.isArray(parsed.bonusEvents) ? parsed.bonusEvents : [],
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
    }
  } catch {
    return { redeemedPoints: 0, bonusPoints: 0, bonusEvents: [], coupons: [] }
  }
}

async function saveRewardsLedger(userId: string, ledger: RewardsLedger) {
  await prisma.siteSettings.upsert({
    where: { key: getRewardsKey(userId) },
    update: { value: JSON.stringify(ledger) },
    create: { key: getRewardsKey(userId), value: JSON.stringify(ledger) },
  })
}

function getTier(points: number, tierThresholds: LoyaltyProgramConfig['tierThresholds']) {
  return [...tierThresholds].reverse().find((entry) => points >= entry.minPoints) ?? tierThresholds[0]
}

function getNextTier(points: number, tierThresholds: LoyaltyProgramConfig['tierThresholds']) {
  return tierThresholds.find((entry) => entry.minPoints > points) ?? null
}

function createRewardCouponCode(userId: string) {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `LOYAL-${userId.slice(-4).toUpperCase()}-${suffix}`
}

export async function getBuyerRewards(userId: string) {
  const [config, ledger, orders] = await Promise.all([
    getLoyaltyProgramConfig(),
    getRewardsLedger(userId),
    prisma.order.findMany({
      where: {
        buyerId: userId,
        status: 'DELIVERED',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const lifetimeSpend = orders.reduce((sum, order) => sum + order.total, 0)
  const orderPoints = Math.floor(lifetimeSpend * config.pointsPerCurrencyUnit)
  const lifetimePoints = orderPoints + Math.max(0, ledger.bonusPoints)
  const redeemedPoints = Math.min(ledger.redeemedPoints, lifetimePoints)
  const availablePoints = Math.max(0, lifetimePoints - redeemedPoints)
  const currentTier = getTier(lifetimePoints, config.tierThresholds)
  const nextTier = getNextTier(lifetimePoints, config.tierThresholds)
  const pointsToNextTier = nextTier ? Math.max(0, nextTier.minPoints - lifetimePoints) : 0
  const rewardProgress = availablePoints % config.rewardCouponPointsCost
  const pointsToNextReward = rewardProgress === 0 && availablePoints >= config.rewardCouponPointsCost
    ? 0
    : config.rewardCouponPointsCost - rewardProgress

  const couponIds = ledger.coupons.map((coupon) => coupon.couponId)
  const coupons = couponIds.length > 0
    ? await prisma.coupon.findMany({
        where: {
          id: { in: couponIds },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const couponMap = new Map(coupons.map((coupon) => [coupon.id, coupon]))
  const rewardCoupons = ledger.coupons
    .map((coupon) => {
      const persisted = couponMap.get(coupon.couponId)
      return {
        ...coupon,
        isActive: persisted?.isActive ?? false,
        usedCount: persisted?.usedCount ?? 0,
        maxUses: persisted?.maxUses ?? 1,
      }
    })
    .sort((a, b) => (a.claimedAt < b.claimedAt ? 1 : -1))

  return {
    generatedAt: new Date().toISOString(),
    pointsPerDollar: config.pointsPerCurrencyUnit,
    rewardCouponCost: config.rewardCouponPointsCost,
    rewardCouponDiscount: config.rewardCouponDiscount,
    rewardCouponMinOrder: config.rewardCouponMinOrder,
    rewardCouponExpiryDays: config.rewardCouponExpiryDays,
    tierThresholds: config.tierThresholds,
    summary: {
      lifetimeSpend: Number(lifetimeSpend.toFixed(2)),
      deliveredOrders: orders.length,
      orderPoints,
      bonusPoints: ledger.bonusPoints,
      lifetimePoints,
      redeemedPoints,
      availablePoints,
      currentTier: currentTier.tier,
      nextTier: nextTier?.tier ?? null,
      pointsToNextTier,
      pointsToNextReward,
      availableRewardClaims: Math.floor(availablePoints / config.rewardCouponPointsCost),
    },
    recentQualifyingOrders: orders.slice(0, 5).map((order) => ({
      id: order.id,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      earnedPoints: Math.floor(order.total * config.pointsPerCurrencyUnit),
      items: order.items.slice(0, 2).map((item) => ({
        quantity: item.quantity,
        productName: item.product.name,
        productSlug: item.product.slug,
      })),
    })),
    bonusEvents: ledger.bonusEvents.slice(0, 10),
    rewardCoupons,
  }
}

export async function grantRewardBonusPoints(
  userId: string,
  points: number,
  reason: string,
  meta?: Record<string, string>
) {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error('Bonus points must be greater than zero')
  }

  const ledger = await getRewardsLedger(userId)
  ledger.bonusPoints += Math.floor(points)
  ledger.bonusEvents.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reason,
    points: Math.floor(points),
    createdAt: new Date().toISOString(),
    meta,
  })
  ledger.bonusEvents = ledger.bonusEvents.slice(0, 50)
  await saveRewardsLedger(userId, ledger)
  if (reason === 'REFERRAL_INVITE_REGISTERED') {
    await pushRetentionNotification({
      userId,
      kind: 'REFERRAL_BONUS',
      title: 'Referral bonus earned',
      body: `You earned ${Math.floor(points)} bonus points from a referred signup.`,
      href: '/dashboard/referrals',
    })
  }
  if (reason === 'REFERRED_SIGNUP_BONUS') {
    await pushRetentionNotification({
      userId,
      kind: 'REFERRAL_BONUS',
      title: 'Signup referral bonus applied',
      body: `Your account received ${Math.floor(points)} referral signup bonus points.`,
      href: '/dashboard/rewards',
    })
  }
  return getBuyerRewards(userId)
}

export async function claimBuyerRewardCoupon(userId: string) {
  const config = await getLoyaltyProgramConfig()
  const rewards = await getBuyerRewards(userId)
  if (rewards.summary.availablePoints < config.rewardCouponPointsCost) {
    throw new Error('Not enough reward points to claim a coupon')
  }

  const ledger = await getRewardsLedger(userId)
  const code = createRewardCouponCode(userId)
  const expiresAt = new Date(Date.now() + config.rewardCouponExpiryDays * 24 * 60 * 60 * 1000)

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discount: config.rewardCouponDiscount,
      isPercent: false,
      minOrder: config.rewardCouponMinOrder,
      maxUses: 1,
      expiresAt,
      isActive: true,
    },
  })

  ledger.redeemedPoints += config.rewardCouponPointsCost
  ledger.coupons.unshift({
    couponId: coupon.id,
    code: coupon.code,
    discount: coupon.discount,
    pointsSpent: config.rewardCouponPointsCost,
    claimedAt: new Date().toISOString(),
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
  })

  await saveRewardsLedger(userId, ledger)
  await pushRetentionNotification({
    userId,
    kind: 'LOYALTY_REWARD',
    title: 'Reward coupon claimed',
    body: `${coupon.code} is ready to use for $${coupon.discount.toFixed(2)} off.`,
    href: '/dashboard/rewards',
  })

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount: coupon.discount,
      minOrder: coupon.minOrder,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
    },
    rewards: await getBuyerRewards(userId),
  }
}
