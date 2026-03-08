'use client'

import { startTransition, useEffect, useState } from 'react'
import { VendorLayout } from '@/components/vendor/VendorLayout'

type Shipment = {
  id: string
  orderId: string
  warehouseId?: string | null
  warehouse?: {
    id: string
    name: string
    code?: string | null
  } | null
  warehouseOptions?: Array<{
    id: string
    name: string
    code?: string | null
    isDefault?: boolean
  }>
  carrier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  status: 'PENDING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'
  order: {
    id: string
    status: string
    total: number
    buyerEmail?: string | null
    shippingMethodLabel?: string | null
    shippingAmount: number
    items: Array<{
      quantity: number
      price: number
      product: { id: string; name: string }
      variant?: { id: string; title: string } | null
    }>
  }
}

const shipmentStatuses = ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED'] as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function VendorShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const response = await fetch('/api/vendor/shipments')
    const data = await response.json()
    setShipments(data.shipments ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/vendor/shipments')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        startTransition(() => {
          setShipments(data.shipments ?? [])
          setLoading(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        startTransition(() => {
          setShipments([])
          setLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function updateShipment(id: string, patch: Partial<Shipment>) {
    await fetch('/api/vendor/shipments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        warehouseId: patch.warehouseId,
        carrier: patch.carrier,
        trackingNumber: patch.trackingNumber,
        trackingUrl: patch.trackingUrl,
        status: patch.status,
      }),
    })
    await load()
  }

  return (
    <VendorLayout title="Shipments" subtitle="Manage fulfillment, tracking, and warehouse assignment">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Shipment Queue</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading shipments...</p>
        ) : shipments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No shipments yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {shipments.map((shipment) => (
              <article key={shipment.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{shipment.id}</p>
                    <p className="text-sm font-semibold text-slate-900">Order {shipment.order.id}</p>
                    <p className="text-sm text-slate-500">
                      {shipment.order.buyerEmail ?? 'Guest'} | {shipment.order.shippingMethodLabel ?? 'Shipping method'} | Fee {formatCurrency(shipment.order.shippingAmount)}
                    </p>
                  </div>
                  <select
                    value={shipment.status}
                    onChange={(event) => void updateShipment(shipment.id, { status: event.target.value as Shipment['status'] })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {shipmentStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {shipment.order.items.map((item, index) => (
                    <p key={`${item.product.id}-${index}`}>
                      {item.quantity}x {item.product.name}{item.variant?.title ? ` (${item.variant.title})` : ''} - {formatCurrency(item.price * item.quantity)}
                    </p>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={shipment.warehouseId ?? ''}
                    onChange={(event) => void updateShipment(shipment.id, { warehouseId: event.target.value || null })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned warehouse</option>
                    {(shipment.warehouseOptions ?? []).map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}{warehouse.isDefault ? ' - default' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    defaultValue={shipment.carrier ?? ''}
                    onBlur={(event) => void updateShipment(shipment.id, { carrier: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Carrier"
                  />
                  <input
                    defaultValue={shipment.trackingNumber ?? ''}
                    onBlur={(event) => void updateShipment(shipment.id, { trackingNumber: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Tracking number"
                  />
                  <input
                    defaultValue={shipment.trackingUrl ?? ''}
                    onBlur={(event) => void updateShipment(shipment.id, { trackingUrl: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Tracking URL"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </VendorLayout>
  )
}
