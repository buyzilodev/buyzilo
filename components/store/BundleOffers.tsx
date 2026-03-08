import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

type BundleOffer = {
  id: string
  title: string
  description?: string | null
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  subtotal: number
  savings: number
  total: number
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    name: string
    slug: string
    image?: string | null
  }>
}

export default function BundleOffers({ bundles }: { bundles: BundleOffer[] }) {
  if (bundles.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-2xl font-black text-slate-900">Bundle Offers</h2>
      <div className="space-y-4">
        {bundles.map((bundle) => (
          <article key={bundle.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{bundle.title}</h3>
                {bundle.description && <p className="mt-1 text-sm text-slate-500">{bundle.description}</p>}
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Save {bundle.discountType === 'PERCENT' ? `${bundle.discountValue}%` : formatCurrency(bundle.discountValue)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-500 line-through">{formatCurrency(bundle.subtotal)}</p>
                <p className="text-xl font-black text-slate-900">{formatCurrency(bundle.total)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {bundle.items.map((item) => (
                <Link key={`${bundle.id}-${item.productId}-${item.variantId ?? 'default'}`} href={`/products/${item.slug}`} className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                  <div className="flex h-28 items-center justify-center">
                    <ProductThumb src={item.image} alt={item.name} className="h-full w-full object-contain" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Qty: {item.quantity}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Bundle savings are applied automatically at checkout when all items are in your cart.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
