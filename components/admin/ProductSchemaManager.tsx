'use client'

import { useState } from 'react'

type FeatureSchemaRow = {
  key: string
  label: string
  type: 'text' | 'number' | 'color' | 'image'
  required?: boolean
  filterable?: boolean
}

type FilterSchemaRow = {
  key: string
  label: string
  type: 'range' | 'rating' | 'boolean' | 'select'
  source?: 'system' | 'feature'
}

type ProductSchemaManagerProps =
  | {
      mode: 'features'
      initialRows: FeatureSchemaRow[]
    }
  | {
      mode: 'filters'
      initialRows: FilterSchemaRow[]
    }

function toKey(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function ProductSchemaManager(props: ProductSchemaManagerProps) {
  const [rows, setRows] = useState(props.initialRows)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const key = props.mode === 'features' ? 'productFeaturesSchema' : 'catalogFilterSchema'
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [key]: JSON.stringify(rows),
        }),
      })
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1600)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
            {props.mode === 'features' ? 'Feature Templates' : 'Filter Rules'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {props.mode === 'features'
              ? 'Create reusable feature definitions that product editors can turn into advanced custom attributes.'
              : 'Define storefront filtering groups without editing raw JSON.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              props.mode === 'features'
                ? { key: '', label: '', type: 'text', required: false, filterable: false }
                : { key: '', label: '', type: 'select', source: 'feature' },
            ] as typeof rows)
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {props.mode === 'features' ? 'Add feature' : 'Add filter'}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No schema rows configured yet.
          </div>
        ) : (
          rows.map((row, index) => (
            <div key={`${row.key}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_1fr_180px_160px_auto]">
              <input
                value={row.label}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, label: event.target.value, key: item.key || toKey(event.target.value) }
                        : item
                    ) as typeof prev
                  )
                }
                placeholder="Label"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                value={row.key}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, key: toKey(event.target.value) } : item)) as typeof prev
                  )
                }
                placeholder="key_name"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <select
                value={row.type}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, type: event.target.value as never } : item)) as typeof prev
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                {props.mode === 'features' ? (
                  <>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="color">Color</option>
                    <option value="image">Image</option>
                  </>
                ) : (
                  <>
                    <option value="select">Select</option>
                    <option value="range">Range</option>
                    <option value="rating">Rating</option>
                    <option value="boolean">Boolean</option>
                  </>
                )}
              </select>
              {props.mode === 'features' ? (
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean((row as FeatureSchemaRow).required)}
                      onChange={(event) =>
                        setRows((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, required: event.target.checked } : item)) as typeof prev
                        )
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean((row as FeatureSchemaRow).filterable)}
                      onChange={(event) =>
                        setRows((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, filterable: event.target.checked } : item)) as typeof prev
                        )
                      }
                    />
                    Filterable
                  </label>
                </div>
              ) : (
                <select
                  value={(row as FilterSchemaRow).source ?? 'feature'}
                  onChange={(event) =>
                    setRows((prev) =>
                      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, source: event.target.value as 'system' | 'feature' } : item)) as typeof prev
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="feature">Feature</option>
                  <option value="system">System</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, itemIndex) => itemIndex !== index) as typeof prev)}
                className="rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save schema'}
        </button>
        {saved ? <span className="text-sm font-semibold text-emerald-600">Saved</span> : null}
      </div>
    </section>
  )
}
