import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProductThumb from '@/components/ProductThumb'
import AddToCartButton from '@/components/store/AddToCartButton'
import CompareButton from '@/components/store/CompareButton'
import CompareTray from '@/components/store/CompareTray'
import SaveSearchButton from '@/components/store/SaveSearchButton'
import WishlistButton from '@/components/store/WishlistButton'
import { getCatalogAccessDecision, getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { buildSeoMetadata } from '@/lib/helpers/seo'
import { getMatchingBannerCards, getMatchingCampaigns, getMatchingIntentPresets, getMatchingSearchPromotions, parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { formatUnitPricing } from '@/lib/helpers/unitPricing'
import { getCategorySpotlightStores, getStorefrontCategories, getStorefrontProductList } from '@/lib/queries/storefront'
import { prisma } from '@/lib/prisma'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

type ProductsPageProps = {
  searchParams?: {
    search?: string
    category?: string
    tag?: string
    sort?: 'default' | 'price-low' | 'price-high' | 'newest'
    minPrice?: string
    maxPrice?: string
    inStock?: string
    minRating?: string
    page?: string
  }
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const search = searchParams?.search?.trim() || ''
  const category = searchParams?.category?.trim() || ''
  const tag = searchParams?.tag?.trim() || ''
  const minRating = searchParams?.minRating?.trim() || ''
  const titleParts = ['Products']

  if (category) titleParts.push(category)
  if (tag) titleParts.push(`tag ${tag}`)
  if (search) titleParts.push(`search ${search}`)

  const descriptionParts = ['Browse approved marketplace products on Buyzilo.']
  if (category) descriptionParts.push(`Category filter: ${category}.`)
  if (tag) descriptionParts.push(`Tagged with ${tag}.`)
  if (minRating) descriptionParts.push(`Minimum rating ${minRating} stars.`)

  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (searchParams?.sort && searchParams.sort !== 'default') params.set('sort', searchParams.sort)
  if (searchParams?.minPrice) params.set('minPrice', searchParams.minPrice)
  if (searchParams?.maxPrice) params.set('maxPrice', searchParams.maxPrice)
  if (searchParams?.inStock === 'true') params.set('inStock', 'true')
  if (minRating) params.set('minRating', minRating)
  if (searchParams?.page && searchParams.page !== '1') params.set('page', searchParams.page)

  return buildSeoMetadata({
    title: `${titleParts.join(' | ')} | Buyzilo`,
    description: descriptionParts.join(' '),
    path: `/products${params.toString() ? `?${params.toString()}` : ''}`,
    keywords: [category, tag, search, 'products', 'marketplace'].filter(Boolean),
  })
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const viewer = await getSessionAccessViewerContext()
  const page = Number(searchParams?.page ?? '1')
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1
  const search = searchParams?.search?.trim() || undefined
  const category = searchParams?.category?.trim() || undefined
  const tag = searchParams?.tag?.trim() || undefined
  const sort = searchParams?.sort ?? 'default'
  const minPrice = searchParams?.minPrice ? Number(searchParams.minPrice) : undefined
  const maxPrice = searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined
  const inStock = searchParams?.inStock === 'true'
  const minRating = searchParams?.minRating ? Number(searchParams.minRating) : undefined

  const catalogAccess = await getCatalogAccessDecision(viewer, category)
  if (!catalogAccess.allowed) {
    redirect(viewer.isAuthenticated ? '/unauthorized' : `/login?next=${encodeURIComponent(`/products${category ? `?category=${category}` : ''}`)}`)
  }

  const [categories, result, selectedCategoryRecord, categorySpotlightStores] = await Promise.all([
    getStorefrontCategories(20, viewer),
    getStorefrontProductList({
      search,
      category,
      tag,
      sort,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      inStock,
      minRating: Number.isFinite(minRating) ? minRating : undefined,
      page: currentPage,
      limit: 24,
      viewer,
    }),
    category
      ? prisma.category.findUnique({
          where: { slug: category },
          include: {
            children: {
              select: { id: true, name: true, slug: true, image: true },
              orderBy: { name: 'asc' },
            },
            products: {
              where: { isActive: true, approvalStatus: 'APPROVED', store: { status: 'APPROVED' } },
              take: 4,
              orderBy: { createdAt: 'desc' },
              select: { id: true, name: true, slug: true, images: true, price: true },
            },
          },
        })
      : Promise.resolve(null),
    category ? getCategorySpotlightStores(category, 3, viewer) : Promise.resolve([]),
  ])
  const storefrontConfig = parseStorefrontConfig(
    (await prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }))?.value,
  )
  const matchedSearchPromotions = getMatchingSearchPromotions(search, storefrontConfig.searchPromotions)
  const matchedSearchBanners = getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'search', search, category }).slice(0, 2)
  const matchedSearchCampaigns = getMatchingCampaigns(storefrontConfig.campaigns, {
    page: 'search',
    search,
    category,
  })
  const searchIntentPresets = getMatchingIntentPresets(storefrontConfig.intentPresets, 'search')
  const categoryHeroTitle = selectedCategoryRecord
    ? storefrontConfig.templates.categoryHeroTitle.replaceAll('{category}', selectedCategoryRecord.name)
    : storefrontConfig.templates.catalogHeroTitle
  const categoryHeroSubtitle = selectedCategoryRecord
    ? storefrontConfig.templates.categoryHeroSubtitle.replaceAll('{category}', selectedCategoryRecord.name)
    : storefrontConfig.templates.catalogHeroSubtitle

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] px-6 py-8 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Catalog</p>
              <h1 className="mt-2 text-3xl font-black lg:text-5xl">{categoryHeroTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80 lg:text-base">{categoryHeroSubtitle}</p>
              <p className="mt-4 text-sm font-semibold text-white/80">{result.total} products found</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {matchedSearchBanners.map((banner, index) => (
                <Link key={`${banner.title}-${index}`} href={banner.href} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-black text-white">{banner.title}</p>
                  <p className="mt-2 text-sm text-white/75">{banner.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {selectedCategoryRecord && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Category Spotlight</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedCategoryRecord.name}</h2>
              <p className="mt-2 text-sm text-slate-500">Use this landing layer to route buyers deeper into the category instead of only showing a plain filtered grid.</p>
              {selectedCategoryRecord.children.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCategoryRecord.children.map((child) => (
                    <Link key={child.id} href={`/products?category=${child.slug}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fresh in {selectedCategoryRecord.name}</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {selectedCategoryRecord.products.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-2">
                    <div className="h-20">
                      <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full rounded-lg object-cover" />
                    </div>
                  </Link>
                ))}
                {selectedCategoryRecord.products.length === 0 && (
                  <p className="col-span-4 text-sm text-slate-500">No featured products in this category yet.</p>
                )}
              </div>
            </article>
          </section>
        )}

        {matchedSearchPromotions.length > 0 && (
          <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Search Promotions</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Promoted routes for &quot;{search}&quot;</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {matchedSearchPromotions.slice(0, 3).map((promotion) => (
                <Link
                  key={`${promotion.query}-${promotion.href}`}
                  href={promotion.href}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
                >
                  <p className="text-sm font-black text-slate-900">{promotion.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{promotion.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {matchedSearchCampaigns.length > 0 && (
          <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Campaign Placements</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Campaigns matched to this discovery context</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {matchedSearchCampaigns.slice(0, 3).map((campaign) => (
                <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{campaign.eyebrow}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{campaign.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {searchIntentPresets.length > 0 && (
          <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Buyer Intent Presets</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Curated routes for different shopping modes</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {searchIntentPresets.slice(0, 3).map((preset) => (
                <Link key={preset.slug} href={preset.href} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="text-sm font-black text-slate-900">{preset.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{preset.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {selectedCategoryRecord && categorySpotlightStores.length > 0 && (
          <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Top Stores In {selectedCategoryRecord.name}
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Cross-shop the strongest stores in this category</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {categorySpotlightStores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <ProductThumb src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{store.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{store.productCount} products in this category</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-500">
                    {store.description?.trim() || 'Browse this approved storefront for more category-specific assortment depth.'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(search || category || tag || minPrice != null || maxPrice != null || inStock || minRating != null) && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">Current search</p>
              <p className="text-xs text-slate-500">
                {search ? `Query: "${search}"` : 'Catalog filter'}
                {category ? ` | Category: ${category}` : ''}
                {tag ? ` | Tag: ${tag}` : ''}
                {minPrice != null ? ` | Min $${minPrice}` : ''}
                {maxPrice != null ? ` | Max $${maxPrice}` : ''}
                {inStock ? ' | In stock only' : ''}
                {minRating != null ? ` | ${minRating}+ stars` : ''}
                {sort !== 'default' ? ` | Sort: ${sort}` : ''}
              </p>
            </div>
            <SaveSearchButton
              label={search || category || tag || 'Filter preset'}
              search={search}
              category={category}
              tag={tag}
              sort={sort}
              minPrice={Number.isFinite(minPrice) ? minPrice : undefined}
              maxPrice={Number.isFinite(maxPrice) ? maxPrice : undefined}
              inStock={inStock}
              minRating={Number.isFinite(minRating) ? minRating : undefined}
            />
          </div>
        )}

        <form method="GET" className="mb-6 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4 xl:grid-cols-8">
          <input
            type="search"
            name="search"
            defaultValue={search ?? ''}
            placeholder="Search products..."
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="category"
            defaultValue={category ?? ''}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="tag"
            defaultValue={tag ?? ''}
            placeholder="Tag"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="default">Newest</option>
            <option value="price-low">Price: Low to high</option>
            <option value="price-high">Price: High to low</option>
            <option value="newest">Recently added</option>
          </select>
          <input
            type="number"
            name="minPrice"
            min="0"
            step="0.01"
            defaultValue={minPrice ?? ''}
            placeholder="Min price"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="number"
            name="maxPrice"
            min="0"
            step="0.01"
            defaultValue={maxPrice ?? ''}
            placeholder="Max price"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            name="minRating"
            defaultValue={minRating != null ? String(minRating) : ''}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Any rating</option>
            <option value="4">4 stars & up</option>
            <option value="3">3 stars & up</option>
            <option value="2">2 stars & up</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" name="inStock" value="true" defaultChecked={inStock} />
            In stock only
          </label>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 xl:col-span-8"
          >
            Apply filters
          </button>
        </form>

        {(result.facets?.tags?.length || result.facets?.stores?.length || result.facets?.priceRange) && (
          <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tag Discovery</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.facets.tags.map((item) => (
                  <Link
                    key={item.tag}
                    href={`/products?${new URLSearchParams({
                      ...(search ? { search } : {}),
                      ...(category ? { category } : {}),
                      tag: item.tag,
                    }).toString()}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {item.tag} ({item.count})
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Store Discovery</p>
              <div className="mt-4 space-y-2">
                {result.facets.stores.map((store) => (
                  <Link key={store.slug} href={`/store/${store.slug}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm hover:bg-slate-100">
                    <span className="font-semibold text-slate-800">{store.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{store.count} products</span>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price Range</p>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-950">
                  {result.facets.priceRange ? `${formatCurrency(result.facets.priceRange.min)} - ${formatCurrency(result.facets.priceRange.max)}` : 'N/A'}
                </p>
                <p className="mt-2 text-sm text-slate-500">Current filtered catalog spread.</p>
              </div>
            </article>
          </section>
        )}

        {storefrontConfig.discoveryRoutes.length > 0 && (
          <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Discovery Routes</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Jump into curated navigation paths</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              {storefrontConfig.discoveryRoutes.slice(0, 4).map((route) => (
                <Link key={`${route.title}-${route.href}`} href={route.href} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="text-sm font-black text-slate-900">{route.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{route.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {result.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-sm text-slate-500">
            No products found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {result.products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {(() => {
                  const unitPricing = formatUnitPricing(product.price, product.unitPricing)
                  return (
                    <>
                      <Link href={`/products/${product.slug}`} className="block bg-slate-50 p-4">
                        <div className="flex h-40 items-center justify-center">
                          <ProductThumb
                            src={product.images?.[0]}
                            alt={product.name}
                            className="h-full w-full rounded-lg object-contain"
                          />
                        </div>
                      </Link>
                      <div className="space-y-2 p-4">
                        <Link href={`/store/${product.store.slug}`} className="text-xs font-medium text-blue-600 hover:underline">
                          {product.store.name}
                        </Link>
                        <Link href={`/products/${product.slug}`}>
                          <h2 className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-600">
                            {product.name}
                          </h2>
                        </Link>
                        {product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {product.tags.slice(0, 3).map((item) => (
                              <Link
                                key={`${product.id}-${item}`}
                                href={`/products?tag=${encodeURIComponent(item)}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                              >
                                {item}
                              </Link>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(product.price)}</p>
                          {product.comparePrice != null && product.comparePrice > product.price && (
                            <p className="text-xs text-slate-400 line-through">{formatCurrency(product.comparePrice)}</p>
                          )}
                        </div>
                        {unitPricing && (
                          <p className="text-xs font-semibold text-slate-500">
                            {formatCurrency(unitPricing.unitPrice)} per {unitPricing.label}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            {product.averageRating != null ? `${product.averageRating}/5 | ` : ''}
                            {product.reviewCount} reviews
                          </p>
                          <div className="flex items-center gap-2">
                            <CompareButton productId={product.id} productName={product.name} />
                            <WishlistButton productId={product.id} productName={product.name} />
                            {product.requiredProducts.length > 0 ? (
                              <Link
                                href={`/products/${product.slug}`}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                              >
                                View requirements
                              </Link>
                            ) : product.hasVariants ? (
                              <Link
                                href={`/products/${product.slug}`}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                              >
                                Choose options
                              </Link>
                            ) : (
                              <AddToCartButton
                                productId={product.id}
                                productName={product.name}
                                productPrice={product.price}
                                productImage={product.images?.[0]}
                                storeName={product.store.name}
                                unitPricing={product.unitPricing}
                                productCategory={product.category.name}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </article>
            ))}
          </div>
        )}

        <CompareTray />

        {result.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: result.totalPages }).map((_, idx) => {
              const pageNumber = idx + 1
              const params = new URLSearchParams()
              if (search) params.set('search', search)
              if (category) params.set('category', category)
              if (tag) params.set('tag', tag)
              if (sort && sort !== 'default') params.set('sort', sort)
              if (minPrice != null) params.set('minPrice', String(minPrice))
              if (maxPrice != null) params.set('maxPrice', String(maxPrice))
              if (inStock) params.set('inStock', 'true')
              if (minRating != null) params.set('minRating', String(minRating))
              params.set('page', String(pageNumber))

              return (
                <Link
                  key={pageNumber}
                  href={`/products?${params.toString()}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    pageNumber === result.page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
