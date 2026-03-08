'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'

type ProductOption = {
  id: string
  title: string
}

type ProductRecord = {
  id: string
  name: string
  variants?: ProductOption[]
}

type BundleItemForm = {
  productId: string
  variantId: string
  quantity: number
}

type BundleRecord = {
  id: string
  title: string
  description?: string | null
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  isActive: boolean
  items: Array<{
    id: string
    productId: string
    variantId?: string | null
    quantity: number
    product: { name: string }
    variant?: { title: string } | null
  }>
}

const emptyForm = {
  title: '',
  description: '',
  discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
  discountValue: '10',
  isActive: true,
  items: [
    { productId: '', variantId: '', quantity: 1 },
    { productId: '', variantId: '', quantity: 1 },
  ] as BundleItemForm[],
}

export default function AdminMarketingBundlesPage() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [bundles, setBundles] = useState<BundleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const [bundleResponse, productResponse] = await Promise.all([
      fetch('/api/admin/bundles'),
      fetch('/api/admin/products'),
    ])
    const bundleData = await bundleResponse.json()
    const productData = await productResponse.json()

    setBundles(Array.isArray(bundleData) ? bundleData : [])
    setProducts(
      Array.isArray(productData)
        ? productData.map((product: { id: string; name: string; variants?: Array<{ id: string; title: string }> }) => ({
          id: product.id,
          name: product.name,
          variants: product.variants?.map((variant) => ({ id: variant.id, title: variant.title })) ?? [],
        }))
        : []
    )
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  function startEdit(bundle: BundleRecord) {
    setEditingId(bundle.id)
    setForm({
      title: bundle.title,
      description: bundle.description ?? '',
      discountType: bundle.discountType,
      discountValue: String(bundle.discountValue),
      isActive: bundle.isActive,
      items: bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? '',
        quantity: item.quantity,
      })),
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submit() {
    setSaving(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        isActive: form.isActive,
        items: form.items.filter((item) => item.productId).map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity || 1),
        })),
      }

      const response = await fetch('/api/admin/bundles', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        alert(data.error ?? 'Failed to save bundle')
        return
      }
      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this bundle?')) return
    await fetch(`/api/admin/bundles?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  return (
    <AdminLayout title="Product Bundles" subtitle="Bundle promotions with automatic checkout savings">
      <SubsectionNav items={adminMarketingSubsections} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[420px,1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
            {editingId ? 'Edit Bundle' : 'Create Bundle'}
          </h3>
          <div className="mt-4 space-y-3">
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Bundle title" />
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="Bundle description" />
            <div className="grid gap-3 md:grid-cols-2">
              <select value={form.discountType} onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value as 'PERCENT' | 'FIXED' }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="PERCENT">Percent discount</option>
                <option value="FIXED">Fixed discount</option>
              </select>
              <input value={form.discountValue} onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Discount value" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Active bundle
            </label>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Bundle items</p>
              {form.items.map((item, index) => {
                const product = productMap.get(item.productId)
                return (
                  <div key={`${item.productId}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2">
                      <select value={item.productId} onChange={(event) => setForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, productId: event.target.value, variantId: '' } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <option value="">Select product</option>
                        {products.map((productOption) => (
                          <option key={productOption.id} value={productOption.id}>{productOption.name}</option>
                        ))}
                      </select>
                      <select value={item.variantId} onChange={(event) => setForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, variantId: event.target.value } : entry) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!product || !product.variants || product.variants.length === 0}>
                        <option value="">Any variant</option>
                        {product?.variants?.map((variant) => (
                          <option key={variant.id} value={variant.id}>{variant.title}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={item.quantity} onChange={(event) => setForm((prev) => ({ ...prev, items: prev.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Number(event.target.value) } : entry) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Quantity" />
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, entryIndex) => entryIndex !== index) }))} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', variantId: '', quantity: 1 }] }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                Add item
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => void submit()} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update bundle' : 'Create bundle'}
              </button>
              {editingId && (
                <button onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Existing Bundles</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading bundles...</p>
          ) : bundles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No bundles configured yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {bundles.map((bundle) => (
                <article key={bundle.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{bundle.title}</h4>
                      {bundle.description && <p className="mt-1 text-sm text-slate-500">{bundle.description}</p>}
                      <p className="mt-2 text-sm font-semibold text-emerald-700">
                        {bundle.discountType === 'PERCENT' ? `${bundle.discountValue}% off` : `$${bundle.discountValue} off`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${bundle.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {bundle.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    {bundle.items.map((item) => (
                      <p key={item.id}>
                        {item.quantity}x {item.product.name}{item.variant?.title ? ` (${item.variant.title})` : ''}
                      </p>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => startEdit(bundle)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                      Edit
                    </button>
                    <button onClick={() => void remove(bundle.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}
