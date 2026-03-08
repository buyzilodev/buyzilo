import { prisma } from '@/lib/prisma'

export type BestsellerConfig = {
  lookbackDays: number
  limit: number
}

const defaultConfig: BestsellerConfig = {
  lookbackDays: 30,
  limit: 12,
}

function parseConfig(value: string | null | undefined): BestsellerConfig {
  if (!value) return defaultConfig
  try {
    const parsed = JSON.parse(value) as Partial<BestsellerConfig>
    return {
      lookbackDays: typeof parsed.lookbackDays === 'number' && parsed.lookbackDays > 0 ? parsed.lookbackDays : defaultConfig.lookbackDays,
      limit: typeof parsed.limit === 'number' && parsed.limit > 0 ? parsed.limit : defaultConfig.limit,
    }
  } catch {
    return defaultConfig
  }
}

async function getBestsellerConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'bestsellerConfig' },
  })
  return parseConfig(row?.value)
}

export async function getBestsellerProducts(limitOverride?: number) {
  const config = await getBestsellerConfig()
  const limit = limitOverride ?? config.limit
  const since = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000)

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: since },
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'] },
      },
      product: {
        isActive: true,
        approvalStatus: 'APPROVED',
        store: { status: 'APPROVED' },
      },
    },
    include: {
      order: { select: { id: true, createdAt: true } },
      product: {
        include: {
          store: { select: { name: true, slug: true } },
          category: { select: { name: true, slug: true } },
          variants: {
            where: { isActive: true },
            select: { price: true, comparePrice: true, stock: true },
          },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true } },
        },
      },
    },
  })

  const grouped = new Map<string, {
    product: typeof orderItems[number]['product']
    unitsSold: number
    orderIds: Set<string>
    revenue: number
  }>()

  for (const item of orderItems) {
    const current = grouped.get(item.productId)
    if (current) {
      current.unitsSold += item.quantity
      current.orderIds.add(item.orderId)
      current.revenue += item.quantity * item.price
      continue
    }

    grouped.set(item.productId, {
      product: item.product,
      unitsSold: item.quantity,
      orderIds: new Set([item.orderId]),
      revenue: item.quantity * item.price,
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => {
      if (right.unitsSold !== left.unitsSold) return right.unitsSold - left.unitsSold
      if (right.orderIds.size !== left.orderIds.size) return right.orderIds.size - left.orderIds.size
      return right.revenue - left.revenue
    })
    .slice(0, limit)
    .map((entry) => {
      const reviewCount = entry.product._count.reviews
      const avg =
        reviewCount > 0
          ? entry.product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : null

      return {
        id: entry.product.id,
        name: entry.product.name,
        slug: entry.product.slug,
        description: entry.product.description,
        price: entry.product.variants.length
          ? Math.min(...entry.product.variants.map((variant) => variant.price ?? entry.product.price))
          : entry.product.price,
        comparePrice: entry.product.variants.length
          ? Math.max(...entry.product.variants.map((variant) => variant.comparePrice ?? entry.product.comparePrice ?? 0)) || entry.product.comparePrice
          : entry.product.comparePrice,
        images: entry.product.images,
        stock: entry.product.stock,
        store: entry.product.store,
        category: entry.product.category,
        hasVariants: entry.product.variants.length > 0,
        reviewCount,
        averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
        unitsSold: entry.unitsSold,
        ordersCount: entry.orderIds.size,
        revenue: Number(entry.revenue.toFixed(2)),
      }
    })
}

export async function getBestsellerAdminData() {
  const [configRow, products] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'bestsellerConfig' } }),
    getBestsellerProducts(20),
  ])

  return {
    config: configRow?.value ?? JSON.stringify(defaultConfig, null, 2),
    products,
  }
}
