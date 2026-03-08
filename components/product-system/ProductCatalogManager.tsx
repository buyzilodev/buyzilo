'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'

type CatalogProduct = {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  productType?: 'PHYSICAL' | 'DIGITAL'
  listingType?: 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS'
  detailsLanguage?: string
  images?: string[]
  isActive?: boolean
  approvalStatus?: string
  approvalNote?: string | null
  createdAt?: string
  updatedAt?: string
  category?: { name?: string | null } | null
  store?: { name?: string | null } | null
  quoteRequestCount?: number
  openQuoteRequestCount?: number
  availableLicenseKeys?: number
  digitalDownloadCount?: number
  variantCount?: number
  riskFlags?: string[]
}

type ProductCatalogManagerProps = {
  title: string
  subtitle: string
  apiPath: string
  createHref: string
  editBaseHref: string
  canCreate?: boolean
  canBulkModerate?: boolean
  quickLinks?: Array<{
    href: string
    label: string
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function signalBadgeClass(tone: 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate') {
  const classes = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }

  return classes[tone]
}

export function ProductCatalogManager({
  title,
  subtitle,
  apiPath,
  createHref,
  editBaseHref,
  canCreate = true,
  canBulkModerate = true,
  quickLinks = [],
}: ProductCatalogManagerProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [listingType, setListingType] = useState('ALL')
  const [productType, setProductType] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('NONE')
  const [actionLoading, setActionLoading] = useState(false)

  const isAdmin = apiPath.startsWith('/api/admin/')

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        const response = await fetch(apiPath)
        const data = await response.json()
        if (Array.isArray(data)) {
          setProducts(data)
        } else {
          setProducts(Array.isArray(data.products) ? data.products : [])
        }
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [apiPath])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term) ||
        (product.category?.name ?? '').toLowerCase().includes(term) ||
        (product.store?.name ?? '').toLowerCase().includes(term)

      const normalizedStatus = product.approvalStatus ?? (product.isActive ? 'APPROVED' : 'DISABLED')
      const matchesStatus = status === 'ALL' || normalizedStatus === status
      const matchesListingType = listingType === 'ALL' || (product.listingType ?? 'FOR_SALE') === listingType
      const matchesProductType = productType === 'ALL' || (product.productType ?? 'PHYSICAL') === productType
      return matchesSearch && matchesStatus && matchesListingType && matchesProductType
    })
  }, [listingType, productType, products, search, status])

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((product) => product.isActive !== false).length,
    pending: products.filter((product) => product.approvalStatus === 'PENDING').length,
    outOfStock: products.filter((product) => product.stock <= 0).length,
    quoteListings: products.filter((product) => product.listingType === 'QUOTE_REQUEST').length,
    openQuotes: products.reduce((sum, product) => sum + (product.openQuoteRequestCount ?? 0), 0),
    digitalListings: products.filter((product) => product.productType === 'DIGITAL').length,
    productsWithFiles: products.filter((product) => (product.digitalDownloadCount ?? 0) > 0).length,
    licenseListings: products.filter((product) => product.listingType === 'LICENSE_KEYS').length,
    availableKeys: products.reduce((sum, product) => sum + (product.availableLicenseKeys ?? 0), 0),
    atRisk: products.filter((product) => (product.riskFlags?.length ?? 0) > 0).length,
  }), [products])

  const rollups = useMemo(() => {
    const categoryMap = new Map<string, number>()
    const storeMap = new Map<string, number>()

    for (const product of filtered) {
      const categoryName = product.category?.name?.trim() || 'Uncategorized'
      const storeName = product.store?.name?.trim() || 'Platform'
      categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + 1)
      storeMap.set(storeName, (storeMap.get(storeName) ?? 0) + 1)
    }

    const topCategories = Array.from(categoryMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
    const topStores = Array.from(storeMap.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)

    return { topCategories, topStores }
  }, [filtered])

  async function runBulkAction() {
    if (selectedIds.length === 0 || bulkAction === 'NONE') {
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: bulkAction,
        }),
      })
      if (!response.ok) {
        return
      }
      setSelectedIds([])
      setBulkAction('NONE')
      setLoading(true)
      const refresh = await fetch(apiPath)
      const data = await refresh.json()
      if (Array.isArray(data)) {
        setProducts(data)
      } else {
        setProducts(Array.isArray(data.products) ? data.products : [])
      }
    } finally {
      setLoading(false)
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {link.label}
            </Link>
          ))}
          {canCreate ? (
            <Link href={createHref} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              New product
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Catalog Size</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{stats.active}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Pending Review</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{stats.pending}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Out of Stock</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{stats.outOfStock}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Commercial Signals</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Quote Listings</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{stats.quoteListings}</p>
              <p className="text-xs text-slate-500">{stats.openQuotes} open requests</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Digital Listings</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{stats.digitalListings}</p>
              <p className="text-xs text-slate-500">{stats.productsWithFiles} with files ready</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">License Listings</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{stats.licenseListings}</p>
              <p className="text-xs text-slate-500">{stats.availableKeys} keys available</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Review Risk Watch</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{stats.atRisk}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Products needing attention
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Pending review', 'Quote pressure', 'No license stock', 'No download files', 'Out of stock'].map((flag) => {
              const count = products.filter((product) => product.riskFlags?.includes(flag)).length
              if (count === 0) {
                return null
              }
              return (
                <span key={flag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {flag}: {count}
                </span>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Current Rollups</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Top categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {rollups.topCategories.length > 0 ? rollups.topCategories.map(([name, count]) => (
                  <span key={name} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {name} ({count})
                  </span>
                )) : <span className="text-xs text-slate-500">No categories in current view</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Top stores</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {rollups.topStores.length > 0 ? rollups.topStores.map(([name, count]) => (
                  <span key={name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {name} ({count})
                  </span>
                )) : <span className="text-xs text-slate-500">No stores in current view</span>}
              </div>
            </div>
          </div>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((product) => selectedIds.includes(product.id))}
              onChange={(event) =>
                setSelectedIds(event.target.checked ? filtered.map((product) => product.id) : [])
              }
            />
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {selectedIds.length} selected
            </span>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, categories, or stores"
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DISABLED'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={productType} onChange={(event) => setProductType(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
            {['ALL', 'PHYSICAL', 'DIGITAL'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={listingType} onChange={(event) => setListingType(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
            {['ALL', 'FOR_SALE', 'ORDINARY', 'QUOTE_REQUEST', 'LICENSE_KEYS'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            disabled={!canBulkModerate}
          >
            <option value="NONE">Bulk action</option>
            {isAdmin && canBulkModerate ? (
              <>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="ACTIVATE">Activate</option>
                <option value="DISABLE">Disable</option>
              </>
            ) : (
              <>
                <option value="ACTIVATE">Activate</option>
                <option value="DISABLE">Disable</option>
              </>
            )}
          </select>
          <button
            type="button"
            onClick={() => void runBulkAction()}
            disabled={!canBulkModerate || actionLoading || bulkAction === 'NONE' || selectedIds.length === 0}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {actionLoading ? 'Applying...' : 'Apply'}
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading products...</p>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">No products found</p>
            <p className="mt-1 text-sm text-slate-500">Adjust the filters or create a new product.</p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Vendor</th>
                  <th className="pb-3">Commercial</th>
                  <th className="pb-3">Signals</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Stock</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const statusLabel = product.approvalStatus ?? (product.isActive ? 'APPROVED' : 'DISABLED')
                  return (
                    <tr key={product.id} className="border-b border-slate-100 align-top">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={(event) =>
                              setSelectedIds((prev) =>
                                event.target.checked ? [...prev, product.id] : prev.filter((id) => id !== product.id)
                              )
                            }
                          />
                          <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-700">{product.category?.name ?? 'Uncategorized'}</td>
                      <td className="py-4 text-slate-700">{product.store?.name ?? 'Platform'}</td>
                      <td className="py-4">
                        <div className="space-y-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {product.productType === 'DIGITAL' ? 'Digital' : 'Physical'}
                          </span>
                          <div className="text-xs font-semibold text-slate-500">
                            {(product.listingType ?? 'FOR_SALE').replaceAll('_', ' ')}
                          </div>
                          <div className="text-xs text-slate-400">
                            {product.variantCount ?? 0} variants
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex max-w-60 flex-wrap gap-2">
                          {(product.openQuoteRequestCount ?? 0) > 0 ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${signalBadgeClass('sky')}`}>
                              Quotes {product.openQuoteRequestCount}
                            </span>
                          ) : null}
                          {(product.availableLicenseKeys ?? 0) > 0 ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${signalBadgeClass('violet')}`}>
                              Keys {product.availableLicenseKeys}
                            </span>
                          ) : null}
                          {(product.digitalDownloadCount ?? 0) > 0 ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${signalBadgeClass('emerald')}`}>
                              Files {product.digitalDownloadCount}
                            </span>
                          ) : null}
                          {product.riskFlags?.slice(0, 2).map((flag) => (
                            <span key={flag} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${signalBadgeClass('amber')}`}>
                              {flag}
                            </span>
                          ))}
                          {(product.riskFlags?.length ?? 0) > 2 ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${signalBadgeClass('slate')}`}>
                              +{(product.riskFlags?.length ?? 0) - 2} more
                            </span>
                          ) : null}
                          {(product.openQuoteRequestCount ?? 0) === 0 &&
                          (product.availableLicenseKeys ?? 0) === 0 &&
                          (product.digitalDownloadCount ?? 0) === 0 &&
                          (product.riskFlags?.length ?? 0) === 0 ? (
                            <span className="text-xs text-slate-400">No active signals</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-slate-900">{formatCurrency(product.price)}</td>
                      <td className="py-4">
                        <span className={product.stock > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          statusLabel === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : statusLabel === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {statusLabel}
                        </span>
                        {product.approvalNote ? <p className="mt-1 max-w-56 text-xs text-slate-500">{product.approvalNote}</p> : null}
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {canBulkModerate || !isAdmin ? (
                            <Link href={`${editBaseHref}/${product.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Edit workspace
                            </Link>
                          ) : (
                            <Link href={`${editBaseHref}/${product.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                              Review
                            </Link>
                          )}
                          <Link href={`/products/${product.slug}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                            Preview
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
