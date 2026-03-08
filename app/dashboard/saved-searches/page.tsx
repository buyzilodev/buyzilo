'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/helpers/format'

type SavedSearch = {
  id: string
  label: string
  search?: string
  category?: string
  tag?: string
  sort?: 'default' | 'price-low' | 'price-high' | 'newest'
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
  createdAt: string
  lastViewedAt?: string | null
  lastResultCount: number
  currentResultCount: number
  hasNewResults: boolean
}

export default function DashboardSavedSearchesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/saved-searches')
      .then((response) => (response.ok ? response.json() : { searches: [] }))
      .then((data) => {
        if (!cancelled) setSearches(Array.isArray(data.searches) ? data.searches : [])
      })
      .catch(() => {
        if (!cancelled) setSearches([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  async function removeSearch(id: string) {
    const response = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) return
    setSearches((current) => current.filter((item) => item.id !== id))
  }

  async function markSeen(id: string) {
    const response = await fetch('/api/saved-searches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) return
    setSearches((current) => current.map((item) => item.id === id ? {
      ...item,
      hasNewResults: false,
      lastViewedAt: new Date().toISOString(),
      lastResultCount: item.currentResultCount,
    } : item))
    setMessage('Saved search marked as seen.')
    window.setTimeout(() => setMessage(null), 2000)
  }

  function buildHref(item: SavedSearch) {
    const params = new URLSearchParams()
    if (item.search) params.set('search', item.search)
    if (item.category) params.set('category', item.category)
    if (item.tag) params.set('tag', item.tag)
    if (item.sort && item.sort !== 'default') params.set('sort', item.sort)
    if (typeof item.minPrice === 'number') params.set('minPrice', String(item.minPrice))
    if (typeof item.maxPrice === 'number') params.set('maxPrice', String(item.maxPrice))
    if (item.inStock) params.set('inStock', 'true')
    if (typeof item.minRating === 'number') params.set('minRating', String(item.minRating))
    const query = params.toString()
    return query ? `/products?${query}` : '/products'
  }

  const newMatches = searches.filter((item) => item.hasNewResults).length
  const currentMatches = searches.reduce((sum, item) => sum + item.currentResultCount, 0)

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading saved searches...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#082f49_0%,#0ea5e9_48%,#14b8a6_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Discovery workspace</p>
          <h2 className="mt-3 text-4xl font-black">Saved intent, reusable instantly</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Keep high-intent search routes ready to reopen, compare result movement against past baselines, and act as soon as new inventory appears.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Saved searches</p>
              <p className="mt-1 text-2xl font-black text-white">{searches.length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">With new matches</p>
              <p className="mt-1 text-2xl font-black text-white">{newMatches}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Current matches</p>
              <p className="mt-1 text-2xl font-black text-white">{currentMatches}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/products" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Browse catalog</p>
            <p className="mt-2 text-sm text-slate-500">Re-enter discovery and save new high-intent routes as your catalog habits change.</p>
          </Link>
          <Link href="/dashboard/digest" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Open digest</p>
            <p className="mt-2 text-sm text-slate-500">See search changes together with alerts, wishlist movement, and cart status.</p>
          </Link>
        </div>
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Saved routes</h3>
            <p className="text-sm text-slate-500">Every saved query keeps its own baseline, facets, and reopen path.</p>
          </div>
          <p className="text-sm text-slate-400">{searches.length} saved</p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading saved searches...</p>
        ) : searches.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No saved searches yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {searches.map((item) => (
              <article key={item.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{item.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.search ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Query: {item.search}</span> : null}
                      {item.category ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Category: {item.category}</span> : null}
                      {item.tag ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Tag: {item.tag}</span> : null}
                      {typeof item.minPrice === 'number' || typeof item.maxPrice === 'number' ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          Price: {typeof item.minPrice === 'number' ? formatCurrency(item.minPrice) : 'Any'} - {typeof item.maxPrice === 'number' ? formatCurrency(item.maxPrice) : 'Any'}
                        </span>
                      ) : null}
                      {item.inStock ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">In stock only</span> : null}
                      {typeof item.minRating === 'number' ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Min rating: {item.minRating}</span> : null}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.hasNewResults ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.hasNewResults ? 'New results' : 'Seen'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                  <p>Saved: <span className="font-semibold text-slate-900">{new Date(item.createdAt).toLocaleDateString()}</span></p>
                  <p>Last viewed: <span className="font-semibold text-slate-900">{item.lastViewedAt ? new Date(item.lastViewedAt).toLocaleDateString() : 'Not yet'}</span></p>
                  <p>Baseline: <span className="font-semibold text-slate-900">{item.lastResultCount}</span></p>
                  <p>Current: <span className="font-semibold text-slate-900">{item.currentResultCount}</span></p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={buildHref(item)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    Open search
                  </Link>
                  <button type="button" onClick={() => void markSeen(item.id)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                    Mark seen
                  </button>
                  <button type="button" onClick={() => void removeSearch(item.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
