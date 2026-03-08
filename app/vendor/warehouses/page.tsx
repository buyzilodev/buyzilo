'use client'

import { useEffect, useMemo, useState } from 'react'
import { VendorLayout } from '@/components/vendor/VendorLayout'

type Warehouse = {
  id: string
  name: string
  code?: string | null
  city?: string | null
  country?: string | null
  isDefault: boolean
  isActive: boolean
  stocks: Array<{
    id: string
    quantity: number
    product: { id: string; name: string }
    variant?: { id: string; title: string } | null
  }>
}

type Product = {
  id: string
  name: string
  stock: number
  variants: Array<{ id: string; title: string; stock: number }>
}

type Adjustment = {
  id: string
  type: 'SET' | 'ADJUST' | 'RESTOCK' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REMOVE'
  quantity: number
  note?: string | null
  createdAt: string
  warehouse: { id: string; name: string }
  product: { id: string; name: string }
  variant?: { id: string; title: string } | null
  actor?: { id: string; name?: string | null; email?: string | null } | null
}

function formatLocation(warehouse: Warehouse) {
  return [warehouse.city, warehouse.country].filter(Boolean).join(', ') || 'No location'
}

export default function VendorWarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    city: '',
    country: '',
    isDefault: false,
  })
  const [stockForm, setStockForm] = useState({
    warehouseId: '',
    productId: '',
    variantId: '',
    quantity: '0',
  })
  const [restockForm, setRestockForm] = useState({
    warehouseId: '',
    productId: '',
    variantId: '',
    quantity: '0',
  })
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    variantId: '',
    quantity: '0',
  })
  const [adjustmentForm, setAdjustmentForm] = useState({
    warehouseId: '',
    productId: '',
    variantId: '',
    quantity: '0',
    note: '',
  })

  async function load() {
    const response = await fetch('/api/vendor/warehouses')
    const data = await response.json()
    setWarehouses(data.warehouses ?? [])
    setProducts(data.products ?? [])
    setAdjustments(data.adjustments ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === stockForm.productId),
    [products, stockForm.productId]
  )
  const selectedRestockProduct = useMemo(
    () => products.find((product) => product.id === restockForm.productId),
    [products, restockForm.productId]
  )
  const selectedTransferProduct = useMemo(
    () => products.find((product) => product.id === transferForm.productId),
    [products, transferForm.productId]
  )
  const selectedAdjustmentProduct = useMemo(
    () => products.find((product) => product.id === adjustmentForm.productId),
    [products, adjustmentForm.productId]
  )

  async function createWarehouse() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'warehouse',
          ...warehouseForm,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to create warehouse')
        return
      }
      setWarehouseForm({ name: '', code: '', city: '', country: '', isDefault: false })
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function saveStock() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stock',
          warehouseId: stockForm.warehouseId,
          productId: stockForm.productId,
          variantId: stockForm.variantId || undefined,
          quantity: Number(stockForm.quantity || 0),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to save inventory')
        return
      }
      setStockForm((prev) => ({ ...prev, quantity: '0' }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function restockStock() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'restock',
          warehouseId: restockForm.warehouseId,
          productId: restockForm.productId,
          variantId: restockForm.variantId || undefined,
          quantity: Number(restockForm.quantity || 0),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to restock inventory')
        return
      }
      setRestockForm((prev) => ({ ...prev, quantity: '0' }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function transferStock() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transfer',
          fromWarehouseId: transferForm.fromWarehouseId,
          toWarehouseId: transferForm.toWarehouseId,
          productId: transferForm.productId,
          variantId: transferForm.variantId || undefined,
          quantity: Number(transferForm.quantity || 0),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to transfer inventory')
        return
      }
      setTransferForm((prev) => ({ ...prev, quantity: '0' }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function adjustStock() {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'adjust',
          warehouseId: adjustmentForm.warehouseId,
          productId: adjustmentForm.productId,
          variantId: adjustmentForm.variantId || undefined,
          quantity: Number(adjustmentForm.quantity || 0),
          note: adjustmentForm.note,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to adjust inventory')
        return
      }
      setAdjustmentForm((prev) => ({ ...prev, quantity: '0', note: '' }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function setDefaultWarehouse(warehouseId: string) {
    await fetch('/api/vendor/warehouses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouseId, isDefault: true }),
    })
    await load()
  }

  async function removeStock(stockId: string) {
    await fetch(`/api/vendor/warehouses?stockId=${encodeURIComponent(stockId)}`, { method: 'DELETE' })
    await load()
  }

  return (
    <VendorLayout title="Warehouses" subtitle="Manage warehouse locations and inventory allocation">
      <div className="grid gap-4 xl:grid-cols-[380px,1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">New Warehouse</h2>
          <div className="mt-4 space-y-3">
            <input value={warehouseForm.name} onChange={(event) => setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Warehouse name" />
            <input value={warehouseForm.code} onChange={(event) => setWarehouseForm((prev) => ({ ...prev, code: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Code" />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={warehouseForm.city} onChange={(event) => setWarehouseForm((prev) => ({ ...prev, city: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="City" />
              <input value={warehouseForm.country} onChange={(event) => setWarehouseForm((prev) => ({ ...prev, country: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Country" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={warehouseForm.isDefault} onChange={(event) => setWarehouseForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              Set as default warehouse
            </label>
            <button onClick={() => void createWarehouse()} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create warehouse'}
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Allocate Inventory</h2>
            <div className="mt-4 space-y-3">
              <select value={stockForm.warehouseId} onChange={(event) => setStockForm((prev) => ({ ...prev, warehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select value={stockForm.productId} onChange={(event) => setStockForm((prev) => ({ ...prev, productId: event.target.value, variantId: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <select value={stockForm.variantId} onChange={(event) => setStockForm((prev) => ({ ...prev, variantId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!selectedProduct || selectedProduct.variants.length === 0}>
                <option value="">Base product stock</option>
                {selectedProduct?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.title}</option>
                ))}
              </select>
              <input type="number" min={0} value={stockForm.quantity} onChange={(event) => setStockForm((prev) => ({ ...prev, quantity: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Quantity" />
              <button onClick={() => void saveStock()} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                Save allocation
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Restock Inventory</h2>
            <div className="mt-4 space-y-3">
              <select value={restockForm.warehouseId} onChange={(event) => setRestockForm((prev) => ({ ...prev, warehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select value={restockForm.productId} onChange={(event) => setRestockForm((prev) => ({ ...prev, productId: event.target.value, variantId: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <select value={restockForm.variantId} onChange={(event) => setRestockForm((prev) => ({ ...prev, variantId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!selectedRestockProduct || selectedRestockProduct.variants.length === 0}>
                <option value="">Base product stock</option>
                {selectedRestockProduct?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.title}</option>
                ))}
              </select>
              <input type="number" min={1} value={restockForm.quantity} onChange={(event) => setRestockForm((prev) => ({ ...prev, quantity: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Units to add" />
              <button onClick={() => void restockStock()} disabled={saving} className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
                Add stock
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Transfer Inventory</h2>
            <div className="mt-4 space-y-3">
              <select value={transferForm.fromWarehouseId} onChange={(event) => setTransferForm((prev) => ({ ...prev, fromWarehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">From warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select value={transferForm.toWarehouseId} onChange={(event) => setTransferForm((prev) => ({ ...prev, toWarehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">To warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select value={transferForm.productId} onChange={(event) => setTransferForm((prev) => ({ ...prev, productId: event.target.value, variantId: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <select value={transferForm.variantId} onChange={(event) => setTransferForm((prev) => ({ ...prev, variantId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!selectedTransferProduct || selectedTransferProduct.variants.length === 0}>
                <option value="">Base product stock</option>
                {selectedTransferProduct?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.title}</option>
                ))}
              </select>
              <input type="number" min={1} value={transferForm.quantity} onChange={(event) => setTransferForm((prev) => ({ ...prev, quantity: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Units to move" />
              <button onClick={() => void transferStock()} disabled={saving} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
                Transfer stock
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Manual Adjustment</h2>
            <div className="mt-4 space-y-3">
              <select value={adjustmentForm.warehouseId} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, warehouseId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              <select value={adjustmentForm.productId} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, productId: event.target.value, variantId: '' }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <select value={adjustmentForm.variantId} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, variantId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!selectedAdjustmentProduct || selectedAdjustmentProduct.variants.length === 0}>
                <option value="">Base product stock</option>
                {selectedAdjustmentProduct?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.title}</option>
                ))}
              </select>
              <input type="number" value={adjustmentForm.quantity} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, quantity: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Use positive or negative integer" />
              <input value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, note: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Reason / note" />
              <button onClick={() => void adjustStock()} disabled={saving} className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50">
                Apply adjustment
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Warehouse Network</h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading warehouses...</p>
            ) : warehouses.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No warehouses yet. Create your first location to start allocating inventory.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {warehouses.map((warehouse) => (
                  <article key={warehouse.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{warehouse.name}</h3>
                          {warehouse.isDefault && <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">DEFAULT</span>}
                        </div>
                        <p className="text-sm text-slate-500">{warehouse.code || 'No code'} | {formatLocation(warehouse)}</p>
                      </div>
                      {!warehouse.isDefault && (
                        <button onClick={() => void setDefaultWarehouse(warehouse.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                          Make default
                        </button>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Inventory</p>
                      {warehouse.stocks.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">No stock allocated here yet.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {warehouse.stocks.map((stock) => (
                            <div key={stock.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {stock.product.name}{stock.variant?.title ? ` (${stock.variant.title})` : ''}
                                </p>
                                <p className="text-xs text-slate-500">{stock.quantity} units</p>
                              </div>
                              <button onClick={() => void removeStock(stock.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Adjustment History</h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading history...</p>
            ) : adjustments.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No inventory activity yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {adjustments.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.type} {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity} on {entry.product.name}{entry.variant?.title ? ` (${entry.variant.title})` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.warehouse.name} | {entry.actor?.name || entry.actor?.email || 'System'} | {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {entry.note && <p className="mt-2 text-sm text-slate-600">{entry.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </VendorLayout>
  )
}
