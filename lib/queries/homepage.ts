import { prisma } from '@/lib/prisma'
import { type AccessViewerContext, filterProductsByAccess, filterStoresByAccess } from '@/lib/actions/accessRestrictions'
import type { HomepageSectionConfig } from '@/lib/helpers/homepageConfig'
import { getBestsellerProducts } from '@/lib/queries/bestsellers'
import { getStorefrontCategories } from '@/lib/queries/storefront'

type RawProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number]

async function mapStorefrontProducts(products: RawProduct[]) {
  const hydrated = await prisma.product.findMany({
    where: { id: { in: products.map((product) => product.id) } },
    include: {
      store: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { isActive: true },
        select: { price: true, comparePrice: true, stock: true },
      },
      reviews: { select: { rating: true } },
      _count: { select: { reviews: true } },
    },
  })

  const order = new Map(products.map((product, index) => [product.id, index]))

  return hydrated
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
    .map((product) => {
      const reviewCount = product._count.reviews
      const averageRating =
        reviewCount > 0
          ? Math.round((product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
          : null
      const variantPrices = product.variants.map((variant) => variant.price ?? product.price)
      const variantCompare = product.variants.map((variant) => variant.comparePrice ?? product.comparePrice ?? 0)
      const variantStock = product.variants.map((variant) => variant.stock)

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: variantPrices.length ? Math.min(...variantPrices) : product.price,
        comparePrice: variantCompare.length ? Math.max(...variantCompare) || product.comparePrice : product.comparePrice,
        stock: variantStock.length ? variantStock.reduce((sum, item) => sum + item, 0) : product.stock,
        images: product.images,
        store: product.store,
        category: product.category,
        reviewCount,
        averageRating,
      }
    })
}

function getCount(sections: HomepageSectionConfig[], id: HomepageSectionConfig['id'], fallback: number) {
  return sections.find((section) => section.id === id)?.count ?? fallback
}

export async function getHomepageCollections(sections: HomepageSectionConfig[], viewer?: AccessViewerContext) {
  const featuredCount = getCount(sections, 'featured', 8)
  const newArrivalsCount = getCount(sections, 'newArrivals', 8)
  const dealsCount = getCount(sections, 'deals', 8)
  const storesCount = getCount(sections, 'stores', 6)
  const editorialCount = getCount(sections, 'editorial', 3)
  const categoriesCount = getCount(sections, 'categories', 8)
  const bestsellerCount = getCount(sections, 'bestsellers', 8)

  const [categories, rawFeatured, rawNewArrivals, rawDeals, stores, blogPosts, bestsellers] = await Promise.all([
    getStorefrontCategories(categoriesCount, viewer),
    prisma.product.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED', store: { status: 'APPROVED' } },
      orderBy: [{ reviews: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: featuredCount,
    }),
    prisma.product.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED', store: { status: 'APPROVED' } },
      orderBy: { createdAt: 'desc' },
      take: newArrivalsCount,
    }),
    prisma.product.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED', store: { status: 'APPROVED' }, OR: [{ comparePrice: { not: null } }, { variants: { some: { comparePrice: { not: null }, isActive: true } } }] },
      orderBy: { updatedAt: 'desc' },
      take: dealsCount * 3,
    }),
    prisma.store.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ products: { _count: 'desc' } }, { updatedAt: 'desc' }],
      take: storesCount,
      include: {
        _count: { select: { products: true } },
        products: {
          where: { isActive: true, approvalStatus: 'APPROVED' },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, slug: true, images: true },
        },
      },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: editorialCount,
      include: {
        tags: {
          include: { tag: true },
          take: 3,
        },
      },
    }),
    getBestsellerProducts(bestsellerCount),
  ])

  const [featuredProductsRaw, newArrivalProductsRaw, dealCandidatesRaw] = await Promise.all([
    mapStorefrontProducts(rawFeatured),
    mapStorefrontProducts(rawNewArrivals),
    mapStorefrontProducts(rawDeals),
  ])

  const [featuredProducts, newArrivalProducts, dealCandidates, visibleStores, visibleBestsellers] = await Promise.all([
    viewer ? filterProductsByAccess(featuredProductsRaw, viewer) : featuredProductsRaw,
    viewer ? filterProductsByAccess(newArrivalProductsRaw, viewer) : newArrivalProductsRaw,
    viewer ? filterProductsByAccess(dealCandidatesRaw, viewer) : dealCandidatesRaw,
    viewer ? filterStoresByAccess(stores, viewer) : stores,
    viewer ? filterProductsByAccess(bestsellers, viewer) : bestsellers,
  ])

  const deals = dealCandidates
    .filter((product) => (product.comparePrice ?? 0) > product.price)
    .slice(0, dealsCount)

  return {
    categories,
    featuredProducts,
    bestsellers: visibleBestsellers,
    newArrivalProducts,
    deals,
    stores: await Promise.all(
      visibleStores.map(async (store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        productCount: store._count.products,
        products: viewer ? await filterProductsByAccess(store.products, viewer) : store.products,
      }))
    ),
    blogPosts: blogPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      tags: post.tags.map((item) => item.tag.name),
    })),
  }
}
