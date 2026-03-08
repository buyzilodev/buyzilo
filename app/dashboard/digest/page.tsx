'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/helpers/format'

type DigestPayload = {
  generatedAt: string
  preferences: {
    digestFrequency?: string
  }
  summary: {
    unreadAlerts: number
    unreadRetentionNotifications: number
    priceDropAlerts: number
    stockAlerts: number
    savedSearchesWithNewResults: number
    wishlistItems: number
    cartItems: number
    cartValue: number
    recentOrders: number
  }
  highlights: {
    alerts: Array<{ id: string; title: string; body: string; createdAt: string; product?: { slug: string; name: string } }>
    retentionNotifications: Array<{ id: string; title: string; body: string; href?: string | null; createdAt: string }>
    searches: Array<{ id: string; label: string; currentResultCount: number; lastResultCount: number }>
    wishlist: Array<{ id: string; product: { name: string; slug: string }; variant?: { title: string } | null }>
    cart: Array<{ id: string; quantity: number; product: { name: string; slug: string; price: number }; variant?: { title: string; price?: number | null } | null }>
    orders: Array<{ id: string; total: number; createdAt: string; status: string }>
  }
}

export default function DashboardDigestPage() {
  const { status } = useSession()
  const router = useRouter()
  const [digest, setDigest] = useState<DigestPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/buyer-digest')
      .then((response) => (response.ok ? response.json() : { digest: null }))
      .then((data) => {
        if (!cancelled) setDigest(data.digest ?? null)
      })
      .catch(() => {
        if (!cancelled) setDigest(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  async function emailDigest() {
    setSending(true)
    setMessage(null)
    const response = await fetch('/api/buyer-digest', { method: 'POST' })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error ?? 'Unable to send digest email')
      setSending(false)
      return
    }
    setMessage('Digest sent to your email.')
    setSending(false)
  }

  if (status === 'loading' || status === 'unauthenticated' || loading) {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading digest...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#334155_40%,#2563eb_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Buyer digest</p>
          <h2 className="mt-3 text-4xl font-black">One summary for alerts, discovery, and active buying intent</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            This workspace condenses your current buyer state so cart value, watched items, saved-search movement, and retention signals stay readable in one place.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Unread alerts</p>
              <p className="mt-1 text-2xl font-black text-white">{digest?.summary.unreadAlerts ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Search updates</p>
              <p className="mt-1 text-2xl font-black text-white">{digest?.summary.savedSearchesWithNewResults ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Retention</p>
              <p className="mt-1 text-2xl font-black text-white">{digest?.summary.unreadRetentionNotifications ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Cart value</p>
              <p className="mt-1 text-2xl font-black text-white">{formatCurrency(digest?.summary.cartValue ?? 0)}</p>
            </article>
          </div>
        </div>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-black text-slate-950">Delivery</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Generated: <span className="font-semibold text-slate-900">{digest?.generatedAt ? new Date(digest.generatedAt).toLocaleString() : 'Not available'}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              Preference cadence: <span className="font-semibold uppercase text-slate-900">{digest?.preferences.digestFrequency ?? 'manual'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void emailDigest()}
            disabled={sending}
            className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Email me this digest'}
          </button>
          <div className="mt-3">
            <Link href="/dashboard/notifications" className="text-sm font-semibold text-blue-600 hover:underline">
              Open notification settings
            </Link>
          </div>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Wishlist / cart</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{digest ? `${digest.summary.wishlistItems} / ${digest.summary.cartItems}` : '0 / 0'}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Price drops</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{digest?.summary.priceDropAlerts ?? 0}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Restocks</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{digest?.summary.stockAlerts ?? 0}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Recent orders</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{digest?.summary.recentOrders ?? 0}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Retention highlights</h3>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.retentionNotifications.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No retention highlights.</p>
            ) : (
              digest?.highlights.retentionNotifications.map((item) => (
                <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                  {item.href ? <Link href={item.href} className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline">Open</Link> : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Alert highlights</h3>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.alerts.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No alert highlights.</p>
            ) : (
              digest?.highlights.alerts.map((item) => (
                <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                  {item.product?.slug ? <Link href={`/products/${item.product.slug}`} className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline">Open product</Link> : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Search highlights</h3>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.searches.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No search changes right now.</p>
            ) : (
              digest?.highlights.searches.map((item) => (
                <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm text-slate-600">Current matches: {item.currentResultCount} | Previous baseline: {item.lastResultCount}</p>
                  <Link href="/dashboard/saved-searches" className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline">
                    Open saved searches
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Wishlist</h3>
            <Link href="/dashboard/wishlist" className="text-sm font-semibold text-blue-600 hover:underline">Open</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.wishlist.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No wishlist items in this digest.</p>
            ) : (
              digest?.highlights.wishlist.map((item) => (
                <Link key={item.id} href={`/products/${item.product.slug}`} className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="text-sm font-bold text-slate-950">{item.product.name}</p>
                  {item.variant?.title ? <p className="mt-1 text-xs text-slate-500">{item.variant.title}</p> : null}
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Cart</h3>
            <Link href="/cart" className="text-sm font-semibold text-blue-600 hover:underline">Open</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.cart.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No cart items in this digest.</p>
            ) : (
              digest?.highlights.cart.map((item) => (
                <Link key={item.id} href={`/products/${item.product.slug}`} className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{item.product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Qty {item.quantity}{item.variant?.title ? ` | ${item.variant.title}` : ''}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency((item.variant?.price ?? item.product.price) * item.quantity)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Recent orders</h3>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-blue-600 hover:underline">Open</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(digest?.highlights.orders.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No recent orders in this digest.</p>
            ) : (
              digest?.highlights.orders.map((item) => (
                <Link key={item.id} href={`/dashboard/orders/${item.id}`} className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">Order {item.id.slice(0, 8)}...</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()} | {item.status}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
