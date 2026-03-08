import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'
import { filterProductsByAccess, filterStoresByAccess, getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { formatStoreLocatorLine, getStoreLocatorMetaMap } from '@/lib/actions/storeLocator'
import { getMatchingBannerCards, parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { prisma } from '@/lib/prisma'

export default async function StoreLocatorPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>
}) {
  const params = (await searchParams) ?? {}
  const term = params.search?.trim().toLowerCase() ?? ''
  const viewer = await getSessionAccessViewerContext()

  const [stores, storefrontConfig] = await Promise.all([
    prisma.store.findMany({
      where: { status: 'APPROVED' },
      include: {
        vendor: { select: { name: true, email: true } },
        _count: { select: { products: true } },
        products: {
          where: { isActive: true, approvalStatus: 'APPROVED' },
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, slug: true, images: true },
        },
      },
      orderBy: [{ products: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: 300,
    }),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
  ])

  const visibleStores = await filterStoresByAccess(stores, viewer)
  const locatorMap = await getStoreLocatorMetaMap(visibleStores.map((store) => store.id))
  const storeDirectoryBanners = getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'store' }).slice(0, 2)
  const rows = (
    await Promise.all(
      visibleStores.map(async (store) => ({
        ...store,
        products: await filterProductsByAccess(store.products, viewer),
        locator: locatorMap.get(store.id) ?? {},
      }))
    )
  ).filter((store) => {
    if (!term) return true
    const haystack = [
      store.name,
      store.slug,
      store.vendor.name,
      store.vendor.email,
      store.locator.addressLine1,
      store.locator.city,
      store.locator.state,
      store.locator.country,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
      <div className="mx-auto max-w-[1440px] px-4 py-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] px-6 py-8 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Store Directory</p>
              <h1 className="mt-2 text-4xl font-black">{storefrontConfig.templates.storesHeroTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80 lg:text-base">{storefrontConfig.templates.storesHeroSubtitle}</p>
              <form className="mt-5 max-w-xl">
                <input
                  type="text"
                  name="search"
                  defaultValue={params.search ?? ''}
                  placeholder="Search by store name, city, country, or vendor"
                  className="w-full rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none"
                />
              </form>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {storeDirectoryBanners.map((banner, index) => (
                <Link key={`${banner.title}-${index}`} href={banner.href} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-black text-white">{banner.title}</p>
                  <p className="mt-2 text-sm text-white/75">{banner.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Approved stores</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">With physical location</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{rows.filter((store) => store.locator.addressLine1 || store.locator.city).length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Search term</p>
            <p className="mt-2 text-lg font-black text-slate-950">{params.search?.trim() || 'All stores'}</p>
          </article>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No stores matched this search.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {rows.map((store) => (
              <article key={store.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">{store.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">/{store.slug}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {store._count.products} products
                  </span>
                </div>
                {store.description ? <p className="mt-3 text-sm text-slate-600">{store.description}</p> : null}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>{formatStoreLocatorLine(store.locator) || 'No physical location listed'}</p>
                    {store.locator.hours ? <p>Hours: {store.locator.hours}</p> : null}
                    {store.locator.phone ? <p>Phone: {store.locator.phone}</p> : null}
                    {store.locator.email ? <p>Email: {store.locator.email}</p> : null}
                    <p>Managed by {store.vendor.name ?? store.vendor.email}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {store.products.map((product) => (
                      <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-2">
                        <div className="h-20">
                          <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full rounded-lg object-cover" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/store/${store.slug}`} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Open store
                  </Link>
                  {store.locator.latitude && store.locator.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(`${store.locator.latitude},${store.locator.longitude}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View map
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
