'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type ImportMode = 'products' | 'categories' | 'shopify'

type ImportRow = {
  rowNumber: number
  action: 'create' | 'update' | 'skip'
  identifier: string
  errors: string[]
  warnings: string[]
}

type ImportResult = {
  mode: ImportMode
  totalRows: number
  canImport: boolean
  created: number
  updated: number
  skipped: number
  rows: ImportRow[]
}

type ImportHistoryEntry = {
  id: string
  mode: ImportMode
  importedAt: string
  actorEmail?: string | null
  totalRows: number
  created: number
  updated: number
  skipped: number
  success: boolean
}

const templates: Record<ImportMode, string> = {
  products: 'name,slug,categorySlug,storeSlug,price,comparePrice,stock,status,description,shortDescription,promoText,images,tags\nTrail Shoe,trail-shoe,shoes,admin-store,89.99,99.99,14,ACTIVE,All terrain running shoe,Lightweight grip,Weekend trail promo,https://example.com/shoe.jpg|https://example.com/shoe-2.jpg,trail|sport',
  categories: 'name,slug,parentSlug,image,feePercent\nShoes,shoes,,,4\nRunning Shoes,running-shoes,shoes,https://example.com/running.jpg,5',
  shopify: 'Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Variant Image,Image Src,Status\ntrail-shoe,Trail Shoe,<p>All terrain running shoe</p>,Admin Store,Shoes,"trail, sport",TRUE,Size,42,Color,Blue,TS-42-BLU,89.99,99.99,14,https://example.com/shoe-blue.jpg,https://example.com/shoe-blue.jpg,active',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function AdminAdvancedImportPage() {
  const [mode, setMode] = useState<ImportMode>('products')
  const [csvText, setCsvText] = useState(templates.products)
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/import')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setHistory(Array.isArray(data?.history) ? data.history as ImportHistoryEntry[] : [])
        setLoadingHistory(false)
      })
      .catch(() => {
        if (!active) return
        setLoadingHistory(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function runImport(dryRun: boolean) {
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, csvText, dryRun }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data?.error ?? 'Import failed')
        return
      }
      setPreview(data as ImportResult)
      if (dryRun) {
        setMessage('Preview generated')
      } else {
        setMessage(data.canImport ? 'Import completed' : 'Import blocked by validation errors')
        const historyResponse = await fetch('/api/admin/import')
        const historyData = await historyResponse.json()
        setHistory(Array.isArray(historyData?.history) ? historyData.history as ImportHistoryEntry[] : [])
      }
    } catch {
      setMessage('Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout title="Advanced Import" subtitle="Bulk import categories and products from CSV with preview validation">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">
              Import type
              <select
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as ImportMode
                  setMode(nextMode)
                  setCsvText(templates[nextMode])
                  setPreview(null)
                  setMessage(null)
                }}
                className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="products">Products</option>
                <option value="categories">Categories</option>
                <option value="shopify">Shopify CSV</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setCsvText(templates[mode])}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Load sample
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">CSV expectations</p>
            <p className="mt-1">
              {mode === 'products'
                ? 'Required columns: name, categorySlug, price. Optional: slug, storeSlug, comparePrice, stock, status, description, shortDescription, promoText, images, tags.'
                : mode === 'categories'
                  ? 'Required columns: name. Optional: slug, parentSlug, image, feePercent.'
                  : 'Expected Shopify product export columns like Title, Handle, Body (HTML), Vendor, Type, Tags, option columns, and variant pricing/inventory fields.'}
            </p>
            <p className="mt-1">{mode === 'shopify' ? 'Tags should stay comma-separated as exported by Shopify. Repeated rows with the same handle become one product with variants.' : 'Use `|` to separate multiple images or tags inside a single cell.'}</p>
          </div>

          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={18}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm text-slate-800"
            placeholder="Paste CSV here"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runImport(true)}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {submitting ? 'Working...' : 'Preview import'}
            </button>
            <button
              type="button"
              onClick={() => void runImport(false)}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Commit import
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        </section>

        <section className="space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Preview</h2>
            {!preview ? (
              <p className="mt-3 text-sm text-slate-500">Run a preview to inspect row actions before importing.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                    <p className="text-emerald-700">Create</p>
                    <p className="text-xl font-bold text-emerald-900">{preview.created}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                    <p className="text-blue-700">Update</p>
                    <p className="text-xl font-bold text-blue-900">{preview.updated}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-700">Blocked</p>
                    <p className="text-xl font-bold text-slate-900">{preview.skipped}</p>
                  </div>
                </div>
                <p className={`text-sm ${preview.canImport ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {preview.canImport ? 'Import can proceed.' : 'Import is blocked until row errors are fixed.'}
                </p>
                <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Identifier</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.identifier}`} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{row.identifier}</td>
                          <td className="px-3 py-2 text-slate-700">{row.action}</td>
                          <td className="px-3 py-2 text-xs">
                            {row.errors.length > 0 && <p className="text-rose-700">{row.errors.join(' | ')}</p>}
                            {row.warnings.length > 0 && <p className="text-amber-700">{row.warnings.join(' | ')}</p>}
                            {row.errors.length === 0 && row.warnings.length === 0 && <p className="text-emerald-700">Ready</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Imports</h2>
            {loadingHistory ? (
              <p className="mt-3 text-sm text-slate-500">Loading import history...</p>
            ) : history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No imports recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{entry.mode}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${entry.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {entry.success ? 'Success' : 'Blocked'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500">{formatDate(entry.importedAt)}</p>
                    <p className="mt-1 text-slate-600">{entry.actorEmail ?? 'Unknown operator'}</p>
                    <p className="mt-2 text-slate-700">
                      Rows {entry.totalRows} | Created {entry.created} | Updated {entry.updated} | Skipped {entry.skipped}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </AdminLayout>
  )
}
