import { prisma } from '@/lib/prisma'

export type AdminReportsData = {
  stats: {
    totalRevenue: number
    totalOrders: number
    totalUsers: number
    activeVendors: number
    avgOrderValue: number
    platformCommission: number
    loyaltyCoupons: number
    referredSignups: number
    issuedGiftCards: number
    activeStoreCreditBalances: number
  }
  dailySales: Array<{ day: string; revenue: number; orders: number }>
  monthlySales: Array<{ month: string; revenue: number; orders: number }>
  categoryData: Array<{ name: string; value: number }>
  topVendors: Array<{ name: string; sales: number; orders: number }>
  topProducts: Array<{ name: string; sales: number; revenue: number }>
  userGrowth: Array<{ month: string; buyers: number; vendors: number }>
  retention: {
    loyaltyCouponUsage: Array<{ month: string; created: number; used: number }>
    referralSignups: Array<{ month: string; signups: number }>
    storeCreditLedger: {
      balances: Array<{ userId: string; balance: number; entries: number }>
      totalOutstandingBalance: number
      expiringSoonBalance: number
      recentEntries: Array<{ userId: string; type: string; amount: number; createdAt: string; note?: string }>
    }
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export async function getAdminReportsData(): Promise<AdminReportsData> {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 6)
  const sevenMonthsAgo = new Date(now)
  sevenMonthsAgo.setMonth(now.getMonth() - 6)

  const [orderAgg, totalOrders, totalUsers, activeVendors, recentOrders, recentMonthlyOrders, orderItems, users, coupons, siteSettings] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.store.count({ where: { status: 'APPROVED' } }),
    prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, total: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: sevenMonthsAgo } },
      select: { createdAt: true, total: true },
    }),
    prisma.orderItem.findMany({
      include: {
        product: {
          select: {
            name: true,
            category: { select: { name: true } },
            store: { select: { name: true, commissionRate: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: sevenMonthsAgo } },
      select: { createdAt: true, role: true },
    }),
    prisma.coupon.findMany({
      where: {
        OR: [
          { code: { startsWith: 'LOYAL-' } },
        ],
      },
      select: { code: true, createdAt: true, usedCount: true },
    }),
    prisma.siteSettings.findMany({
      where: {
        OR: [
          { key: { startsWith: 'referrals:' } },
          { key: { startsWith: 'storeCredit:' } },
          { key: { startsWith: 'giftCard:' } },
        ],
      },
      select: { key: true, value: true },
    }),
  ])

  const totalRevenue = orderAgg._sum.total ?? 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const dailyMap = new Map<string, { revenue: number; orders: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dailyMap.set(d.toLocaleDateString('en-US', { weekday: 'short' }), { revenue: 0, orders: 0 })
  }
  recentOrders.forEach((order) => {
    const key = order.createdAt.toLocaleDateString('en-US', { weekday: 'short' })
    const current = dailyMap.get(key) ?? { revenue: 0, orders: 0 }
    dailyMap.set(key, { revenue: current.revenue + order.total, orders: current.orders + 1 })
  })
  const dailySales = Array.from(dailyMap.entries()).map(([day, value]) => ({
    day,
    revenue: Number(value.revenue.toFixed(2)),
    orders: value.orders,
  }))

  const monthlyMap = new Map<string, { revenue: number; orders: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setMonth(now.getMonth() - i)
    monthlyMap.set(monthLabel(d), { revenue: 0, orders: 0 })
  }
  recentMonthlyOrders.forEach((order) => {
    const key = monthLabel(order.createdAt)
    const current = monthlyMap.get(key) ?? { revenue: 0, orders: 0 }
    monthlyMap.set(key, { revenue: current.revenue + order.total, orders: current.orders + 1 })
  })
  const monthlySales = Array.from(monthlyMap.entries()).map(([month, value]) => ({
    month,
    revenue: Number(value.revenue.toFixed(2)),
    orders: value.orders,
  }))

  const categoryRevenue = new Map<string, number>()
  const vendorAgg = new Map<string, { sales: number; orders: Set<string> }>()
  const productAgg = new Map<string, { sales: number; revenue: number }>()
  let commissionTotal = 0

  orderItems.forEach((item) => {
    const lineTotal = item.price * item.quantity
    const category = item.product.category.name
    const vendor = item.product.store.name
    const product = item.product.name

    categoryRevenue.set(category, (categoryRevenue.get(category) ?? 0) + lineTotal)

    if (!vendorAgg.has(vendor)) {
      vendorAgg.set(vendor, { sales: 0, orders: new Set<string>() })
    }
    const vendorData = vendorAgg.get(vendor)!
    vendorData.sales += lineTotal
    vendorData.orders.add(item.orderId)

    if (!productAgg.has(product)) {
      productAgg.set(product, { sales: 0, revenue: 0 })
    }
    const productData = productAgg.get(product)!
    productData.sales += item.quantity
    productData.revenue += lineTotal

    commissionTotal += lineTotal * (item.product.store.commissionRate / 100)
  })

  const categoryData = Array.from(categoryRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))

  const topVendors = Array.from(vendorAgg.entries())
    .map(([name, value]) => ({ name, sales: Number(value.sales.toFixed(2)), orders: value.orders.size }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 6)

  const topProducts = Array.from(productAgg.entries())
    .map(([name, value]) => ({ name, sales: value.sales, revenue: Number(value.revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  const userGrowthMap = new Map<string, { buyers: number; vendors: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setMonth(now.getMonth() - i)
    userGrowthMap.set(monthLabel(d), { buyers: 0, vendors: 0 })
  }
  users.forEach((user) => {
    const key = monthLabel(user.createdAt)
    const current = userGrowthMap.get(key)
    if (!current) return
    if (user.role === 'BUYER') current.buyers += 1
    if (user.role === 'VENDOR') current.vendors += 1
  })
  const userGrowth = Array.from(userGrowthMap.entries()).map(([month, value]) => ({
    month,
    buyers: value.buyers,
    vendors: value.vendors,
  }))

  const loyaltyCouponMap = new Map<string, { created: number; used: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setMonth(now.getMonth() - i)
    loyaltyCouponMap.set(monthLabel(d), { created: 0, used: 0 })
  }
  coupons.forEach((coupon) => {
    const key = monthLabel(coupon.createdAt)
    const current = loyaltyCouponMap.get(key) ?? { created: 0, used: 0 }
    loyaltyCouponMap.set(key, {
      created: current.created + 1,
      used: current.used + coupon.usedCount,
    })
  })

  const referralRows = siteSettings.filter((row) => row.key.startsWith('referrals:'))
  const storeCreditRows = siteSettings.filter((row) => row.key.startsWith('storeCredit:'))
  const giftCardRows = siteSettings.filter((row) => row.key.startsWith('giftCard:'))
  const referralSignupsMap = new Map<string, number>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setMonth(now.getMonth() - i)
    referralSignupsMap.set(monthLabel(d), 0)
  }
  let referredSignups = 0
  referralRows.forEach((row) => {
    try {
      const parsed = JSON.parse(row.value) as { referrals?: Array<{ createdAt: string }> }
      const referrals = Array.isArray(parsed.referrals) ? parsed.referrals : []
      referredSignups += referrals.length
      referrals.forEach((entry) => {
        const key = monthLabel(new Date(entry.createdAt))
        referralSignupsMap.set(key, (referralSignupsMap.get(key) ?? 0) + 1)
      })
    } catch {
      // noop
    }
  })

  const storeCreditBalances = storeCreditRows.flatMap((row) => {
    try {
      const parsed = JSON.parse(row.value) as {
        balance?: number
        entries?: Array<{
          type: string
          amount: number
          createdAt: string
          note?: string
          expiresAt?: string | null
          remainingAmount?: number
        }>
      }
      return [{
        userId: row.key.replace('storeCredit:', ''),
        balance: Number(parsed.balance ?? 0),
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      }]
    } catch {
      return []
    }
  })
  const totalOutstandingBalance = storeCreditBalances.reduce((sum, row) => sum + row.balance, 0)
  const expiringSoonBalance = storeCreditBalances.reduce((sum, row) => {
    const entrySum = row.entries.reduce((entryTotal, entry) => {
      if (!entry.expiresAt || !entry.remainingAmount || entry.remainingAmount <= 0) {
        return entryTotal
      }
      const expiresAt = new Date(entry.expiresAt)
      const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      if (expiresAt < new Date() || expiresAt > cutoff) {
        return entryTotal
      }
      return entryTotal + entry.remainingAmount
    }, 0)
    return sum + entrySum
  }, 0)
  const recentStoreCreditEntries = storeCreditBalances
    .flatMap((row) => row.entries.map((entry) => ({ userId: row.userId, ...entry })))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12)

  return {
    stats: {
      totalRevenue,
      totalOrders,
      totalUsers,
      activeVendors,
      avgOrderValue,
      platformCommission: Number(commissionTotal.toFixed(2)),
      loyaltyCoupons: coupons.length,
      referredSignups,
      issuedGiftCards: giftCardRows.length,
      activeStoreCreditBalances: storeCreditBalances.filter((row) => row.balance > 0).length,
    },
    dailySales,
    monthlySales,
    categoryData,
    topVendors,
    topProducts,
    userGrowth,
    retention: {
      loyaltyCouponUsage: Array.from(loyaltyCouponMap.entries()).map(([month, value]) => ({
        month,
        created: value.created,
        used: value.used,
      })),
      referralSignups: Array.from(referralSignupsMap.entries()).map(([month, signups]) => ({
        month,
        signups,
      })),
      storeCreditLedger: {
        balances: storeCreditBalances.map((row) => ({
          userId: row.userId,
          balance: Number(row.balance.toFixed(2)),
          entries: row.entries.length,
        })),
        totalOutstandingBalance: Number(totalOutstandingBalance.toFixed(2)),
        expiringSoonBalance: Number(expiringSoonBalance.toFixed(2)),
        recentEntries: recentStoreCreditEntries,
      },
    },
  }
}
