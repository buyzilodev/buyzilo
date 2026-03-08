import { prisma } from '@/lib/prisma'
import { getVendorRatingSummaryMap } from '@/lib/actions/vendorRatings'

export async function getAdminOrders(status?: string) {
  const where = status
    ? { status: status as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' }
    : {}

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, store: { select: { id: true, name: true } } } },
          },
        },
        payment: { select: { status: true } },
        shipments: { select: { status: true, trackingNumber: true } },
        returnRequests: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.order.count({ where }),
  ])

  return {
    total,
    orders: orders.map((order) => {
      const storeMap = new Map<string, string>()
      for (const item of order.items) {
        if (item.product.store?.id) {
          storeMap.set(item.product.store.id, item.product.store.name)
        }
      }
      const shipmentStatuses = order.shipments.map((shipment) => shipment.status)
      const openReturnCount = order.returnRequests.filter((request) => ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(request.status)).length

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items.length,
        buyer: order.buyer,
        buyerEmail: order.buyerEmail,
        paymentStatus: order.payment?.status ?? 'UNPAID',
        shipmentCount: order.shipments.length,
        shipmentStatuses,
        hasTracking: order.shipments.some((shipment) => Boolean(shipment.trackingNumber)),
        returnCount: order.returnRequests.length,
        openReturnCount,
        storeCount: storeMap.size,
        stores: Array.from(storeMap.values()),
        needsFulfillment: ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status),
        isMultiVendor: storeMap.size > 1,
      }
    }),
  }
}

export async function getAdminProducts(status?: string) {
  const where = status && status !== 'ALL' ? { approvalStatus: status } : {}
  const products = await prisma.product.findMany({
    where,
    include: {
      store: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    images: product.images,
    approvalStatus: product.approvalStatus,
    approvalNote: product.approvalNote,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    store: product.store,
    category: product.category,
  }))
}

export async function getAdminVendors(status?: string) {
  const where = status
    ? { status: status as 'PENDING' | 'APPROVED' | 'BANNED' }
    : {}

  const stores = await prisma.store.findMany({
    where,
    include: {
      vendor: { select: { name: true, email: true } },
      _count: { select: { products: true, payouts: true } },
      products: {
        select: {
          id: true,
          stock: true,
          isActive: true,
          approvalStatus: true,
        },
      },
      payouts: {
        select: {
          amount: true,
          status: true,
        },
        take: 50,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const ratingMap = await getVendorRatingSummaryMap(stores.map((store) => store.id))

  return stores.map((store) => {
    const approvedProducts = store.products.filter((product) => product.approvalStatus === 'APPROVED').length
    const pendingProducts = store.products.filter((product) => product.approvalStatus === 'PENDING').length
    const disabledProducts = store.products.filter((product) => product.isActive === false).length
    const lowStockProducts = store.products.filter((product) => product.stock <= 5).length
    const requestedPayouts = store.payouts.filter((payout) => payout.status === 'REQUESTED')
    const requestedPayoutAmount = requestedPayouts.reduce((sum, payout) => sum + payout.amount, 0)

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      moderationNote: store.moderationNote,
      createdAt: store.createdAt.toISOString(),
      vendor: store.vendor,
      productCount: store._count.products,
      payoutCount: store._count.payouts,
      approvedProducts,
      pendingProducts,
      disabledProducts,
      lowStockProducts,
      stripeReady: Boolean(store.stripeAccountId),
      pendingPayout: store.pendingPayout,
      totalEarned: store.totalEarned,
      requestedPayoutAmount,
      rating: ratingMap.get(store.id) ?? { averageRating: null, reviewCount: 0, lowRatingCount: 0 },
    }
  })
}

export async function getAdminUsers(role?: string) {
  const where = role
    ? { role: role as 'BUYER' | 'VENDOR' | 'ADMIN' | 'MANAGER' | 'SUPPORT' | 'FINANCE' | 'MODERATOR' }
    : {}

  const [users, total, gdprRows] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            supportRequests: true,
            returnRequests: true,
            wishlistItems: true,
            addresses: true,
            userGroupMemberships: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.user.count({ where }),
    prisma.siteSettings.findMany({
      where: { key: { startsWith: 'gdprDeletionRequest:' } },
      select: { key: true, value: true },
    }),
  ])

  const gdprMap = new Map<string, string>()
  for (const row of gdprRows) {
    const userId = row.key.replace('gdprDeletionRequest:', '')
    try {
      const parsed = JSON.parse(row.value) as { status?: string }
      gdprMap.set(userId, parsed.status ?? 'REQUESTED')
    } catch {
      gdprMap.set(userId, 'REQUESTED')
    }
  }

  return {
    total,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      orderCount: user._count.orders,
      reviewCount: user._count.reviews,
      supportCount: user._count.supportRequests,
      returnCount: user._count.returnRequests,
      wishlistCount: user._count.wishlistItems,
      addressCount: user._count.addresses,
      groupCount: user._count.userGroupMemberships,
      gdprStatus: gdprMap.get(user.id) ?? null,
    })),
  }
}
