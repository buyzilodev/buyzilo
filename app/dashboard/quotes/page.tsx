'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type QuoteRequest = {
  id: string
  productName: string
  productSlug: string
  storeName?: string | null
  variantLabel?: string | null
  message: string
  status: 'NEW' | 'RESPONDED' | 'CLOSED'
  responseMessage?: string | null
  responsePrice?: number | null
  createdAt: string
  updatedAt: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function DashboardQuotesPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/quote-requests')
      .then((response) => response.json())
      .then((data) => setRequests(Array.isArray(data.requests) ? data.requests : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Negotiated Listings</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Quote activity</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Review the requests you sent for quote-only products and monitor pricing responses from sellers.
          </p>
        </div>
        <Link href="/products" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Browse catalog
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading quote requests...</p>
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">No quote requests yet</p>
          <p className="mt-2 text-sm text-slate-500">Products configured for negotiated pricing will show your request history here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-[1.5rem] border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/products/${request.productSlug}`} className="text-lg font-black text-slate-950 hover:text-blue-700">
                    {request.productName}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {request.storeName || 'Marketplace store'}
                    {request.variantLabel ? ` | ${request.variantLabel}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  request.status === 'RESPONDED'
                    ? 'bg-blue-100 text-blue-700'
                    : request.status === 'CLOSED'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {request.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Your request</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.message}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Seller response</p>
                  {request.responseMessage || request.responsePrice != null ? (
                    <div className="mt-2 space-y-2">
                      {request.responsePrice != null ? (
                        <p className="text-lg font-black text-slate-950">{formatCurrency(request.responsePrice)}</p>
                      ) : null}
                      {request.responseMessage ? (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{request.responseMessage}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No response yet. Sellers will answer here once they review your request.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
