import { prisma } from '@/lib/prisma'
import { getProductMetaMap } from '@/lib/helpers/productMeta'
import { getRequiredProductsMap } from '@/lib/actions/requiredProducts'
import {
  type AccessViewerContext,
  filterProductsByAccess,
  filterStoresByAccess,
  getCatalogAccessDecision,
  getProductAccessDecision,
} from '@/lib/actions/accessRestrictions'
import { normalizeUnitPricing } from '@/lib/helpers/unitPricing'
export { getBestsellerProducts } from '@/lib/queries/bestsellers'

export async function getStorefrontCategories(limit = 12, viewer?: AccessViewerContext) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    take: limit,
    include: {
      _count: { select: { products: true } },
    },
  })

  const visible = viewer
    ? (
      await Promise.all(
        categories.map(async (category) => ({
          category,
          decision: await getCatalogAccessDecision(viewer, category.slug),
        }))
      )
    )
      .filter((entry) => entry.decision.allowed)
      .map((entry) => entry.category)
    : categories

  return visible.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    icon: category.icon,
    productCount: category._count.products,
  }))
}

export async function getCategorySpotlightStores(categorySlug: string, limit = 4, viewer?: AccessViewerContext) {
  if (!categorySlug.trim()) return []

  const stores = await prisma.store.findMany({
    where: {
      status: 'APPROVED',
      products: {
        some: {
          isActive: true,
          approvalStatus: 'APPROVED',
          category: { slug: categorySlug },
        },
      },
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              approvalStatus: 'APPROVED',
              category: { slug: categorySlug },
            },
          },
        },
      },
    },
  })

  const visibleStores = viewer ? await filterStoresByAccess(stores, viewer) : stores

  return visibleStores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logo: store.logo,
    productCount: store._count.products,
  }))
}

export async function getFeaturedProducts(limit = 8, viewer?: AccessViewerContext) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
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
  })

  const visibleProducts = viewer ? await filterProductsByAccess(products, viewer) : products

  return visibleProducts.map((product) => {
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
      images: product.images,
      stock: product.stock,
      store: product.store,
      category: product.category,
      hasVariants: product.variants.length > 0,
      reviewCount,
      averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
    }
  })
}

