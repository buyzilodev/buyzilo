'use client'

import { startTransition, useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type ReturnRequest = {
  id: string
  status: string
  quantity: number
  reason: string
  details?: string | null
  resolutionNote?: string | null
  createdAt: string
  user?: { name?: string | null; email?: string | null } | null
  store?: { name?: string } | null
  order: { id: string; status: string; createdAt: string }
  orderItem?: { product: { name: string }; variant?: { title?: string } | null } | null
  refundCredit?: { amount?: number; createdAt?: string } | null
}

const statuses = ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CANCELLED'] as const

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const response = await fetch('/api/admin/returns')
    const data = await response.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/returns')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        startTransition(() => {
          setRequests(data.requests ?? [])
          setLoading(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        startTransition(() => {
          setRequests([])
          setLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function updateStatus(id: string, status: string) {
    const note = window.prompt('Resolution note (optional):') ?? ''
    let refundToStoreCredit = false
    let refundAmount: number | undefined
    if (status === 'REFUNDED') {
      refundToStoreCredit = window.confirm('Issue this refund as store credit?')
      if (refundToStoreCredit) {
        const rawAmount = window.prompt('Store-credit refund amount:', '0') ?? '0'
        refundAmount = Number(rawAmount)
      }
    }
    await fetch('/api/admin/returns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, resolutionNote: note, refundToStoreCredit, refundAmount }),
    })
    await load()
  }

  return (
    <AdminLayout title="Returns" subtitle="Review and process return requests">
      {loading ? (
        <p className="text-sm text-slate-500">Loading return requests...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">No return requests yet.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">{request.id}</p>
                  <h3 className="text-lg font-bold text-slate-900">{request.reason}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Order {request.order.id} | Buyer {request.user?.name ?? request.user?.email ?? 'Unknown'} | Store {request.store?.name ?? 'Marketplace'}
                  </p>
                  {request.orderItem?.product?.name && (
                    <p className="mt-1 text-sm text-slate-600">
                      Item: {request.orderItem.product.name}{request.orderItem.variant?.title ? ` (${request.orderItem.variant.title})` : ''} | Qty: {request.quantity}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{request.status}</span>
              </div>
              {request.details && <p className="mt-3 text-sm text-slate-700">{request.details}</p>}
              {request.resolutionNote && <p className="mt-2 text-sm text-emerald-700">Resolution: {request.resolutionNote}</p>}
              {request.refundCredit?.amount != null && (
                <p className="mt-2 text-sm text-blue-700">
                  Store credit issued: ${request.refundCredit.amount.toFixed(2)}
                  {request.refundCredit.createdAt ? ` on ${new Date(request.refundCredit.createdAt).toLocaleString()}` : ''}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button key={status} onClick={() => void updateStatus(request.id, status)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
