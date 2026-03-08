'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { StatusBadge } from '@/components/admin/StatusBadge'

type QuoteRequest = {
  id: string
  productId: string
  productName: string
  productSlug: string
  storeName?: string | null
  variantLabel?: string | null
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
  message: string
  status: 'NEW' | 'RESPONDED' | 'CLOSED'
  responseMessage?: string | null
  responsePrice?: number | null
  createdAt: string
  updatedAt: string
}

const statuses = ['NEW', 'RESPONDED', 'CLOSED'] as const

export default function AdminProductQuotesPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, { responseMessage: string; responsePrice: string }>>({})

  async function load() {
    const response = await fetch('/api/admin/quotes')
    const data = await response.json()
    setRequests(Array.isArray(data.requests) ? data.requests : [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const stats = useMemo(() => ({
    total: requests.length,
    fresh: requests.filter((request) => request.status === 'NEW').length,
    responded: requests.filter((request) => request.status === 'RESPONDED').length,
    closed: requests.filter((request) => request.status === 'CLOSED').length,
  }), [requests])

  async function saveRequest(id: string, payload: { status?: 'NEW' | 'RESPONDED' | 'CLOSED'; responseMessage?: string; responsePrice?: number | null }) {
    setSaving(true)
    try {
      await fetch('/api/admin/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Quote Requests" subtitle="Monitor quote-only product inquiries and intervene on vendor pricing responses">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">New</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{stats.fresh}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Responded</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{stats.responded}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Closed</p>
          <p className="mt-2 text-3xl font-black text-slate-600">{stats.closed}</p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Marketplace Quote Queue</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading quote requests...</p>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No quote requests yet</p>
            <p className="mt-1 text-sm text-slate-500">Quote-based listings will surface here for marketplace oversight.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Link href={`/products/${request.productSlug}`} className="text-lg font-black text-slate-900 hover:text-blue-700">
                      {request.productName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {request.storeName || 'Platform'} | {request.buyerName} ({request.buyerEmail})
                      {request.buyerPhone ? ` | ${request.buyerPhone}` : ''}
                      {request.variantLabel ? ` | ${request.variantLabel}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={request.status} />
                    <select
                      value={request.status}
                      onChange={(event) => void saveRequest(request.id, { status: event.target.value as 'NEW' | 'RESPONDED' | 'CLOSED' })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Buyer Request</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{request.message}</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
                  <RichTextEditor
                    value={drafts[request.id]?.responseMessage ?? request.responseMessage ?? ''}
                    onChange={(value) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [request.id]: {
                          responseMessage: value,
                          responsePrice: prev[request.id]?.responsePrice ?? (request.responsePrice != null ? String(request.responsePrice) : ''),
                        },
                      }))
                    }
                    output="text"
                    placeholder="Add a marketplace response or help the vendor close this quote."
                    minHeightClassName="min-h-[120px]"
                  />
                  <div className="space-y-3">
                    <input
                      value={drafts[request.id]?.responsePrice ?? (request.responsePrice != null ? String(request.responsePrice) : '')}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [request.id]: {
                            responseMessage: prev[request.id]?.responseMessage ?? request.responseMessage ?? '',
                            responsePrice: event.target.value,
                          },
                        }))
                      }
                      placeholder="Quoted price"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void saveRequest(request.id, {
                          status: 'RESPONDED',
                          responseMessage: drafts[request.id]?.responseMessage ?? request.responseMessage ?? '',
                          responsePrice:
                            drafts[request.id]?.responsePrice?.trim()
                              ? Number(drafts[request.id].responsePrice)
                              : request.responsePrice ?? null,
                        })
                      }
                      disabled={saving}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Save response
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveRequest(request.id, { status: 'CLOSED' })}
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Close request
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
