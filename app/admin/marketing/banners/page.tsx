'use client'

import { useEffect, useState } from 'react'
import { AddonManagedAdminPage } from '@/components/admin/AddonManagedAdminPage'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import {
  defaultStorefrontConfig,
  parseStorefrontConfig,
  serializeStorefrontConfig,
  type StorefrontBannerCard,
  type StorefrontCampaign,
  type StorefrontIntentPreset,
} from '@/lib/helpers/storefrontConfig'

function emptyBanner(): StorefrontBannerCard {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    subtitle: '',
    href: '/products',
    image: '',
    tone: 'blue',
    placementPages: ['home'],
    placementQuery: '',
    featuredCategory: '',
    priority: 0,
    isActive: true,
    startsAt: '',
    endsAt: '',
  }
}

function emptyCampaign(): StorefrontCampaign {
  return {
    slug: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    body: '',
    ctaLabel: 'Explore campaign',
    ctaHref: '/products',
    image: '',
    themeFrom: '#0f172a',
    themeVia: '#2563eb',
    themeTo: '#f59e0b',
    featuredCategory: '',
    placementPages: ['home'],
    placementQuery: '',
    priority: 50,
  }
}

function emptyIntentPreset(): StorefrontIntentPreset {
  return {
    slug: '',
    title: '',
    subtitle: '',
    href: '/products',
    pages: ['search'],
    tone: 'blue',
  }
}

