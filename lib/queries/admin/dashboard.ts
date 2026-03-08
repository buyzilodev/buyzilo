import { prisma } from '@/lib/prisma'
import type { DashboardData, DashboardTaskItem, DashboardTrendPoint } from '@/lib/admin/types'
import { parseQuoteRequest } from '@/lib/actions/productCommercial'

const fallbackTrend: DashboardTrendPoint[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
  day,
  sales: 1200 + i * 300,
}))

export const fallbackDashboardData: DashboardData = {
  totalSales: 28490,
  totalOrders: 328,
  totalVendors: 42,
  activeProducts: 612,
  registeredCustomers: 1904,
  completeOrders: 231,
  openOrders: 62,
  vendorSalesTotal: 22900,
  overdueProcurement: 0,
  procurementAlertThreads: 0,
  loyaltyCoupons: 0,
  referredSignups: 0,
  outstandingStoreCredit: 0,
  recentOrders: [
    { id: 'demo-001', createdAt: new Date().toISOString(), customer: 'Demo Customer', total: 149.99, status: 'PENDING' },
    { id: 'demo-002', createdAt: new Date().toISOString(), customer: 'Sample Buyer', total: 92.0, status: 'DELIVERED' },
  ],
  salesTrend: fallbackTrend,
  operationsQueue: [],
  merchandisingQueue: [],
  contentQueue: [],
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function subtractDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() - days)
  return next
}

