import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { filterProductsByAccess, getSessionAccessViewerContext, getStoreAccessDecision } from '@/lib/actions/accessRestrictions'
import { formatStoreLocatorLine, getStoreLocatorMeta } from '@/lib/actions/storeLocator'
import { getVendorRatingSummary } from '@/lib/actions/vendorRatings'
import { buildSeoMetadata } from '@/lib/helpers/seo'
import { getMatchingCampaigns, parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { prisma } from '@/lib/prisma'
import ProductThumb from '@/components/ProductThumb'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      vendor: { select: { name: true, email: true } },
      _count: { select: { products: true } },
    },
  })

  if (!store || store.status !== 'APPROVED') {
    return buildSeoMetadata({
      title: 'Store Not Found | Buyzilo',
      description: 'The requested store could not be found.',
      path: `/store/${slug}`,
      noIndex: true,
    })
  }

  return buildSeoMetadata({
    title: `${store.name} Store | Buyzilo`,
    description: store.description?.trim() || `Browse ${store.name} products on Buyzilo.`,
    path: `/store/${store.slug}`,
    keywords: [store.name, store.vendor.name || '', 'storefront', 'marketplace'].filter(Boolean),
  })
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const viewer = await getSessionAccessViewerContext()
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      vendor: { select: { name: true, email: true } },
      products: {
        where: { isActive: true, approvalStatus: 'APPROVED' },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!store || store.status !== 'APPROVED') {
    notFound()
  }
  const accessDecision = await getStoreAccessDecision(viewer, store.slug)
  if (!accessDecision.allowed) {
    redirect(viewer.isAuthenticated ? '/unauthorized' : `/login?next=${encodeURIComponent(`/store/${store.slug}`)}`)
  }
  const visibleStoreProducts = await filterProductsByAccess(store.products, viewer)
  const [vendorRating, locator, storefrontConfig] = await Promise.all([
    getVendorRatingSummary(store.id),
    getStoreLocatorMeta(store.id),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
  ])
  const storeCampaigns = getMatchingCampaigns(storefrontConfig.campaigns, {
    page: 'store',
    category: visibleStoreProducts[0]?.category.slug,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm text-slate-500">
          <Link href="/" className="text-blue-600 hover:underline">Home</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">{store.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0891b2_100%)] p-6 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{storefrontConfig.templates.storeHeroTitle}</p>
              <h1 className="mt-2 text-3xl font-black text-white">{store.name}</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/80">{store.description || storefrontConfig.templates.storeHeroSubtitle}</p>
              <p className="mt-3 text-sm text-white/75">Managed by {store.vendor.name ?? store.vendor.email}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
                <span>{vendorRating.averageRating != null ? `${vendorRating.averageRating}/5 vendor rating` : 'No vendor rating yet'}</span>
                <span>{vendorRating.reviewCount} reviews</span>
                <span>{visibleStoreProducts.length} active products</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleStoreProducts.slice(0, 2).map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-3">
                  <div className="h-32 rounded-[1rem] bg-white/10 p-2">
                    <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full rounded-lg object-cover" />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-white">{product.name}</p>
                </Link>
              ))}
            </div>
          </div>
          {formatStoreLocatorLine(locator) && (
            <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Store location</p>
              <p className="mt-1">{formatStoreLocatorLine(locator)}</p>
              {locator.hours && <p className="mt-1">Hours: {locator.hours}</p>}
              {(locator.phone || locator.email) && (
                <p className="mt-1">{[locator.phone, locator.email].filter(Boolean).join(' | ')}</p>
              )}
            </div>
          )}
        </section>

        {storeCampaigns.length > 0 && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Store Campaigns</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Campaigns relevant to this store assortment</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {storeCampaigns.slice(0, 3).map((campaign) => (
                <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{campaign.eyebrow}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{campaign.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Products</h2>
            <p className="text-sm text-slate-500">{visibleStoreProducts.length} items</p>
          </div>
          {visibleStoreProducts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No active products in this store yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {visibleStoreProducts.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:shadow-sm">
                  <Link href={`/products/${product.slug}`} className="block bg-slate-50 p-4">
                    <div className="flex h-36 items-center justify-center">
                      <ProductThumb
                        src={product.images?.[0]}
                        alt={product.name}
                        className="h-full w-full rounded-lg object-contain"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <p className="text-xs font-medium text-blue-600">{product.category.name}</p>
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-600">{product.name}</h3>
                    </Link>
                    <p className="mt-2 text-base font-black text-slate-900">{formatCurrency(product.price)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {storefrontConfig.discoveryRoutes.length > 0 && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Keep exploring</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Discovery routes beyond this store</h2>
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
      </div>
    </div>
  )
}
