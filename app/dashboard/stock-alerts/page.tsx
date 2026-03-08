'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type StockAlert = {
  id: string
  kind: 'STOCK' | 'PRICE_DROP'
  title: string
  body: string
  isRead: boolean
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    store?: { name: string; slug: string }
  }
  variant?: { id: string; title: string } | null
}

type Subscription = {
  id: string
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    store?: { name: string; slug: string }
  }
  variant?: { id: string; title: string } | null
}

export default function DashboardAlertsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/stock-alerts')
      .then((response) => (response.ok ? response.json() : { alerts: [], subscriptions: [] }))
      .then(async (data) => {
        if (cancelled) return
        const nextAlerts = Array.isArray(data.alerts) ? data.alerts : []
        setAlerts(nextAlerts)
        setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : [])
        if (nextAlerts.some((item: StockAlert) => !item.isRead)) {
          await fetch('/api/stock-alerts', { method: 'PATCH' }).catch(() => null)
          if (!cancelled) {
            setAlerts(nextAlerts.map((item: StockAlert) => ({ ...item, isRead: true })))
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAlerts([])
          setSubscriptions([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  async function unsubscribe(productId: string, variantId?: string | null) {
    const params = new URLSearchParams({ productId })
    if (variantId) params.set('variantId', variantId)
    const response = await fetch(`/api/stock-alerts?${params.toString()}`, { method: 'DELETE' })
    if (!response.ok) return
    setSubscriptions((current) =>
      current.filter((item) => !(item.product.id === productId && (item.variant?.id ?? null) === (variantId ?? null)))
    )
  }

  const unread = alerts.filter((item) => !item.isRead).length
  const priceDrops = alerts.filter((item) => item.kind === 'PRICE_DROP').length
  const restocks = alerts.filter((item) => item.kind !== 'PRICE_DROP').length

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading alerts...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#451a03_0%,#ea580c_45%,#1d4ed8_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Alerts workspace</p>
          <h2 className="mt-3 text-4xl font-black">Price movement and restock visibility in one queue</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Monitor watched products, react to restocks, and keep product intent close to the wishlist and catalog.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Unread</p>
              <p className="mt-1 text-2xl font-black text-white">{unread}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Price drops</p>
              <p className="mt-1 text-2xl font-black text-white">{priceDrops}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Restocks</p>
              <p className="mt-1 text-2xl font-black text-white">{restocks}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Subscriptions</p>
              <p className="mt-1 text-2xl font-black text-white">{subscriptions.length}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/dashboard/wishlist" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Open wishlist</p>
            <p className="mt-2 text-sm text-slate-500">Turn watched items and saved intent into a stronger ready-to-buy queue.</p>
          </Link>
          <Link href="/products" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Back to catalog</p>
            <p className="mt-2 text-sm text-slate-500">Return to discovery as soon as inventory changes create a buying window.</p>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Product alerts</h3>
              <p className="text-sm text-slate-500">Newest alerts appear first and are marked read after the first dashboard load.</p>
            </div>
            <p className="text-sm text-slate-400">{alerts.length} alerts</p>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No alerts yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <article key={alert.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{alert.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.kind === 'PRICE_DROP' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                      {alert.kind === 'PRICE_DROP' ? 'Price drop' : 'Restock'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{alert.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/products/${alert.product.slug}`} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      Open product
                    </Link>
                    {alert.product.store?.slug ? (
                      <Link href={`/store/${alert.product.store.slug}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                        Visit store
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Active subscriptions</h3>
              <p className="text-sm text-slate-500">Current restock watches you can keep or remove.</p>
            </div>
            <p className="text-sm text-slate-400">{subscriptions.length} active</p>
          </div>

          {subscriptions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No active product subscriptions.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {subscriptions.map((subscription) => (
                <article key={subscription.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{subscription.product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {subscription.variant?.title ? `${subscription.variant.title} | ` : ''}
                    {subscription.product.store?.name ?? 'Marketplace product'} | Watching since {new Date(subscription.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/products/${subscription.product.slug}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                      Open product
                    </Link>
                    <button
                      type="button"
                      onClick={() => void unsubscribe(subscription.product.id, subscription.variant?.id)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Remove watch
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
