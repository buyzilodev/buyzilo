'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'
import {
  defaultStorefrontConfig,
  parseStorefrontConfig,
  serializeStorefrontConfig,
  type StorefrontDiscoveryRoute,
  type StorefrontFooterColumn,
  type StorefrontMenuItem,
  type StorefrontSearchPromotion,
} from '@/lib/helpers/storefrontConfig'

function emptyMenuItem(): StorefrontMenuItem {
  return { title: '', href: '/', highlight: false, children: [] }
}

function emptyFooterColumn(): StorefrontFooterColumn {
  return { title: '', links: [{ title: '', href: '/' }] }
}

function emptyDiscoveryRoute(): StorefrontDiscoveryRoute {
  return { title: '', href: '/products', description: '' }
}

function emptySearchPromotion(): StorefrontSearchPromotion {
  return { query: '', title: '', href: '/products', description: '' }
}

export default function AdminWebsiteMenusPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState(defaultStorefrontConfig)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) {
          setConfig(parseStorefrontConfig(data.storefrontConfig))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontConfig: serializeStorefrontConfig(config) }),
      })
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1600)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Menus" subtitle="Header and footer storefront management">
        <div className="py-10 text-center text-sm text-slate-500">Loading menu configuration...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Menus" subtitle="Professional storefront navigation and footer builder">
      <SubsectionNav items={adminWebsiteSubsections} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Header Menu</h3>
              <p className="mt-1 text-sm text-slate-500">Top-level navigation with optional dropdown children and highlight state.</p>
            </div>
            <button type="button" onClick={() => setConfig((prev) => ({ ...prev, headerMenu: [...prev.headerMenu, emptyMenuItem()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
              Add item
            </button>
          </div>

          <div className="space-y-3">
            {config.headerMenu.map((item, index) => (
              <article key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input value={item.title} onChange={(event) => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Title" />
                  <input value={item.href} onChange={(event) => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, href: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/path" />
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    Remove
                  </button>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={item.highlight === true} onChange={(event) => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, highlight: event.target.checked } : row) }))} />
                  Highlight as CTA
                </label>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dropdown links</p>
                    <button type="button" onClick={() => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, children: [...(row.children ?? []), { title: '', href: '/' }] } : row) }))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold">
                      Add child
                    </button>
                  </div>
                  {(item.children ?? []).map((child, childIndex) => (
                    <div key={`${child.title}-${childIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input value={child.title} onChange={(event) => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, children: (row.children ?? []).map((entry, entryIndex) => entryIndex === childIndex ? { ...entry, title: event.target.value } : entry) } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Child title" />
                      <input value={child.href} onChange={(event) => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, children: (row.children ?? []).map((entry, entryIndex) => entryIndex === childIndex ? { ...entry, href: event.target.value } : entry) } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/child-path" />
                      <button type="button" onClick={() => setConfig((prev) => ({ ...prev, headerMenu: prev.headerMenu.map((row, rowIndex) => rowIndex === index ? { ...row, children: (row.children ?? []).filter((_, entryIndex) => entryIndex !== childIndex) } : row) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Footer Builder</h3>
              <p className="mt-1 text-sm text-slate-500">Compose grouped footer columns instead of a flat JSON link list.</p>
            </div>
            <button type="button" onClick={() => setConfig((prev) => ({ ...prev, footerColumns: [...prev.footerColumns, emptyFooterColumn()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
              Add column
            </button>
          </div>

          <div className="space-y-3">
            {config.footerColumns.map((column, index) => (
              <article key={`${column.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <input value={column.title} onChange={(event) => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Column title" />
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    Remove
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {column.links.map((link, linkIndex) => (
                    <div key={`${link.title}-${linkIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input value={link.title} onChange={(event) => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.map((row, rowIndex) => rowIndex === index ? { ...row, links: row.links.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, title: event.target.value } : entry) } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Link title" />
                      <input value={link.href} onChange={(event) => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.map((row, rowIndex) => rowIndex === index ? { ...row, links: row.links.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, href: event.target.value } : entry) } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/link-path" />
                      <button type="button" onClick={() => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.map((row, rowIndex) => rowIndex === index ? { ...row, links: row.links.filter((_, entryIndex) => entryIndex !== linkIndex) } : row) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, footerColumns: prev.footerColumns.map((row, rowIndex) => rowIndex === index ? { ...row, links: [...row.links, { title: '', href: '/' }] } : row) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
                    Add footer link
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Discovery Routes</h3>
            <p className="mt-1 text-sm text-slate-500">Reusable storefront entry points for search, compare, stores, and campaign-driven navigation.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, discoveryRoutes: [...prev.discoveryRoutes, emptyDiscoveryRoute()] }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
          >
            Add route
          </button>
        </div>

        <div className="space-y-3">
          {config.discoveryRoutes.map((route, index) => (
            <article key={`${route.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={route.title}
                  onChange={(event) => setConfig((prev) => ({ ...prev, discoveryRoutes: prev.discoveryRoutes.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Route title"
                />
                <input
                  value={route.href}
                  onChange={(event) => setConfig((prev) => ({ ...prev, discoveryRoutes: prev.discoveryRoutes.map((row, rowIndex) => rowIndex === index ? { ...row, href: event.target.value } : row) }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="/products?sort=newest"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, discoveryRoutes: prev.discoveryRoutes.filter((_, rowIndex) => rowIndex !== index) }))}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={route.description}
                onChange={(event) => setConfig((prev) => ({ ...prev, discoveryRoutes: prev.discoveryRoutes.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row) }))}
                rows={2}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Short description"
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Search Promotions</h3>
            <p className="mt-1 text-sm text-slate-500">Promote curated destinations when buyer queries match important commercial intents.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, searchPromotions: [...prev.searchPromotions, emptySearchPromotion()] }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
          >
            Add promotion
          </button>
        </div>

        <div className="space-y-3">
          {config.searchPromotions.map((promotion, index) => (
            <article key={`${promotion.query}-${promotion.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
                <input
                  value={promotion.query}
                  onChange={(event) => setConfig((prev) => ({ ...prev, searchPromotions: prev.searchPromotions.map((row, rowIndex) => rowIndex === index ? { ...row, query: event.target.value } : row) }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="search term"
                />
                <input
                  value={promotion.title}
                  onChange={(event) => setConfig((prev) => ({ ...prev, searchPromotions: prev.searchPromotions.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Promotion title"
                />
                <input
                  value={promotion.href}
                  onChange={(event) => setConfig((prev) => ({ ...prev, searchPromotions: prev.searchPromotions.map((row, rowIndex) => rowIndex === index ? { ...row, href: event.target.value } : row) }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="/products?maxPrice=100"
                />
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, searchPromotions: prev.searchPromotions.filter((_, rowIndex) => rowIndex !== index) }))}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={promotion.description}
                onChange={(event) => setConfig((prev) => ({ ...prev, searchPromotions: prev.searchPromotions.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row) }))}
                rows={2}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Short description"
              />
            </article>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save menu system'}
        </button>
        {saved ? <span className="text-sm font-semibold text-emerald-600">Saved</span> : null}
      </div>
    </AdminLayout>
  )
}