export default function AdminMarketingBannersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState(defaultStorefrontConfig)

  useEffect(() => {
    fetch('/api/admin/settings').then((res) => res.json()).catch(() => null)
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

  return (
    <AddonManagedAdminPage
      addonId="banners"
      pageHref="/admin/marketing/banners"
      fallbackTitle="Banners"
      fallbackSubtitle="Campaign landing pages, banner cards, and storefront messaging"
      loadingText={loading ? 'Loading campaign configuration...' : 'Loading addon workspace...'}
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading campaign configuration...</div>
      ) : (
        <>
      <SubsectionNav items={adminMarketingSubsections} />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Homepage Banner Cards</h3>
              <p className="mt-1 text-sm text-slate-500">Short promotional cards surfaced across the storefront shell.</p>
            </div>
            <button type="button" onClick={() => setConfig((prev) => ({ ...prev, bannerCards: [...prev.bannerCards, emptyBanner()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
              Add banner
            </button>
          </div>

          <div className="space-y-3">
            {config.bannerCards.map((banner, index) => (
              <article key={`${banner.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3">
                  <input value={banner.title} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Banner title" />
                  <textarea value={banner.subtitle} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, subtitle: event.target.value } : row) }))} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Banner subtitle" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input value={banner.href} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, href: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/products" />
                    <input value={banner.image ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, image: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Image URL" />
                    <select value={banner.tone ?? 'blue'} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, tone: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option value="blue">Blue</option>
                      <option value="amber">Amber</option>
                      <option value="emerald">Emerald</option>
                      <option value="rose">Rose</option>
                      <option value="slate">Slate</option>
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <input value={banner.featuredCategory ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, featuredCategory: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Category slug (optional)" />
                    <input value={banner.placementQuery ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, placementQuery: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Query trigger (optional)" />
                    <input value={banner.priority ?? 0} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, priority: Number(event.target.value) || 0 } : row) }))} type="number" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Priority" />
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" checked={banner.isActive !== false} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, isActive: event.target.checked } : row) }))} />
                      Active
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Placement pages</p>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                      {['home', 'search', 'store', 'account', 'product', 'cart', 'checkout', 'order-success'].map((placement) => (
                        <label key={placement} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(banner.placementPages ?? []).includes(placement)}
                            onChange={(event) => setConfig((prev) => ({
                              ...prev,
                              bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? {
                                ...row,
                                placementPages: event.target.checked
                                  ? [...new Set([...(row.placementPages ?? []), placement])]
                                  : (row.placementPages ?? []).filter((value) => value !== placement),
                              } : row),
                            }))}
                          />
                          {placement}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input type="datetime-local" value={banner.startsAt ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, startsAt: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    <input type="datetime-local" value={banner.endsAt ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.map((row, rowIndex) => rowIndex === index ? { ...row, endsAt: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                  </div>
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, bannerCards: prev.bannerCards.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    Remove banner
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Campaign Landing Pages</h3>
              <p className="mt-1 text-sm text-slate-500">Create `/campaigns/[slug]` destinations with custom hero copy and category targeting.</p>
            </div>
            <button type="button" onClick={() => setConfig((prev) => ({ ...prev, campaigns: [...prev.campaigns, emptyCampaign()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
              Add campaign
            </button>
          </div>

          <div className="space-y-4">
            {config.campaigns.map((campaign, index) => (
              <article key={`${campaign.slug}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={campaign.slug} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, slug: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="slug" />
                    <input value={campaign.eyebrow} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, eyebrow: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Eyebrow" />
                  </div>
                  <input value={campaign.title} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Campaign title" />
                  <textarea value={campaign.subtitle} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, subtitle: event.target.value } : row) }))} rows={2} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Campaign subtitle" />
                  <textarea value={campaign.body} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, body: event.target.value } : row) }))} rows={4} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Campaign body content" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input value={campaign.ctaLabel} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, ctaLabel: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="CTA label" />
                    <input value={campaign.ctaHref} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, ctaHref: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/products" />
                    <input value={campaign.featuredCategory ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, featuredCategory: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Category slug (optional)" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={campaign.placementQuery ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, placementQuery: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Query trigger (optional)" />
                    <input value={campaign.priority ?? 0} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, priority: Number(event.target.value) || 0 } : row) }))} type="number" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Priority" />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Placement pages</p>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                      {['home', 'search', 'store', 'account', 'product', 'cart', 'checkout', 'order-success'].map((placement) => (
                        <label key={placement} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(campaign.placementPages ?? []).includes(placement)}
                            onChange={(event) => setConfig((prev) => ({
                              ...prev,
                              campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? {
                                ...row,
                                placementPages: event.target.checked
                                  ? [...new Set([...(row.placementPages ?? []), placement])]
                                  : (row.placementPages ?? []).filter((value) => value !== placement),
                              } : row),
                            }))}
                          />
                          {placement}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <input value={campaign.image ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, image: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-1" placeholder="Image URL" />
                    <input value={campaign.themeFrom ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, themeFrom: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient from" />
                    <input value={campaign.themeVia ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, themeVia: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient via" />
                    <input value={campaign.themeTo ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.map((row, rowIndex) => rowIndex === index ? { ...row, themeTo: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient to" />
                  </div>
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, campaigns: prev.campaigns.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    Remove campaign
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
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Buyer Intent Presets</h3>
            <p className="mt-1 text-sm text-slate-500">Curated rails for different buyer intents across discovery and conversion pages.</p>
          </div>
          <button type="button" onClick={() => setConfig((prev) => ({ ...prev, intentPresets: [...prev.intentPresets, emptyIntentPreset()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
            Add preset
          </button>
        </div>
        <div className="space-y-4">
          {config.intentPresets.map((preset, index) => (
            <article key={`${preset.slug}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={preset.slug} onChange={(event) => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? { ...row, slug: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="slug" />
                  <input value={preset.title} onChange={(event) => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Preset title" />
                </div>
                <textarea value={preset.subtitle} onChange={(event) => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? { ...row, subtitle: event.target.value } : row) }))} rows={2} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Preset subtitle" />
                <div className="grid gap-3 md:grid-cols-3">
                  <input value={preset.href} onChange={(event) => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? { ...row, href: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="/products" />
                  <select value={preset.tone ?? 'blue'} onChange={(event) => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? { ...row, tone: event.target.value } : row) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="blue">Blue</option>
                    <option value="amber">Amber</option>
                    <option value="emerald">Emerald</option>
                    <option value="rose">Rose</option>
                    <option value="slate">Slate</option>
                  </select>
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, intentPresets: prev.intentPresets.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    Remove preset
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Pages</p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                    {['search', 'cart', 'checkout', 'account', 'order-success'].map((page) => (
                      <label key={page} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(preset.pages ?? []).includes(page)}
                          onChange={(event) => setConfig((prev) => ({
                            ...prev,
                            intentPresets: prev.intentPresets.map((row, rowIndex) => rowIndex === index ? {
                              ...row,
                              pages: event.target.checked
                                ? [...new Set([...(row.pages ?? []), page])]
                                : (row.pages ?? []).filter((value) => value !== page),
                            } : row),
                          }))}
                        />
                        {page}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save storefront campaigns'}
        </button>
        {saved ? <span className="text-sm font-semibold text-emerald-600">Saved</span> : null}
      </div>
        </>
      )}
    </AddonManagedAdminPage>
  )
}
