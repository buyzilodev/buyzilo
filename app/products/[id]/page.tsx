import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import FacebookPixelViewContent from '@/components/marketing/FacebookPixelViewContent'
import ProductGallery from '@/components/store/ProductGallery'
import BundleOffers from '@/components/store/BundleOffers'
import CompareButton from '@/components/store/CompareButton'
import { ProductDiscussionPanel } from '@/components/store/ProductDiscussionPanel'
import ProductPurchasePanel from '@/components/store/ProductPurchasePanel'
import RecentlyViewedProducts from '@/components/store/RecentlyViewedProducts'
import RecentlyViewedTracker from '@/components/store/RecentlyViewedTracker'
import ProductThumb from '@/components/ProductThumb'
import { getProductAccessDecision, getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { getBundlesForProduct } from '@/lib/actions/bundles'
import { getRequiredProductsMap } from '@/lib/actions/requiredProducts'
import { parseProductMeta } from '@/lib/helpers/productMeta'
import { buildSeoMetadata, stripHtml, toKeywords } from '@/lib/helpers/seo'
import { getMatchingBannerCards, getMatchingCampaigns, parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { formatUnitPricing, normalizeUnitPricing } from '@/lib/helpers/unitPricing'
import { getCustomersAlsoBoughtProducts } from '@/lib/queries/customersAlsoBought'
import { getCategorySpotlightStores, getProductByIdOrSlug } from '@/lib/queries/storefront'
import { prisma } from '@/lib/prisma'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await getProductByIdOrSlug(id)
  if (!product) {
    return buildSeoMetadata({
      title: 'Product Not Found | Buyzilo',
      description: 'The requested product could not be found.',
      path: `/products/${id}`,
      noIndex: true,
    })
  }

  const metaSetting = await prisma.siteSettings.findUnique({ where: { key: `productMeta:${product.id}` } })
  const meta = parseProductMeta(metaSetting?.value)
  const seo = meta.seo ?? {}
  const title = seo.pageTitle?.trim() || seo.seoName?.trim() || `${product.name} | ${product.store.name} | Buyzilo`
  const description =
    seo.metaDescription?.trim() ||
    meta.shortDescription?.trim() ||
    stripHtml(product.description || '').slice(0, 160) ||
    `Shop ${product.name} from ${product.store.name} on Buyzilo.`

  return buildSeoMetadata({
    title,
    description,
    path: `/products/${product.slug}`,
    image: Array.isArray(product.images) ? String(product.images[0] || '') : null,
    keywords: [
      ...toKeywords(seo.metaKeywords),
      product.category.name,
      product.store.name,
      ...(meta.tags ?? []),
    ].filter(Boolean),
  })
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getSessionAccessViewerContext()
  const product = await getProductByIdOrSlug(id, viewer)

  if (!product) notFound()

  const productAccess = await getProductAccessDecision(viewer, {
    productSlug: product.slug,
    categorySlug: product.category.slug,
  })
  if (!productAccess.allowed) {
    redirect(viewer.isAuthenticated ? '/unauthorized' : `/login?next=${encodeURIComponent(`/products/${product.slug}`)}`)
  }

  const [metaSetting, relatedRaw, customersAlsoBought, productBundles, requiredProductsMap, storefrontConfig, categorySpotlightStores, productDiscussion] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: `productMeta:${product.id}` } }),
    prisma.product.findMany({
      where: {
        id: { not: product.id },
        categoryId: product.category.id,
        isActive: true,
        approvalStatus: 'APPROVED',
        store: { status: 'APPROVED' },
      },
      include: {
        store: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    getCustomersAlsoBoughtProducts(product.id, 6),
    getBundlesForProduct(product.id),
    getRequiredProductsMap([product.id]),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
    getCategorySpotlightStores(product.category.slug, 3, viewer),
    prisma.productDiscussion.findMany({
      where: { productId: product.id, parentId: null, status: 'APPROVED' },
      include: {
        user: { select: { name: true, email: true, role: true } },
        replies: {
          where: { status: 'APPROVED' },
          include: { user: { select: { name: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ])

  const meta = parseProductMeta(metaSetting?.value)
  const productType = meta.catalog?.productType ?? 'PHYSICAL'
  const listingType = meta.catalog?.listingType ?? 'FOR_SALE'
  const detailsLanguage = meta.catalog?.detailsLanguage ?? 'English'
  const requiredProducts = requiredProductsMap.get(product.id) ?? []
  const unitPricing = normalizeUnitPricing(meta.unitPricing)
  const attachments = (meta.attachments ?? []).filter((attachment) => attachment?.name && attachment?.url)
  const customAttributes = (meta.customAttributes ?? []).filter((attribute) => attribute?.name && Array.isArray(attribute.values) && attribute.values.length > 0)

  const relatedProducts = relatedRaw.map((item) => ({
    ...item,
    reviewCount: item._count.reviews,
    averageRating: item._count.reviews
      ? Math.round((item.reviews.reduce((sum, review) => sum + review.rating, 0) / item._count.reviews) * 10) / 10
      : null,
  }))

  const averageRating = product.reviews.length
    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
    : 0
  const stars = Math.round(averageRating)
  const defaultVariant = product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null
  const displayPrice = defaultVariant?.price ?? product.price
  const displayComparePrice = defaultVariant?.comparePrice ?? product.comparePrice
  const displayStock = defaultVariant?.stock ?? product.stock
  const displayUnitPricing = formatUnitPricing(displayPrice, unitPricing)

  const bundleItems = [product, ...relatedProducts.slice(0, 2)]
  const bundleTotal = bundleItems.reduce((sum, item) => sum + item.price, 0)
  const productBanners = getMatchingBannerCards(storefrontConfig.bannerCards, {
    page: 'product',
    category: product.category.slug,
  }).slice(0, 2)
  const productCampaigns = getMatchingCampaigns(storefrontConfig.campaigns, {
    page: 'product',
    category: product.category.slug,
  })

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      <RecentlyViewedTracker productId={product.id} />
      <FacebookPixelViewContent
        productId={product.id}
        productName={product.name}
        categoryName={product.category.name}
        price={displayPrice}
      />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1380px] items-center gap-2 px-3 py-2 text-xs text-slate-500 md:px-4">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-slate-700">Catalog</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category.slug}`} className="hover:text-slate-700">{product.category.name}</Link>
          <span>/</span>
          <span className="line-clamp-1 text-slate-700">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] space-y-6 px-3 py-4 md:px-4">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] px-6 py-6 text-white shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{storefrontConfig.templates.productHeroTitle}</p>
              <h2 className="mt-2 text-3xl font-black">{product.name}</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/80">{meta.shortDescription || storefrontConfig.templates.productHeroSubtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {productBanners.map((banner, index) => (
                  <Link key={`${banner.title}-${index}`} href={banner.href} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                    {banner.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {productCampaigns.slice(0, 2).map((campaign) => (
                <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{campaign.eyebrow}</p>
                  <p className="mt-2 text-lg font-black text-white">{campaign.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/75">{campaign.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 lg:col-span-2">
            <ProductGallery name={product.name} images={product.images} />
          </section>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h1 className="text-2xl font-black text-slate-900">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-amber-500">{'\u2605'.repeat(stars)}{'\u2606'.repeat(Math.max(0, 5 - stars))}</span>
                <span className="text-slate-500">{product.reviews.length} reviews</span>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <p className="text-4xl font-black text-slate-900">{formatCurrency(displayPrice)}</p>
                {displayComparePrice != null && displayComparePrice > displayPrice && (
                  <p className="pb-1 text-sm text-slate-400 line-through">{formatCurrency(displayComparePrice)}</p>
                )}
              </div>
              {displayUnitPricing && (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatCurrency(displayUnitPricing.unitPrice)} per {displayUnitPricing.label}
                </p>
              )}
              <p className={`mt-1 text-sm font-semibold ${displayStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {displayStock > 0 ? 'In stock' : 'Out of stock'}
              </p>

              {meta.promoText && (
                <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{meta.promoText}</p>
              )}

              <div className="mt-3">
                <CompareButton productId={product.id} productName={product.name} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" />
              </div>

              <div className="mt-4">
                <ProductPurchasePanel
                  productId={product.id}
                  productName={product.name}
                  productPrice={product.price}
                  comparePrice={product.comparePrice}
                  productImage={product.images?.[0]}
                  storeName={product.store.name}
                  productCategory={product.category.name}
                  stock={product.stock}
                  productType={productType}
                  listingType={listingType}
                  unitPricing={unitPricing}
                  customAttributes={customAttributes}
                  options={product.options}
                  variants={product.variants.map((variant) => ({
                    id: variant.id,
                    title: variant.title,
                    price: variant.price,
                    comparePrice: variant.comparePrice,
                    stock: variant.stock,
                    image: variant.image,
                    isDefault: variant.isDefault,
                    selectedOptions: variant.selectedOptions as Record<string, string>,
                  }))}
                />
              </div>

              {meta.quantityDiscounts && meta.quantityDiscounts.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="mb-2 font-semibold text-slate-700">Quantity discounts</p>
                  <div className="space-y-1 text-slate-600">
                    {meta.quantityDiscounts
                      .filter((discount) => discount.quantity > 0 && discount.value > 0)
                      .map((discount, index) => (
                        <p key={`${discount.quantity}-${index}`}>
                          Buy {discount.quantity}+ : {discount.type === 'PERCENT' ? `${discount.value}% off` : `${formatCurrency(discount.value)} off`}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <Link href={`/store/${product.store.slug}`} className="text-sm font-bold text-blue-700 hover:underline">{product.store.name}</Link>
              <p className="mt-1 text-xs text-slate-500">{product.store.description ?? 'Vendor storefront in Buyzilo marketplace.'}</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  Category: {product.category.name}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  Store URL: /store/{product.store.slug}
                </div>
              </div>
            </section>

            {meta.tags && meta.tags.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {meta.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/products?tag=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {requiredProducts.length > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Required products</h3>
                <p className="mb-3 text-xs text-slate-600">
                  This product requires the following items to be in your cart before checkout.
                </p>
                <div className="space-y-2">
                  {requiredProducts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${item.slug}`}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm hover:border-amber-300"
                    >
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="text-xs font-semibold text-amber-700">
                        {item.hasVariants ? 'Choose options' : 'View product'}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>

        {productBundles.length > 0 && <BundleOffers bundles={productBundles} />}

        {bundleItems.length >= 2 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-2xl font-black text-slate-900">Together Cheaper</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {bundleItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="h-28">
                    <ProductThumb src={item.images?.[0]} alt={item.name} className="h-full w-full rounded-lg object-contain" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(item.price)}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Bundle total: {formatCurrency(bundleTotal)}</p>
          </section>
        )}

        {customersAlsoBought.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-2xl font-black text-slate-900">Customers also bought</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {customersAlsoBought.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-2">
                  <Link href={`/products/${item.slug}`} className="block rounded-lg bg-slate-50 p-2">
                    <div className="flex h-24 items-center justify-center">
                      <ProductThumb src={item.images?.[0]} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(item.price)}</p>
                  <p className="text-[11px] font-semibold text-emerald-600">Bought together {item.coPurchaseCount} times</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {categorySpotlightStores.filter((store) => store.slug !== product.store.slug).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-2xl font-black text-slate-900">Explore more stores in {product.category.name}</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {categorySpotlightStores
                .filter((store) => store.slug !== product.store.slug)
                .map((store) => (
                  <Link key={store.id} href={`/store/${store.slug}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <ProductThumb src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{store.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{store.productCount} products in this category</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {store.description?.trim() || 'Browse more assortment depth from this approved marketplace store.'}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-2xl font-black text-slate-900">Features</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Category</span><span className="font-semibold">{product.category.name}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Brand / Store</span><span className="font-semibold">{product.store.name}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Product type</span><span className="font-semibold">{productType === 'DIGITAL' ? 'Digital' : 'Physical'}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Listing type</span><span className="font-semibold">{listingType.replaceAll('_', ' ')}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Details language</span><span className="font-semibold">{detailsLanguage}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Stock</span><span className="font-semibold">{product.stock}</span></div>
            <div className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"><span>Status</span><span className="font-semibold">{product.isActive ? 'Active' : 'Disabled'}</span></div>
          </div>
        </section>

        {customAttributes.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-2xl font-black text-slate-900">Attributes</h2>
            <div className="mt-4 space-y-4">
              {customAttributes.map((attribute) => (
                <article key={attribute.name} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">{attribute.name}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {attribute.values.map((value) => (
                      <div key={`${attribute.name}-${value.label}-${value.value}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                        {value.image ? (
                          <div className="mb-2 h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <ProductThumb src={value.image} alt={value.label} className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <p className="font-semibold text-slate-900">{value.label}</p>
                        <p className="text-slate-600">{value.value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(meta.shortDescription || product.description) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-2xl font-black text-slate-900">Description</h2>
            {meta.shortDescription && <p className="mt-2 text-sm text-slate-600">{meta.shortDescription}</p>}
            {product.description && (
              <div className="prose mt-3 max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: product.description }} />
            )}
          </section>
        )}

        {attachments.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-2xl font-black text-slate-900">Attachments</h2>
            <div className="mt-4 space-y-2">
              {attachments.map((attachment) => (
                <a
                  key={`${attachment.url}-${attachment.name}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>{attachment.name}</span>
                  <span className="font-semibold text-blue-600">Download</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <ProductDiscussionPanel
          productId={product.id}
          productSlug={product.slug}
          storeVendorId={product.store.vendorId}
          initialReviews={product.reviews}
          initialDiscussion={productDiscussion}
        />

        {relatedProducts.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-2xl font-black text-slate-900">Similar products</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {relatedProducts.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-2">
                  <Link href={`/products/${item.slug}`} className="block rounded-lg bg-slate-50 p-2">
                    <div className="flex h-24 items-center justify-center">
                      <ProductThumb src={item.images?.[0]} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(item.price)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <RecentlyViewedProducts currentProductId={product.id} />
      </div>
    </div>
  )
}
