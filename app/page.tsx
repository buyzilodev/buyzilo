import type { ReactNode } from 'react'
import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'
import RecommendationRails from '@/components/store/RecommendationRails'
import { getActiveAddonExtensions } from '@/lib/addons/manager'
import { getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { brandingFromSettingsMap } from '@/lib/branding'
import { parseHomepageConfig, type HomepageHeroSlide, type HomepageSectionConfig } from '@/lib/helpers/homepageConfig'
import { prisma } from '@/lib/prisma'
import { getHomepageCollections } from '@/lib/queries/homepage'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function gradientFromSlide(slide: HomepageHeroSlide) {
  const from = slide.themeFrom ?? '#0f172a'
  const via = slide.themeVia ?? '#1d4ed8'
  const to = slide.themeTo ?? '#0f766e'
  return `linear-gradient(135deg, ${from} 0%, ${via} 52%, ${to} 100%)`
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Homepage Section</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
      </div>
      <Link href="/products" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        View catalog
      </Link>
    </div>
  )
}

function ProductRail({
  title,
  subtitle,
  products,
  meta,
}: {
  title: string
  subtitle: string
  products: Array<{
    id: string
    name: string
    slug: string
    price: number
    comparePrice?: number | null
    images: string[]
    stock: number
    unitsSold?: number
    store?: { name?: string | null } | null
  }>
  meta?: (product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice?: number | null
    images: string[]
    stock: number
    unitsSold?: number
    store?: { name?: string | null } | null
  }) => string | null
}) {
  if (products.length === 0) return null

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <article key={product.id} className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
            <Link href={`/products/${product.slug}`} className="block rounded-[1.25rem] bg-white p-4">
              <div className="flex h-44 items-center justify-center">
                <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
              </div>
            </Link>
            <div className="mt-4">
              <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-lg font-black text-slate-950">{formatCurrency(product.price)}</p>
                {product.comparePrice && product.comparePrice > product.price ? (
                  <p className="text-sm text-slate-400 line-through">{formatCurrency(product.comparePrice)}</p>
                ) : null}
              </div>
              <p className={`mt-1 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {product.stock > 0 ? 'In stock' : 'Out of stock'}
              </p>
              {meta ? <p className="mt-2 text-xs text-slate-500">{meta(product) ?? ''}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default async function HomePage() {
  const viewer = await getSessionAccessViewerContext()
  const rows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: ['homepageConfig', 'siteName', 'tagline', 'sellerCtaLabel', 'supportPhone', 'supportEmail', 'primaryColor', 'secondaryColor', 'footerText'],
      },
    },
  })
  const settingsMap: Record<string, string> = {}
  rows.forEach((row) => {
    settingsMap[row.key] = row.value
  })

  const branding = brandingFromSettingsMap(settingsMap)
  const homepageConfig = parseHomepageConfig(settingsMap.homepageConfig)
  const collections = await getHomepageCollections(homepageConfig.sections, viewer)
  const addonExtensions = await getActiveAddonExtensions({
    viewer: {
      isAuthenticated: viewer.isAuthenticated,
    },
  })
  const heroSlides = homepageConfig.heroSlides
  const trustCards = homepageConfig.featureCards

  const sectionById = new Map(homepageConfig.sections.map((section) => [section.id, section]))

  const sectionBlocks: Record<HomepageSectionConfig['id'], ReactNode> = {
    hero: heroSlides.length > 0 ? (
      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] text-white shadow-xl" style={{ background: gradientFromSlide(heroSlides[0]) }}>
          <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{heroSlides[0].eyebrow || branding.tagline}</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight lg:text-6xl">{heroSlides[0].title}</h1>
              <p className="mt-4 max-w-2xl text-base text-white/80">{heroSlides[0].subtitle}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={heroSlides[0].href || '/products'} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                  {heroSlides[0].ctaLabel || 'Shop now'}
                </Link>
                <Link href={heroSlides[0].secondaryHref || '/register'} className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white">
                  {heroSlides[0].secondaryLabel || branding.sellerCtaLabel}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/75">
                <span>{branding.supportPhone}</span>
                <span>{branding.supportEmail}</span>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="h-72 rounded-[1.25rem] bg-white/10 p-3">
                  <ProductThumb
                    src={heroSlides[0].image || collections.featuredProducts[0]?.images?.[0]}
                    alt={heroSlides[0].title}
                    className="h-full w-full rounded-[1rem] object-cover"
                  />
                </div>
              </div>
              {heroSlides.length > 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {heroSlides.slice(1, 3).map((slide, index) => (
                    <Link
                      key={`${slide.title}-${index}`}
                      href={slide.href || '/products'}
                      className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">{slide.eyebrow}</p>
                      <p className="mt-2 text-lg font-black text-white">{slide.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-white/75">{slide.subtitle}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Storefront Control</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Admin-driven merchandising</h2>
            <p className="mt-2 text-sm text-slate-500">
              Homepage sections, trust cards, hero campaigns, and storefront messaging now run from the admin panel.
            </p>
            <div className="mt-5 grid gap-3">
              <Link href="/products" className="rounded-[1.25rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                Shop marketplace
              </Link>
              <Link href="/stores" className="rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Browse stores
              </Link>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Brand Promise</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{branding.siteName}</h3>
            <p className="mt-2 text-sm text-slate-500">{branding.tagline}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {collections.categories.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/products?category=${category.slug}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {category.name}
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    ) : null,

    trustBar: trustCards.length > 0 ? (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trustCards.slice(0, sectionById.get('trustBar')?.count ?? 4).map((card, index) => (
          <article key={`${card.title}-${index}`} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-950">{card.title}</p>
            <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
          </article>
        ))}
      </section>
    ) : null,

    categories: (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader title={sectionById.get('categories')?.title || 'Shop by category'} subtitle={sectionById.get('categories')?.subtitle || ''} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {collections.categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.slug}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-slate-950">{category.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{category.productCount} products</p>
                </div>
                <div className="h-20 w-20 overflow-hidden rounded-[1rem] bg-white p-2">
                  <ProductThumb src={category.image || collections.featuredProducts[0]?.images?.[0]} alt={category.name} className="h-full w-full object-cover" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),

    featured: (
      <ProductRail
        title={sectionById.get('featured')?.title || 'Featured products'}
        subtitle={sectionById.get('featured')?.subtitle || ''}
        products={collections.featuredProducts}
        meta={(product) => product.store?.name ?? null}
      />
    ),

    bestsellers: (
      <ProductRail
        title={sectionById.get('bestsellers')?.title || 'Bestsellers'}
        subtitle={sectionById.get('bestsellers')?.subtitle || ''}
        products={collections.bestsellers}
        meta={(product) => (product.unitsSold ? `${product.unitsSold} sold recently` : null)}
      />
    ),

    newArrivals: (
      <ProductRail
        title={sectionById.get('newArrivals')?.title || 'New arrivals'}
        subtitle={sectionById.get('newArrivals')?.subtitle || ''}
        products={collections.newArrivalProducts}
        meta={(product) => product.store?.name ?? null}
      />
    ),

    deals: (
      <ProductRail
        title={sectionById.get('deals')?.title || 'Offers and markdowns'}
        subtitle={sectionById.get('deals')?.subtitle || ''}
        products={collections.deals}
        meta={(product) =>
          product.comparePrice && product.comparePrice > product.price
            ? `Save ${formatCurrency(product.comparePrice - product.price)}`
            : null
        }
      />
    ),

    stores: collections.stores.length > 0 ? (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader title={sectionById.get('stores')?.title || 'Featured stores'} subtitle={sectionById.get('stores')?.subtitle || ''} />
        <div className="grid gap-4 lg:grid-cols-3">
          {collections.stores.map((store) => (
            <article key={store.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-black text-slate-950">{store.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{store.productCount} approved products</p>
                </div>
                <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-white p-1">
                  <ProductThumb src={store.logo || store.banner || store.products[0]?.images?.[0]} alt={store.name} className="h-full w-full rounded-full object-cover" />
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-500">{store.description || 'Curated marketplace store with approved products and live operations.'}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {store.products.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[1rem] border border-slate-200 bg-white p-2">
                    <div className="h-20">
                      <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover rounded-lg" />
                    </div>
                  </Link>
                ))}
              </div>
              <Link href={`/store/${store.slug}`} className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                Visit store
              </Link>
            </article>
          ))}
        </div>
      </section>
    ) : null,

    editorial: collections.blogPosts.length > 0 ? (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader title={sectionById.get('editorial')?.title || 'From the journal'} subtitle={sectionById.get('editorial')?.subtitle || ''} />
        <div className="grid gap-4 lg:grid-cols-3">
          {collections.blogPosts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950">{post.title}</h3>
              <p className="mt-3 line-clamp-4 text-sm text-slate-500">{post.excerpt || 'Marketplace updates, product stories, and guided shopping content.'}</p>
              <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Read story
              </Link>
            </article>
          ))}
        </div>
      </section>
    ) : null,

    recommendations: (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeader title={sectionById.get('recommendations')?.title || 'Personalized recommendations'} subtitle={sectionById.get('recommendations')?.subtitle || ''} />
        <RecommendationRails />
      </section>
    ),
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 lg:px-6">
        {homepageConfig.sections.filter((section) => section.enabled).map((section) => (
          <div key={section.id}>{sectionBlocks[section.id]}</div>
        ))}

        {addonExtensions.storefrontBlocks.filter((block) => block.page === 'home').length > 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeader title="From Installed Addons" subtitle="Installed extension packages can contribute their own storefront blocks here." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {addonExtensions.storefrontBlocks
                .filter((block) => block.page === 'home')
                .map((block) => (
                  <Link
                    key={`${block.addonId}-${block.id}`}
                    href={block.href}
                    className={`rounded-[1.5rem] border p-5 transition hover:shadow-sm ${
                      block.tone === 'amber'
                        ? 'border-amber-200 bg-amber-50'
                        : block.tone === 'emerald'
                          ? 'border-emerald-200 bg-emerald-50'
                          : block.tone === 'rose'
                            ? 'border-rose-200 bg-rose-50'
                            : block.tone === 'violet'
                              ? 'border-violet-200 bg-violet-50'
                              : block.tone === 'blue'
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{block.addonId}</p>
                    <p className="mt-2 text-xl font-black text-slate-950">{block.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{block.subtitle}</p>
                  </Link>
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
