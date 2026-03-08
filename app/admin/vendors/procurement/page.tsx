'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { adminVendorSubsections } from '@/components/admin/subsections'
import {
  getPurchaseOrderOpenCost,
  getSupplierPerformance,
  isOpenPurchaseOrder,
  isOverduePurchaseOrder,
} from '@/lib/helpers/procurementAnalytics'

type Supplier = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  store?: { id: string; name: string; slug: string } | null
}

type PurchaseOrder = {
  id: string
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  note?: string | null
  expectedAt?: string | null
  createdAt: string
  store: { id: string; name: string; slug: string }
  supplier: Supplier
  warehouse: { id: string; name: string; code?: string | null }
  items: Array<{
    id: string
    quantity: number
    receivedQuantity: number
    unitCost?: number | null
    product: { id: string; name: string }
    variant?: { id: string; title: string } | null
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function AdminVendorProcurementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [poEdits, setPoEdits] = useState<Record<string, { note: string; expectedAt: string }>>({})
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, Record<string, string>>>({})

  async function load() {
    const response = await fetch('/api/admin/procurement')
    const data = await response.json()
    setSuppliers(data.suppliers ?? [])
    setPurchaseOrders(data.purchaseOrders ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const stats = {
    suppliers: suppliers.length,
    openPurchaseOrders: purchaseOrders.filter((po) => isOpenPurchaseOrder(po.status)).length,
    partiallyReceived: purchaseOrders.filter((po) => po.status === 'PARTIALLY_RECEIVED').length,
    fullyReceived: purchaseOrders.filter((po) => po.status === 'RECEIVED').length,
    overduePurchaseOrders: purchaseOrders.filter((po) => isOverduePurchaseOrder(po)).length,
    committedSpend: purchaseOrders.reduce((sum, po) => sum + getPurchaseOrderOpenCost(po), 0),
  }
  const supplierPerformance = getSupplierPerformance(suppliers, purchaseOrders)
  const supplierSpend = [...supplierPerformance]
    .sort((left, right) => right.committedSpend - left.committedSpend)
    .slice(0, 10)
  const supplierReliability = [...supplierPerformance]
    .sort((left, right) => {
      if (right.avgFillRate !== left.avgFillRate) {
        return right.avgFillRate - left.avgFillRate
      }
      return left.overduePurchaseOrders - right.overduePurchaseOrders
    })
    .slice(0, 6)

  async function updateSupplier(supplier: Supplier) {
    const name = window.prompt('Supplier name', supplier.name)
    if (name === null) return
    const email = window.prompt('Supplier email', supplier.email ?? '')
    if (email === null) return
    const phone = window.prompt('Supplier phone', supplier.phone ?? '')
    if (phone === null) return
    const notes = window.prompt('Supplier notes', supplier.notes ?? '')
    if (notes === null) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'supplier',
          supplierId: supplier.id,
          name,
          email,
          phone,
          notes,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to update supplier')
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function updatePurchaseOrder(purchaseOrderId: string) {
    const edit = poEdits[purchaseOrderId]
    setSaving(true)
    try {
      const response = await fetch('/api/admin/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'purchaseOrder',
          purchaseOrderId,
          action: 'update',
          note: edit?.note,
          expectedAt: edit?.expectedAt || null,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to update purchase order')
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function cancelPurchaseOrder(purchaseOrderId: string) {
    if (!confirm('Cancel this purchase order?')) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'purchaseOrder',
          purchaseOrderId,
          action: 'cancel',
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to cancel purchase order')
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function receivePurchaseOrder(purchaseOrderId: string, partial = false) {
    const items = partial
      ? Object.entries(receiptDrafts[purchaseOrderId] ?? {})
          .map(([id, quantity]) => ({ id, quantity: Number(quantity || 0) }))
          .filter((item) => item.quantity > 0)
      : undefined

    if (partial && (!items || items.length === 0)) {
      alert('Enter at least one received quantity')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'purchaseOrder',
          purchaseOrderId,
          action: 'receive',
          items,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to receive purchase order')
        return
      }
      setReceiptDrafts((prev) => ({ ...prev, [purchaseOrderId]: {} }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function escalatePurchaseOrder(purchaseOrderId: string) {
    const message = window.prompt('Escalation note to vendor', 'Please review this overdue or at-risk purchase order.')
    if (message === null) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'purchaseOrder',
          purchaseOrderId,
          action: 'escalate',
          message,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to escalate purchase order')
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Vendor Procurement" subtitle="Monitor and intervene in supplier and purchase-order workflows">
      <SubsectionNav items={adminVendorSubsections} />

      <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Suppliers" value={String(stats.suppliers)} hint="Configured supplier records" />
        <StatCard label="Open POs" value={String(stats.openPurchaseOrders)} hint="Draft or ordered purchase orders" />
        <StatCard label="Partially Received" value={String(stats.partiallyReceived)} hint="Needs more receiving" />
        <StatCard label="Received" value={String(stats.fullyReceived)} hint="Completed replenishment" />
        <StatCard label="Overdue POs" value={String(stats.overduePurchaseOrders)} hint="Expected date already passed" />
        <StatCard label="Committed Spend" value={formatCurrency(stats.committedSpend)} hint="Unreceived PO cost" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <Section title="Suppliers" subtitle="Edit vendor supplier records and monitor committed supplier spend">
          {loading ? (
            <p className="text-sm text-slate-500">Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-slate-500">No suppliers found.</p>
          ) : (
            <div className="space-y-2">
              {supplierSpend.map((supplier) => (
                <div key={supplier.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                      <p className="text-xs text-slate-500">
                        {supplier.storeName} | {supplier.purchaseOrders} POs | {formatCurrency(supplier.committedSpend)} open spend
                      </p>
                    </div>
                    <button onClick={() => void updateSupplier(suppliers.find((item) => item.id === supplier.id)!)} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Purchase Order Queue" subtitle="Admin lifecycle controls for receiving, note updates, and cancellation">
          {loading ? (
            <p className="text-sm text-slate-500">Loading purchase orders...</p>
          ) : purchaseOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No purchase orders found.</p>
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((purchaseOrder) => (
                <article key={purchaseOrder.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{purchaseOrder.id}</p>
                      <p className="text-sm font-semibold text-slate-900">{purchaseOrder.store.name} | {purchaseOrder.supplier.name} | {purchaseOrder.warehouse.name}</p>
                      <p className="text-xs text-slate-500">
                        Created {new Date(purchaseOrder.createdAt).toLocaleString()}
                        {purchaseOrder.expectedAt ? ` | Expected ${new Date(purchaseOrder.expectedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {purchaseOrder.expectedAt && new Date(purchaseOrder.expectedAt) < new Date() && !['RECEIVED', 'CANCELLED'].includes(purchaseOrder.status) && (
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">OVERDUE</span>
                      )}
                      <StatusBadge status={purchaseOrder.status} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <textarea
                      value={poEdits[purchaseOrder.id]?.note ?? purchaseOrder.note ?? ''}
                      onChange={(event) => setPoEdits((prev) => ({
                        ...prev,
                        [purchaseOrder.id]: {
                          note: event.target.value,
                          expectedAt: prev[purchaseOrder.id]?.expectedAt ?? (purchaseOrder.expectedAt ? purchaseOrder.expectedAt.slice(0, 10) : ''),
                        },
                      }))}
                      rows={2}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="PO note"
                      disabled={purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED'}
                    />
                    <input
                      type="date"
                      value={poEdits[purchaseOrder.id]?.expectedAt ?? (purchaseOrder.expectedAt ? purchaseOrder.expectedAt.slice(0, 10) : '')}
                      onChange={(event) => setPoEdits((prev) => ({
                        ...prev,
                        [purchaseOrder.id]: {
                          note: prev[purchaseOrder.id]?.note ?? purchaseOrder.note ?? '',
                          expectedAt: event.target.value,
                        },
                      }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      disabled={purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED'}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {purchaseOrder.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.product.name}{item.variant?.title ? ` (${item.variant.title})` : ''}
                        </p>
                        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_180px]">
                          <p className="text-xs text-slate-500">
                            Ordered: {item.quantity} | Received: {item.receivedQuantity}{item.unitCost != null ? ` | Cost: $${item.unitCost.toFixed(2)}` : ''}
                          </p>
                          <input
                            type="number"
                            min={0}
                            max={item.quantity - item.receivedQuantity}
                            value={receiptDrafts[purchaseOrder.id]?.[item.id] ?? ''}
                            onChange={(event) => setReceiptDrafts((prev) => ({
                              ...prev,
                              [purchaseOrder.id]: {
                                ...(prev[purchaseOrder.id] ?? {}),
                                [item.id]: event.target.value,
                              },
                            }))}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder={`Receive (max ${item.quantity - item.receivedQuantity})`}
                            disabled={purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Open cost: {formatCurrency(purchaseOrder.items.reduce((sum, item) => sum + (item.unitCost ?? 0) * Math.max(0, item.quantity - item.receivedQuantity), 0))}
                  </p>

                  {purchaseOrder.status !== 'RECEIVED' && purchaseOrder.status !== 'CANCELLED' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isOverduePurchaseOrder(purchaseOrder) && (
                        <button onClick={() => void escalatePurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
                          Notify vendor
                        </button>
                      )}
                      <button onClick={() => void updatePurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
                        Update PO
                      </button>
                      <button onClick={() => void receivePurchaseOrder(purchaseOrder.id, true)} disabled={saving} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">
                        Receive entered quantities
                      </button>
                      <button onClick={() => void receivePurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        Receive remaining
                      </button>
                      {!purchaseOrder.items.some((item) => item.receivedQuantity > 0) && (
                        <button onClick={() => void cancelPurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">
                          Cancel PO
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <Section title="Supplier Performance" subtitle="Fill-rate and overdue pressure across active suppliers">
          {loading ? (
            <p className="text-sm text-slate-500">Loading supplier performance...</p>
          ) : supplierReliability.length === 0 ? (
            <p className="text-sm text-slate-500">No supplier performance data yet.</p>
          ) : (
            <div className="space-y-3">
              {supplierReliability.map((supplier) => (
                <div key={supplier.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                      <p className="text-xs text-slate-500">{supplier.storeName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{supplier.avgFillRate.toFixed(1)}%</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Fill rate</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Received</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{supplier.unitsReceived} / {supplier.unitsOrdered} units</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Completed</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{supplier.completedPurchaseOrders} of {supplier.purchaseOrders} POs</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Overdue</p>
                      <p className={`mt-1 text-sm font-semibold ${supplier.overduePurchaseOrders > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {supplier.overduePurchaseOrders} active late orders
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Late Supplier Pressure" subtitle="Open spend and delayed replenishment risk by supplier">
          {loading ? (
            <p className="text-sm text-slate-500">Loading delayed purchase orders...</p>
          ) : supplierPerformance.length === 0 ? (
            <p className="text-sm text-slate-500">No delayed supplier exposure yet.</p>
          ) : (
            <div className="space-y-2">
              {[...supplierPerformance]
                .sort((left, right) => {
                  if (right.overduePurchaseOrders !== left.overduePurchaseOrders) {
                    return right.overduePurchaseOrders - left.overduePurchaseOrders
                  }
                  return right.committedSpend - left.committedSpend
                })
                .slice(0, 8)
                .map((supplier) => (
                  <div key={supplier.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                        <p className="text-xs text-slate-500">
                          {supplier.storeName} | {supplier.purchaseOrders} POs | {formatCurrency(supplier.committedSpend)} open spend
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${supplier.overduePurchaseOrders > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {supplier.overduePurchaseOrders} overdue
                        </p>
                        <p className="text-xs text-slate-500">{supplier.avgFillRate.toFixed(1)}% filled</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>
      </div>
    </AdminLayout>
  )
}
