import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCustomersAlsoBoughtProducts } from '@/lib/queries/customersAlsoBought'
import { getFeaturedProducts } from '@/lib/queries/storefront'

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

function mapProducts(
  products: Array<{
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
  }>
) {
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

async function getRecommendationsByCategory(categoryIds: string[], excludedIds: string[], limit = 6) {
  if (categoryIds.length === 0) {
    return []
  }

  const products = await prisma.product.findMany({
    where: {
      categoryId: { in: categoryIds.slice(0, 8) },
      id: { notIn: excludedIds },
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    },
    include: storefrontProductInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return mapProducts(products)
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  const { searchParams } = new URL(req.url)
  const recentIds = (searchParams.get('recentIds') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8)
  const productId = searchParams.get('productId')?.trim() || null

  const [wishlistItems, recentProducts, featuredProducts, coPurchaseProducts] = await Promise.all([
    userId
      ? prisma.wishlistItem.findMany({
          where: { userId },
          include: { product: { select: { id: true, categoryId: true } } },
          take: 20,
        })
      : Promise.resolve([]),
    recentIds.length > 0
      ? prisma.product.findMany({
          where: { id: { in: recentIds } },
          select: { id: true, categoryId: true },
        })
      : Promise.resolve([]),
    getFeaturedProducts(12),
    productId ? getCustomersAlsoBoughtProducts(productId, 6) : Promise.resolve([]),
  ])

  const wishlistCategoryIds = Array.from(new Set(wishlistItems.map((item) => item.product.categoryId)))
  const recentCategoryIds = Array.from(new Set(recentProducts.map((item) => item.categoryId)))
  const excludedIds = Array.from(new Set([
    ...wishlistItems.map((item) => item.product.id),
    ...recentProducts.map((item) => item.id),
  ]))

  const [wishlistBased, recentBased] = await Promise.all([
    getRecommendationsByCategory(wishlistCategoryIds, excludedIds, 6),
    getRecommendationsByCategory(recentCategoryIds, excludedIds, 6),
  ])

  return NextResponse.json({
    sections: [
      {
        id: 'also-bought',
        title: 'Customers Also Bought',
        subtitle: 'Products that frequently appear in the same completed orders.',
        products: coPurchaseProducts,
      },
      {
        id: 'wishlist',
        title: 'Picked From Your Wishlist',
        subtitle: 'Fresh products from the categories you save most often.',
        products: wishlistBased,
      },
      {
        id: 'recent',
        title: 'Because You Recently Viewed',
        subtitle: 'More products related to your latest browsing.',
        products: recentBased,
      },
      {
        id: 'featured',
        title: 'Trending Right Now',
        subtitle: 'Marketplace picks when we need a strong fallback.',
        products: featuredProducts.slice(0, 6),
      },
    ].filter((section) => section.products.length > 0),
  })
}
