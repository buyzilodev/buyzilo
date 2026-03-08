import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductThumb from '@/components/ProductThumb'
import { parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { prisma } from '@/lib/prisma'
import { getStorefrontProductList } from '@/lib/queries/storefront'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const configRow = await prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' } })
  const config = parseStorefrontConfig(configRow?.value)
  const campaign = config.campaigns.find((item) => item.slug === slug)

  if (!campaign) notFound()

  const products = await getStorefrontProductList({
    category: campaign.featuredCategory || undefined,
    limit: 12,
    sort: 'newest',
  })

  const gradient = `linear-gradient(135deg, ${campaign.themeFrom ?? '#0f172a'} 0%, ${campaign.themeVia ?? '#2563eb'} 52%, ${campaign.themeTo ?? '#f59e0b'} 100%)`

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="text-white" style={{ background: gradient }}>
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{campaign.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight lg:text-6xl">{campaign.title}</h1>
            <p className="mt-4 max-w-2xl text-base text-white/80">{campaign.subtitle}</p>
            <p className="mt-4 max-w-2xl text-sm text-white/75">{campaign.body}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={campaign.ctaHref} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                {campaign.ctaLabel}
              </Link>
              <Link href="/products" className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white">
                Browse catalog
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-4">
            <div className="h-80 rounded-[1.5rem] bg-white/10 p-3">
              <ProductThumb src={campaign.image || products.products[0]?.images?.[0]} alt={campaign.title} className="h-full w-full rounded-[1.25rem] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 py-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Campaign picks</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Featured products</h2>
          </div>
          {campaign.featuredCategory ? (
            <Link href={`/products?category=${campaign.featuredCategory}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              View category
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.products.map((product) => (
            <article key={product.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <Link href={`/products/${product.slug}`} className="block rounded-[1.25rem] bg-slate-50 p-4">
                <div className="flex h-44 items-center justify-center">
                  <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
                </div>
              </Link>
              <p className="mt-4 line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
              <p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(product.price)}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