export async function getAdminDashboardData(): Promise<DashboardData> {
  try {
    const since = subtractDays(new Date(), 6)

    const [
      orderAgg,
      totalOrders,
      completeOrders,
      openOrders,
      totalVendors,
      activeProducts,
      registeredCustomers,
      recentOrdersRaw,
      trendOrders,
      overdueProcurement,
      procurementAlertThreads,
      loyaltyCouponsRow,
      referralRows,
      storeCreditRows,
      pendingProducts,
      pendingVendors,
      openReturns,
      openSupport,
      pendingPayouts,
      shipmentAttention,
      pendingDiscussion,
      lowRatings,
      customPages,
      publishedPages,
      blogPosts,
      unpublishedBlogPosts,
      pendingBlogComments,
      activeCoupons,
      quoteRows,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['DELIVERED', 'SHIPPED'] } } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.store.count({ where: { status: 'APPROVED' } }),
      prisma.product.count({ where: { isActive: true, approvalStatus: 'APPROVED' } }),
      prisma.user.count({ where: { role: 'BUYER' } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { buyer: { select: { name: true, email: true } } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, total: true },
      }),
      prisma.purchaseOrder.count({
        where: {
          expectedAt: { lt: new Date() },
          status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        },
      }),
      prisma.messageThread.count({
        where: { category: 'PROCUREMENT_ALERT' },
      }),
      prisma.siteSettings.count({
        where: { key: { startsWith: 'giftCard:' } },
      }),
      prisma.siteSettings.findMany({
        where: { key: { startsWith: 'referrals:' } },
        select: { value: true },
      }),
      prisma.siteSettings.findMany({
        where: { key: { startsWith: 'storeCredit:' } },
        select: { value: true },
      }),
      prisma.product.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.store.count({ where: { status: 'PENDING' } }),
      prisma.returnRequest.count({ where: { status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED'] } } }),
      prisma.supportRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.payout.count({ where: { status: 'REQUESTED' } }),
      prisma.shipment.count({ where: { status: { in: ['PENDING', 'SHIPPED', 'IN_TRANSIT'] } } }),
      prisma.productDiscussion.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { rating: { lte: 2 } } }),
      prisma.customPage.count(),
      prisma.customPage.count({ where: { isActive: true } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { published: false } }),
      prisma.blogComment.count({ where: { isApproved: false } }),
      prisma.coupon.count({ where: { isActive: true } }),
      prisma.siteSettings.findMany({
        where: { key: { startsWith: 'quoteRequest:' } },
        select: { value: true },
      }),
    ])

    const recentOrders = recentOrdersRaw.map((order) => ({
      id: order.id,
      createdAt: order.createdAt.toISOString(),
      customer: order.buyer?.name ?? order.buyer?.email ?? order.buyerEmail ?? 'Guest',
      total: order.total,
      status: order.status,
    }))

    const trendMap = new Map<string, number>()
    for (let i = 6; i >= 0; i -= 1) {
      const d = subtractDays(new Date(), i)
      trendMap.set(dayLabel(d), 0)
    }

    trendOrders.forEach((order) => {
      const key = dayLabel(order.createdAt)
      trendMap.set(key, (trendMap.get(key) ?? 0) + order.total)
    })

    const salesTrend = Array.from(trendMap.entries()).map(([day, sales]) => ({ day, sales }))

    const referredSignups = referralRows.reduce((sum, row) => {
      try {
        const parsed = JSON.parse(row.value) as { referrals?: Array<unknown> }
        return sum + (Array.isArray(parsed.referrals) ? parsed.referrals.length : 0)
      } catch {
        return sum
      }
    }, 0)

    const outstandingStoreCredit = storeCreditRows.reduce((sum, row) => {
      try {
        const parsed = JSON.parse(row.value) as { balance?: number }
        return sum + Number(parsed.balance ?? 0)
      } catch {
        return sum
      }
    }, 0)

    const openQuoteRequests = quoteRows.reduce((sum, row) => {
      const parsed = parseQuoteRequest(row.value)
      if (!parsed) return sum
      return sum + (parsed.status === 'CLOSED' ? 0 : 1)
    }, 0)

    const operationsQueue: DashboardTaskItem[] = [
      {
        label: 'Pending product approvals',
        count: pendingProducts,
        href: '/admin/products/manage',
        tone: pendingProducts > 0 ? 'amber' : 'slate',
        description: 'Catalog submissions waiting for review.',
      },
      {
        label: 'Pending vendor approvals',
        count: pendingVendors,
        href: '/admin/vendors',
        tone: pendingVendors > 0 ? 'amber' : 'slate',
        description: 'Stores requiring onboarding approval.',
      },
      {
        label: 'Open returns',
        count: openReturns,
        href: '/admin/orders/returns',
        tone: openReturns > 0 ? 'rose' : 'slate',
        description: 'Return requests that still need admin handling.',
      },
      {
        label: 'Support tickets',
        count: openSupport,
        href: '/admin/orders/call-requests',
        tone: openSupport > 0 ? 'blue' : 'slate',
        description: 'Buyer and callback threads waiting for follow-up.',
      },
      {
        label: 'Open quote requests',
        count: openQuoteRequests,
        href: '/admin/products/quotes',
        tone: openQuoteRequests > 0 ? 'violet' : 'slate',
        description: 'Quote-only listings requiring seller/admin response.',
      },
      {
        label: 'Requested payouts',
        count: pendingPayouts,
        href: '/admin/vendors/accounting',
        tone: pendingPayouts > 0 ? 'emerald' : 'slate',
        description: 'Vendor payouts waiting for accounting action.',
      },
    ]

    const merchandisingQueue: DashboardTaskItem[] = [
      {
        label: 'Active coupons',
        count: activeCoupons,
        href: '/admin/coupons',
        tone: 'blue',
        description: 'Current promotion codes and discount activity.',
      },
      {
        label: 'Overdue procurement',
        count: overdueProcurement,
        href: '/admin/vendors/procurement',
        tone: overdueProcurement > 0 ? 'rose' : 'slate',
        description: 'Open purchase orders past expected delivery.',
      },
      {
        label: 'Procurement alerts',
        count: procurementAlertThreads,
        href: '/admin/vendors/message-center',
        tone: procurementAlertThreads > 0 ? 'amber' : 'slate',
        description: 'Escalation threads from vendor procurement activity.',
      },
      {
        label: 'Shipment attention',
        count: shipmentAttention,
        href: '/admin/orders/shipments',
        tone: shipmentAttention > 0 ? 'blue' : 'slate',
        description: 'Shipments still in active fulfillment states.',
      },
      {
        label: 'Pending discussion',
        count: pendingDiscussion,
        href: '/admin/reviews/discussion',
        tone: pendingDiscussion > 0 ? 'amber' : 'slate',
        description: 'Product questions and comments awaiting moderation.',
      },
      {
        label: 'Low-rating reviews',
        count: lowRatings,
        href: '/admin/reviews',
        tone: lowRatings > 0 ? 'rose' : 'slate',
        description: 'Reviews that may need moderation or seller follow-up.',
      },
    ]

    const contentQueue: DashboardTaskItem[] = [
      {
        label: 'Published pages',
        count: publishedPages,
        href: '/admin/pages',
        tone: 'blue',
        description: `${customPages} total custom pages across the storefront.`,
      },
      {
        label: 'Draft blog posts',
        count: unpublishedBlogPosts,
        href: '/admin/website/blog',
        tone: unpublishedBlogPosts > 0 ? 'amber' : 'slate',
        description: `${blogPosts} total blog entries in the CMS.`,
      },
      {
        label: 'Pending blog comments',
        count: pendingBlogComments,
        href: '/admin/website/comments',
        tone: pendingBlogComments > 0 ? 'amber' : 'slate',
        description: 'Storefront article comments awaiting moderation.',
      },
    ]

    return {
      totalSales: orderAgg._sum.total ?? 0,
      totalOrders,
      totalVendors,
      activeProducts,
      registeredCustomers,
      completeOrders,
      openOrders,
      vendorSalesTotal: Math.max(0, (orderAgg._sum.total ?? 0) * 0.82),
      overdueProcurement,
      procurementAlertThreads,
      loyaltyCoupons: loyaltyCouponsRow,
      referredSignups,
      outstandingStoreCredit: Number(outstandingStoreCredit.toFixed(2)),
      recentOrders,
      salesTrend,
      operationsQueue,
      merchandisingQueue,
      contentQueue,
    }
  } catch {
    return fallbackDashboardData
  }
}
