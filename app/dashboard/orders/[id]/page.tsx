'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type OrderDetail = {
  id: string
  status: string
  total: number
  createdAt: string
  items: {
    id: string
    quantity: number
    price: number
    product: { name: string; slug: string }
    variant?: { title?: string } | null
  }[]
  returnRequests: {
    id: string
    status: string
    quantity: number
    reason: string
    details?: string | null
    resolutionNote?: string | null
    createdAt: string
    orderItem?: { product: { name: string }; variant?: { title?: string } | null } | null
    store?: { name?: string } | null
  }[]
  licenseDelivery?: {
    productId: string
    productName: string
    orderItemId: string
    variantLabel?: string | null
    codes: { code: string; note?: string | null }[]
  }[]
  digitalDelivery?: {
    productId: string
    productName: string
    orderItemId: string
    variantLabel?: string | null
    files: { name: string; url: string; note?: string | null }[]
  }[]
}

export default function DashboardOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ orderItemId: '', quantity: '1', reason: '', details: '' })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        setOrder(data?.error ? null : data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setOrder(null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function submitReturn() {
    if (!form.reason.trim()) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          orderItemId: form.orderItemId || undefined,
          quantity: Number(form.quantity || 1),
          reason: form.reason,
          details: form.details,
        }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        alert(data.error ?? 'Failed to request return')
        return
      }
      setForm({ orderItemId: '', quantity: '1', reason: '', details: '' })
      const refreshed = await fetch(`/api/orders/${id}`)
      const refreshedData = await refreshed.json()
      setOrder(refreshedData?.error ? null : refreshedData)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading order...</p>
  if (!order) return <p className="text-sm text-slate-500">Order not found.</p>

  const returnEligible = ['DELIVERED', 'SHIPPED'].includes(order.status)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">Order ID</p>
        <p className="font-mono text-sm text-slate-900">{order.id}</p>
        <p className="mt-1 text-sm text-slate-600">Status: {order.status}</p>
        <p className="text-sm font-semibold text-slate-900">Total: ${order.total.toFixed(2)}</p>
        <div className="mt-3">
          <a
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Print invoice
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Items</h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div>
                <Link href={`/products/${item.product.slug}`} className="font-medium text-blue-600 hover:underline">
                  {item.product.name}
                </Link>
                {item.variant?.title && <p className="text-xs text-slate-500">{item.variant.title}</p>}
              </div>
              <span className="text-slate-600">x {item.quantity}</span>
              <span className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {order.licenseDelivery && order.licenseDelivery.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">License Delivery</h3>
          <div className="space-y-3">
            {order.licenseDelivery.map((delivery) => (
              <article key={delivery.orderItemId} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {delivery.productName}
                  {delivery.variantLabel ? ` (${delivery.variantLabel})` : ''}
                </p>
                <div className="mt-3 space-y-2">
                  {delivery.codes.map((entry, index) => (
                    <div key={`${delivery.orderItemId}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-mono text-xs text-slate-900">{entry.code}</p>
                      {entry.note ? <p className="mt-1 text-xs text-slate-500">{entry.note}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {order.digitalDelivery && order.digitalDelivery.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Digital Downloads</h3>
          <div className="space-y-3">
            {order.digitalDelivery.map((delivery) => (
              <article key={delivery.orderItemId} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {delivery.productName}
                  {delivery.variantLabel ? ` (${delivery.variantLabel})` : ''}
                </p>
                <div className="mt-3 space-y-2">
                  {delivery.files.map((file, index) => (
                    <a
                      key={`${delivery.orderItemId}-${index}`}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{file.name}</p>
                        {file.note ? <p className="mt-1 text-xs text-slate-500">{file.note}</p> : null}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">Download</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Return Request</h3>
        {!returnEligible ? (
          <p className="text-sm text-slate-500">Returns can be requested after the order has shipped.</p>
        ) : (
          <div className="space-y-3">
            <select value={form.orderItemId} onChange={(event) => setForm((prev) => ({ ...prev, orderItemId: event.target.value, quantity: '1' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Whole order / unspecified item</option>
              {order.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product.name}{item.variant?.title ? ` (${item.variant.title})` : ''} x {item.quantity}
                </option>
              ))}
            </select>
            <input value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} type="number" min={1} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Quantity" />
            <input value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Reason for return" />
            <textarea value={form.details} onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Additional details" />
            <button onClick={() => void submitReturn()} disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit return request'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Return History</h3>
        {order.returnRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No return requests for this order.</p>
        ) : (
          <div className="space-y-3">
            {order.returnRequests.map((request) => (
              <article key={request.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{request.reason}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{request.status}</span>
                </div>
                {request.orderItem?.product?.name && (
                  <p className="mt-1 text-slate-500">
                    Item: {request.orderItem.product.name}{request.orderItem.variant?.title ? ` (${request.orderItem.variant.title})` : ''} | Qty: {request.quantity}
                  </p>
                )}
                {request.details && <p className="mt-1 text-slate-600">{request.details}</p>}
                {request.resolutionNote && <p className="mt-1 text-emerald-700">Resolution: {request.resolutionNote}</p>}
                <p className="mt-1 text-xs text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <Link href="/dashboard/orders" className="inline-block text-sm font-semibold text-blue-600 hover:underline">
        Back to Orders
      </Link>
    </div>
  )
}
