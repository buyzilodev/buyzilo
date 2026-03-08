'use client'

import { useEffect, useMemo, useState } from 'react'
import { VendorLayout } from '@/components/vendor/VendorLayout'
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
}

type Warehouse = {
  id: string
  name: string
  code?: string | null
}

type Product = {
  id: string
  name: string
  variants: Array<{ id: string; title: string }>
}

type PurchaseOrder = {
  id: string
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  note?: string | null
  expectedAt?: string | null
  createdAt: string
  supplier: Supplier
  warehouse: Warehouse
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

type PoItemForm = {
  productId: string
  variantId: string
  quantity: number
  unitCost: string
}

export default function VendorProcurementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: '',
    note: '',
    expectedAt: '',
    items: [{ productId: '', variantId: '', quantity: 1, unitCost: '' }] as PoItemForm[],
  })
  const [poEdits, setPoEdits] = useState<Record<string, { note: string; expectedAt: string }>>({})
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, Record<string, string>>>({})
  const [lineEdits, setLineEdits] = useState<Record<string, Record<string, { quantity: string; unitCost: string }>>>({})

  async function load() {
    const response = await fetch('/api/vendor/procurement')
    const data = await response.json()
    setSuppliers(data.suppliers ?? [])
    setWarehouses(data.warehouses ?? [])
    setProducts(data.products ?? [])
    setPurchaseOrders(data.purchaseOrders ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const procurementStats = useMemo(() => ({
    suppliers: suppliers.length,
    openPurchaseOrders: purchaseOrders.filter((po) => isOpenPurchaseOrder(po.status)).length,
    overduePurchaseOrders: purchaseOrders.filter((po) => isOverduePurchaseOrder(po)).length,
    committedSpend: purchaseOrders.reduce((sum, po) => sum + getPurchaseOrderOpenCost(po), 0),
  }), [purchaseOrders, suppliers.length])
  const supplierPerformance = useMemo(
    () => getSupplierPerformance(suppliers, purchaseOrders).sort((left, right) => {
      if (right.avgFillRate !== left.avgFillRate) {
        return right.avgFillRate - left.avgFillRate
      }
      return left.overduePurchaseOrders - right.overduePurchaseOrders
    }),
    [purchaseOrders, suppliers]
  )

  async function createSupplier() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'supplier', ...supplierForm }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to create supplier')
        return
      }
      setSupplierForm({ name: '', email: '', phone: '', notes: '' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function createPurchaseOrder() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchaseOrder',
          supplierId: poForm.supplierId,
          warehouseId: poForm.warehouseId,
          note: poForm.note,
          expectedAt: poForm.expectedAt || undefined,
          items: poForm.items
            .filter((item) => item.productId && item.quantity > 0)
            .map((item) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: Number(item.quantity),
              unitCost: item.unitCost ? Number(item.unitCost) : undefined,
            })),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to create purchase order')
        return
      }
      setPoForm({
        supplierId: '',
        warehouseId: '',
        note: '',
        expectedAt: '',
        items: [{ productId: '', variantId: '', quantity: 1, unitCost: '' }],
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function receivePurchaseOrder(purchaseOrderId: string) {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receive', purchaseOrderId }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to receive purchase order')
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function receivePartialPurchaseOrder(purchaseOrderId: string) {
    const draft = receiptDrafts[purchaseOrderId] ?? {}
    const items = Object.entries(draft)
      .map(([id, quantity]) => ({ id, quantity: Number(quantity || 0) }))
      .filter((item) => item.quantity > 0)

    if (items.length === 0) {
      alert('Enter at least one received quantity')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receive', purchaseOrderId, items }),
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

  async function updatePurchaseOrder(purchaseOrderId: string) {
    const edit = poEdits[purchaseOrderId]
    const items = Object.entries(lineEdits[purchaseOrderId] ?? {}).map(([id, value]) => ({
      id,
      quantity: Number(value.quantity || 0),
      unitCost: value.unitCost ? Number(value.unitCost) : null,
    }))

    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId,
          action: 'update',
          note: edit?.note,
          expectedAt: edit?.expectedAt || null,
          items: items.length > 0 ? items : undefined,
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
      const response = await fetch('/api/vendor/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  async function escalatePurchaseOrder(purchaseOrderId: string) {
    const message = window.prompt('Escalation message for admin follow-up', 'Supplier delay needs admin visibility.')
    if (message === null) return

    setSaving(true)
    try {
      const response = await fetch('/api/vendor/procurement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    <VendorLayout title="Procurement" subtitle="Manage suppliers and receive purchase orders into warehouse stock">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Suppliers</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{procurementStats.suppliers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Open POs</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{procurementStats.openPurchaseOrders}</p>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs text-rose-600">Overdue POs</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{procurementStats.overduePurchaseOrders}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-600">Committed Spend</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(procurementStats.committedSpend)}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px,1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">New Supplier</h2>
          <div className="mt-4 space-y-3">
            <input value={supplierForm.name} onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Supplier name" />
            <input value={supplierForm.email} onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Email" />
            <input value={supplierForm.phone} onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Phone" />
            <textarea value={supplierForm.notes} onChange={(event) => setSupplierForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Notes" />
            <button onClick={() => void createSupplier()} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Create supplier'}
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Create Purchase Order</h2>
            <div className="mt-4 space-y-3">
              <select value={poForm.supplierId} onChange={(event) => setPoForm((prev) => ({ ...prev, supplierId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              <select value={poForm.warehouseId} onChange={(event) => setPoForm((prev) => ({ ...prev, warehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select receiving warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <input type="date" value={poForm.expectedAt} onChange={(event) => setPoForm((prev) => ({ ...prev, expectedAt: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={poForm.note} onChange={(event) => setPoForm((prev) => ({ ...prev, note: event.target.value }))} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="PO note" />
              <div className="space-y-3">
                {poForm.items.map((item, index) => {
                  const product = productMap.get(item.productId)
                  return (
                    <div key={`${item.productId}-${index}`} className="rounded-lg border border-slate-200 p-3">
                      <div className="grid gap-2">
                        <select value={item.productId} onChange={(event) => setPoForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, productId: event.target.value, variantId: '' } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <option value="">Select product</option>
                          {products.map((productOption) => (
                            <option key={productOption.id} value={productOption.id}>{productOption.name}</option>
                          ))}
                        </select>
                        <select value={item.variantId} onChange={(event) => setPoForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, variantId: event.target.value } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!product || product.variants.length === 0}>
                          <option value="">Base product</option>
                          {product?.variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>{variant.title}</option>
                          ))}
                        </select>
                        <div className="grid gap-2 md:grid-cols-3">
                          <input type="number" min={1} value={item.quantity} onChange={(event) => setPoForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Number(event.target.value) } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Quantity" />
                          <input type="number" min={0} step="0.01" value={item.unitCost} onChange={(event) => setPoForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, unitCost: event.target.value } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Unit cost" />
                          <button type="button" onClick={() => setPoForm((prev) => ({ ...prev, items: prev.items.filter((_, entryIndex) => entryIndex !== index) }))} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={() => setPoForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', variantId: '', quantity: 1, unitCost: '' }] }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Add line
              </button>
              <button onClick={() => void createPurchaseOrder()} disabled={saving} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
                Create purchase order
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Purchase Orders</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading purchase orders...</p>
          ) : purchaseOrders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No purchase orders yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {purchaseOrders.map((purchaseOrder) => (
                <article key={purchaseOrder.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{purchaseOrder.id}</p>
                      <p className="text-sm font-semibold text-slate-900">{purchaseOrder.supplier.name} to {purchaseOrder.warehouse.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(purchaseOrder.createdAt).toLocaleString()}{purchaseOrder.expectedAt ? ` | Expected ${new Date(purchaseOrder.expectedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {purchaseOrder.expectedAt && new Date(purchaseOrder.expectedAt) < new Date() && !['RECEIVED', 'CANCELLED'].includes(purchaseOrder.status) && (
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">OVERDUE</span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{purchaseOrder.status}</span>
                      {purchaseOrder.status !== 'RECEIVED' && purchaseOrder.status !== 'CANCELLED' && (
                        <button onClick={() => void receivePurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                          Receive remaining
                        </button>
                      )}
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
                        <div className="mt-2 grid gap-2 md:grid-cols-4">
                          <input
                            type="number"
                            min={item.receivedQuantity}
                            value={lineEdits[purchaseOrder.id]?.[item.id]?.quantity ?? String(item.quantity)}
                            onChange={(event) => setLineEdits((prev) => ({
                              ...prev,
                              [purchaseOrder.id]: {
                                ...(prev[purchaseOrder.id] ?? {}),
                                [item.id]: {
                                  quantity: event.target.value,
                                  unitCost: prev[purchaseOrder.id]?.[item.id]?.unitCost ?? (item.unitCost != null ? String(item.unitCost) : ''),
                                },
                              },
                            }))}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Ordered qty"
                            disabled={purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED'}
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={lineEdits[purchaseOrder.id]?.[item.id]?.unitCost ?? (item.unitCost != null ? String(item.unitCost) : '')}
                            onChange={(event) => setLineEdits((prev) => ({
                              ...prev,
                              [purchaseOrder.id]: {
                                ...(prev[purchaseOrder.id] ?? {}),
                                [item.id]: {
                                  quantity: prev[purchaseOrder.id]?.[item.id]?.quantity ?? String(item.quantity),
                                  unitCost: event.target.value,
                                },
                              },
                            }))}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Unit cost"
                            disabled={purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED'}
                          />
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
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                            Received: {item.receivedQuantity} / {item.quantity}
                          </div>
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
                          Escalate to admin
                        </button>
                      )}
                      <button onClick={() => void receivePartialPurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">
                        Receive entered quantities
                      </button>
                      <button onClick={() => void updatePurchaseOrder(purchaseOrder.id)} disabled={saving} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
                        Update PO
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
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Supplier Performance</h2>
            <p className="mt-1 text-sm text-slate-500">Track which suppliers are filling orders cleanly and which ones are slipping late.</p>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading supplier performance...</p>
        ) : supplierPerformance.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No supplier performance data yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {supplierPerformance.slice(0, 6).map((supplier) => (
              <article key={supplier.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                    <p className="text-xs text-slate-500">{supplier.purchaseOrders} purchase orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{supplier.avgFillRate.toFixed(1)}%</p>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Fill rate</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Units</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{supplier.unitsReceived} / {supplier.unitsOrdered}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Committed</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(supplier.committedSpend)}</p>
                  </div>
                </div>
                <p className={`mt-3 text-sm font-semibold ${supplier.overduePurchaseOrders > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {supplier.overduePurchaseOrders > 0
                    ? `${supplier.overduePurchaseOrders} overdue purchase orders need follow-up`
                    : 'No overdue purchase orders'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </VendorLayout>
  )
}
