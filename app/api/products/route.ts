import { NextResponse } from 'next/server'
import { filterProductsByAccess, getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { getProductMetaMap } from '@/lib/helpers/productMeta'
import { getRequiredProductsMap } from '@/lib/actions/requiredProducts'
import { normalizeUnitPricing } from '@/lib/helpers/unitPricing'
import { prisma } from '@/lib/prisma'
import { productListQuerySchema } from '@/lib/validators/product'

export async function GET(req: Request) {
  try {
    const viewer = await getSessionAccessViewerContext()
    const { searchParams } = new URL(req.url)
    const ids = (searchParams.get('ids') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (ids.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: ids.slice(0, 12) },
          isActive: true,
          approvalStatus: 'APPROVED',
          store: { status: 'APPROVED' },
        },
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

      const metaMap = await getProductMetaMap(products.map((product) => product.id))
      const requiredProductsMap = await getRequiredProductsMap(products.map((product) => product.id))

      const visibleProducts = await filterProductsByAccess(products, viewer)
      const ordered = ids
        .map((id) => visibleProducts.find((product) => product.id === id))
        .filter(Boolean)
        .map((p) => {
          const product = p!
          const revs = product.reviews
          const avgRating =
            revs.length > 0
              ? revs.reduce((s, r) => s + r.rating, 0) / revs.length
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
            stock: product.stock,
            images: product.images,
            tags: metaMap.get(product.id)?.tags ?? [],
            unitPricing: normalizeUnitPricing(metaMap.get(product.id)?.unitPricing),
            requiredProducts: requiredProductsMap.get(product.id) ?? [],
            store: product.store,
            category: product.category,
            createdAt: product.createdAt,
            reviewCount: product._count.reviews,
            averageRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
            hasVariants: product.variants.length > 0,
          }
        })

      return NextResponse.json({
        products: ordered,
        total: ordered.length,
        limit: ordered.length,
        offset: 0,
      })
    }

    const parsed = productListQuerySchema.safeParse({
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      minPrice: searchParams.get('minPrice') ?? undefined,
      maxPrice: searchParams.get('maxPrice') ?? undefined,
      inStock: searchParams.get('inStock') ?? undefined,
      minRating: searchParams.get('minRating') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    const categorySlug = parsed.data.category
    const search = parsed.data.search
    const tag = parsed.data.tag?.trim() || undefined
    const sort = parsed.data.sort ?? 'default'
    const minPrice = parsed.data.minPrice
    const maxPrice = parsed.data.maxPrice
    const inStock = parsed.data.inStock
    const minRating = parsed.data.minRating
    const limit = parsed.data.limit ?? 48
    const offset = parsed.data.offset ?? 0

    const where: {
      isActive: boolean
      approvalStatus: string
      store?: { status: 'APPROVED' }
      category?: { slug: string }
      OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>
    } = {
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    }

    if (categorySlug) {
      where.category = { slug: categorySlug }
    }

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const orderBy: Record<string, string> =
      sort === 'price-low'
        ? { price: 'asc' }
        : sort === 'price-high'
          ? { price: 'desc' }
          : sort === 'newest'
            ? { createdAt: 'desc' }
            : { createdAt: 'desc' }

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

    const withRating = products.map((p) => {
      const revs = p.reviews
      const avgRating =
        revs.length > 0
          ? revs.reduce((s, r) => s + r.rating, 0) / revs.length
          : null
      const resolvedPrice = p.variants.length
        ? Math.min(...p.variants.map((variant) => variant.price ?? p.price))
        : p.price
      const resolvedComparePrice = p.variants.length
        ? Math.max(...p.variants.map((variant) => variant.comparePrice ?? p.comparePrice ?? 0)) || p.comparePrice
        : p.comparePrice
      const resolvedStock = p.variants.length
        ? p.variants.reduce((sum, variant) => sum + variant.stock, 0)
        : p.stock
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: resolvedPrice,
        comparePrice: resolvedComparePrice,
        stock: resolvedStock,
        images: p.images,
        tags: metaMap.get(p.id)?.tags ?? [],
        unitPricing: normalizeUnitPricing(metaMap.get(p.id)?.unitPricing),
        requiredProducts: requiredProductsMap.get(p.id) ?? [],
        store: p.store,
        category: p.category,
        createdAt: p.createdAt,
        reviewCount: p._count.reviews,
        averageRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
        hasVariants: p.variants.length > 0,
      }
    })

    const filtered = withRating.filter((product) => {
      if (minPrice != null && product.price < minPrice) return false
      if (maxPrice != null && product.price > maxPrice) return false
      if (inStock && product.stock < 1) return false
      if (minRating != null && (product.averageRating ?? 0) < minRating) return false
      if (tag && !product.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return false
      return true
    })

    const visibleProducts = await filterProductsByAccess(filtered, viewer)
    const paged = visibleProducts.slice(offset, offset + limit)

    return NextResponse.json({
      products: paged,
      total: visibleProducts.length,
      limit,
      offset,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
