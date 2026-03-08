import { prisma } from '@/lib/prisma'

type ProductWithStorefrontFields = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  images: string[]
  store: { name: string; slug: string }
  category: { name: string; slug: string }
  variants: Array<{ price: number | null; comparePrice: number | null; stock: number }>
  reviews: Array<{ rating: number }>
  _count: { reviews: number }
}

const storefrontProductInclude = {
  store: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: { price: true, comparePrice: true, stock: true },
  },
  reviews: { select: { rating: true } },
  _count: { select: { reviews: true } },
} as const

function mapProducts(products: ProductWithStorefrontFields[]) {
  return products.map((product) => {
    const reviewCount = product._count.reviews
    const avg =
      reviewCount > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : null

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.variants.length
        ? Math.min(...product.variants.map((variant) => variant.price ?? product.price))
        : product.price,
      comparePrice: product.variants.length
        ? Math.max(...product.variants.map((variant) => variant.comparePrice ?? product.comparePrice ?? 0)) || product.comparePrice
        : product.comparePrice,
      stock: product.variants.length
        ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
        : product.stock,
      images: product.images,
      store: product.store,
      category: product.category,
      hasVariants: product.variants.length > 0,
      reviewCount,
      averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
    }
  })
}

export async function getCustomersAlsoBoughtProducts(productId: string, limit = 6) {
  const anchorOrderItems = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'] },
      },
    },
    select: { orderId: true },
    take: 500,
  })

  const orderIds = Array.from(new Set(anchorOrderItems.map((item) => item.orderId)))
  if (orderIds.length === 0) {
    return []
  }

  const siblingItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      productId: { not: productId },
      product: {
        isActive: true,
        approvalStatus: 'APPROVED',
        store: { status: 'APPROVED' },
      },
    },
    include: {
      product: {
        include: storefrontProductInclude,
      },
    },
  })

  const grouped = new Map<string, { product: ProductWithStorefrontFields; coPurchaseCount: number; unitsSoldTogether: number }>()

  for (const item of siblingItems) {
    const current = grouped.get(item.productId)
    if (current) {
      current.coPurchaseCount += 1
      current.unitsSoldTogether += item.quantity
      continue
    }

    grouped.set(item.productId, {
      product: item.product,
      coPurchaseCount: 1,
      unitsSoldTogether: item.quantity,
    })
  }

  const ranked = Array.from(grouped.values())
    .sort((left, right) => {
      if (right.coPurchaseCount !== left.coPurchaseCount) {
        return right.coPurchaseCount - left.coPurchaseCount
      }
      return right.unitsSoldTogether - left.unitsSoldTogether
    })
    .slice(0, limit)

  return mapProducts(ranked.map((entry) => entry.product)).map((product, index) => ({
    ...product,
    coPurchaseCount: ranked[index].coPurchaseCount,
    unitsSoldTogether: ranked[index].unitsSoldTogether,
  }))
}