export async function getProductByIdOrSlug(identifier: string, viewer?: AccessViewerContext) {
  const baseWhere = {
    isActive: true as const,
    approvalStatus: 'APPROVED' as const,
    store: { status: 'APPROVED' as const },
  }

  let exact = null
  try {
    exact = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        ...baseWhere,
      },
      include: {
        store: { select: { id: true, vendorId: true, name: true, slug: true, status: true, description: true } },
        category: { select: { id: true, name: true, slug: true } },
        options: {
          include: {
            values: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
        },
        reviews: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
  } catch {
    exact = null
  }

  if (exact) {
    if (!viewer) return exact
    const decision = await getProductAccessDecision(viewer, {
      productSlug: exact.slug,
      categorySlug: exact.category.slug,
    })
    return decision.allowed ? exact : null
  }

  const slugBase = identifier.replace(/-\d{6,}$/, '')
  if (!slugBase || slugBase === identifier) return null

  try {
    const fallback = await prisma.product.findFirst({
      where: {
        slug: { startsWith: `${slugBase}-` },
        ...baseWhere,
      },
      include: {
        store: { select: { id: true, vendorId: true, name: true, slug: true, status: true, description: true } },
        category: { select: { id: true, name: true, slug: true } },
        options: {
          include: {
            values: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
        },
        reviews: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    if (!fallback) return null
    if (!viewer) return fallback
    const decision = await getProductAccessDecision(viewer, {
      productSlug: fallback.slug,
      categorySlug: fallback.category.slug,
    })
    return decision.allowed ? fallback : null
  } catch {
    return null
  }
}

type ProductSort = 'default' | 'price-low' | 'price-high' | 'newest'

type ProductListInput = {
  category?: string
  search?: string
  tag?: string
  sort?: ProductSort
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
  page?: number
  limit?: number
  viewer?: AccessViewerContext
}

export async function getStorefrontProductList(input: ProductListInput) {
  const page = Math.max(1, input.page ?? 1)
  const limit = Math.min(60, Math.max(1, input.limit ?? 24))
  const offset = (page - 1) * limit
  const normalizedTag = input.tag?.trim().toLowerCase()

  const where: {
    isActive: true
    approvalStatus: 'APPROVED'
    store: { status: 'APPROVED' }
    category?: { slug: string }
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>
  } = {
    isActive: true,
    approvalStatus: 'APPROVED',
    store: { status: 'APPROVED' },
  }

  if (input.category) {
    where.category = { slug: input.category }
  }

  if (input.search?.trim()) {
    where.OR = [
      { name: { contains: input.search.trim(), mode: 'insensitive' } },
      { description: { contains: input.search.trim(), mode: 'insensitive' } },
    ]
  }

  const sort = input.sort ?? 'default'
  const orderBy =
    sort === 'price-low'
      ? { price: 'asc' as const }
      : sort === 'price-high'
        ? { price: 'desc' as const }
        : { createdAt: 'desc' as const }

  const products = await prisma.product.findMany({
    where,
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
    orderBy,
  })

  const metaMap = await getProductMetaMap(products.map((product) => product.id))
  const requiredProductsMap = await getRequiredProductsMap(products.map((product) => product.id))

  const mapped = products.map((product) => {
    const reviewCount = product._count.reviews
    const avg =
      reviewCount > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : null
    const resolvedPrice = product.variants.length
      ? Math.min(...product.variants.map((variant) => variant.price ?? product.price))
      : product.price
    const resolvedComparePrice = product.variants.length
      ? Math.max(...product.variants.map((variant) => variant.comparePrice ?? product.comparePrice ?? 0)) || product.comparePrice
      : product.comparePrice
    const resolvedStock = product.variants.length
      ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
      : product.stock

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: resolvedPrice,
      comparePrice: resolvedComparePrice,
      stock: resolvedStock,
      images: product.images,
      tags: metaMap.get(product.id)?.tags ?? [],
      productType: metaMap.get(product.id)?.catalog?.productType ?? 'PHYSICAL',
      listingType: metaMap.get(product.id)?.catalog?.listingType ?? 'FOR_SALE',
      detailsLanguage: metaMap.get(product.id)?.catalog?.detailsLanguage ?? 'English',
      customAttributes: metaMap.get(product.id)?.customAttributes ?? [],
      unitPricing: normalizeUnitPricing(metaMap.get(product.id)?.unitPricing),
      requiredProducts: requiredProductsMap.get(product.id) ?? [],
      store: product.store,
      category: product.category,
      hasVariants: product.variants.length > 0,
      reviewCount,
      averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
    }
  })

  const filtered = mapped.filter((product) => {
    if (input.minPrice != null && product.price < input.minPrice) return false
    if (input.maxPrice != null && product.price > input.maxPrice) return false
    if (input.inStock && product.stock < 1) return false
    if (input.minRating != null && (product.averageRating ?? 0) < input.minRating) return false
    if (normalizedTag && !product.tags.some((tag) => tag.toLowerCase() === normalizedTag)) {
      return false
    }
    return true
  })

  const visibleProducts = input.viewer ? await filterProductsByAccess(filtered, input.viewer) : filtered
  const total = visibleProducts.length
  const paged = visibleProducts.slice(offset, offset + limit)
  const facetTags = Array.from(
    visibleProducts.reduce((map, product) => {
      for (const tag of product.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1)
      }
      return map
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }))

  const facetStores = Array.from(
    visibleProducts.reduce((map, product) => {
      const key = product.store.slug
      const current = map.get(key) ?? { name: product.store.name, slug: product.store.slug, count: 0 }
      current.count += 1
      map.set(key, current)
      return map
    }, new Map<string, { name: string; slug: string; count: number }>())
  )
    .map(([, store]) => store)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 6)

  const facetPriceRange = visibleProducts.length > 0
    ? {
        min: Math.min(...visibleProducts.map((product) => product.price)),
        max: Math.max(...visibleProducts.map((product) => product.price)),
      }
    : null

  return {
    products: paged,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      tags: facetTags,
      stores: facetStores,
      priceRange: facetPriceRange,
    },
  }
}
