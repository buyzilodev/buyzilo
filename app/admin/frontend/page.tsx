'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'
import {
  defaultHomepageConfig,
  parseHomepageConfig,
  serializeHomepageConfig,
  type HomepageConfig,
  type HomepageFeatureCard,
  type HomepageHeroSlide,
  type HomepageSectionConfig,
} from '@/lib/helpers/homepageConfig'

type FrontendSettings = {
  siteName: string
  tagline: string
  sellerCtaLabel: string
  supportPhone: string
  supportEmail: string
  primaryColor: string
  secondaryColor: string
  footerText: string
}

const initialBranding: FrontendSettings = {
  siteName: 'Buyzilo',
  tagline: 'Shop Everything You Love',
  sellerCtaLabel: 'Sell on Buyzilo',
  supportPhone: '+1 (800) BUYZILO',
  supportEmail: 'support@buyzilo.com',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  footerText: 'All rights reserved.',
}

function emptySlide(): HomepageHeroSlide {
  return {
    eyebrow: '',
    title: '',
    subtitle: '',
    href: '/products',
    ctaLabel: 'Shop now',
    secondaryHref: '',
    secondaryLabel: '',
    image: '',
    themeFrom: '#0f172a',
    themeVia: '#1d4ed8',
    themeTo: '#0f766e',
  }
}

function emptyFeature(): HomepageFeatureCard {
  return { title: '', subtitle: '' }
}

export default function FrontendManagerPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [branding, setBranding] = useState<FrontendSettings>(initialBranding)
  const [config, setConfig] = useState<HomepageConfig>(defaultHomepageConfig)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) return
        setBranding((prev) => ({ ...prev, ...(data as Partial<FrontendSettings>) }))
        setConfig(parseHomepageConfig((data as { homepageConfig?: string }).homepageConfig))
      })
      .finally(() => setLoading(false))
  }, [])

  const enabledCount = useMemo(() => config.sections.filter((section) => section.enabled).length, [config.sections])

  function updateSection(id: HomepageSectionConfig['id'], patch: Partial<HomepageSectionConfig>) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    }))
  }

  function moveSection(id: HomepageSectionConfig['id'], direction: -1 | 1) {
    setConfig((prev) => {
      const index = prev.sections.findIndex((section) => section.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.sections.length) return prev
      const sections = [...prev.sections]
      const [moved] = sections.splice(index, 1)
      sections.splice(nextIndex, 0, moved)
      return { ...prev, sections }
    })
  }

  async function saveAll() {
    setSaving(true)
    setSaved(false)

    const payload = {
      ...branding,
      homepageConfig: serializeHomepageConfig(config),
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <AdminLayout title="Frontend Control Center" subtitle="Homepage merchandising and storefront branding">
        <div className="py-10 text-center text-sm text-slate-500">Loading frontend configuration...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Frontend Control Center" subtitle="Rebuilt homepage management with structured admin controls">
      <SubsectionNav items={adminWebsiteSubsections} />

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Homepage Sections</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{config.sections.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Enabled Sections</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{enabledCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Hero Slides</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{config.heroSlides.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Trust Cards</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{config.featureCards.length}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Homepage Section Planner</h3>
              <p className="mt-1 text-sm text-slate-500">Turn sections on or off, set copy, counts, and display order.</p>
            </div>
          </div>

          <div className="space-y-3">
            {config.sections.map((section, index) => (
              <article key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                    <p className="text-xs text-slate-500">{section.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moveSection(section.id, -1)} disabled={index === 0} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                      Up
                    </button>
                    <button type="button" onClick={() => moveSection(section.id, 1)} disabled={index === config.sections.length - 1} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                      Down
                    </button>
                    <button type="button" onClick={() => updateSection(section.id, { enabled: !section.enabled })} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${section.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {section.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
                  <input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Section title" />
                  <input value={section.subtitle} onChange={(event) => updateSection(section.id, { subtitle: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Section subtitle" />
                  <input type="number" min={1} max={24} value={section.count} onChange={(event) => updateSection(section.id, { count: Math.max(1, Math.min(24, Number(event.target.value) || 1)) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Count" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Branding</h3>
            <div className="grid gap-3">
              <input value={branding.siteName} onChange={(event) => setBranding({ ...branding, siteName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Site name" />
              <input value={branding.tagline} onChange={(event) => setBranding({ ...branding, tagline: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tagline" />
              <input value={branding.sellerCtaLabel} onChange={(event) => setBranding({ ...branding, sellerCtaLabel: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Seller CTA label" />
              <input value={branding.supportPhone} onChange={(event) => setBranding({ ...branding, supportPhone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Support phone" />
              <input value={branding.supportEmail} onChange={(event) => setBranding({ ...branding, supportEmail: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Support email" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={branding.primaryColor} onChange={(event) => setBranding({ ...branding, primaryColor: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Primary color" />
                <input value={branding.secondaryColor} onChange={(event) => setBranding({ ...branding, secondaryColor: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Secondary color" />
              </div>
              <input value={branding.footerText} onChange={(event) => setBranding({ ...branding, footerText: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Footer text" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Page Template Copy</h3>
            <div className="grid gap-3">
              <input value={config.templates.catalogHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, catalogHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Catalog hero title" />
              <input value={config.templates.catalogHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, catalogHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Catalog hero subtitle" />
              <input value={config.templates.categoryHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, categoryHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Category hero title (use {category})" />
              <input value={config.templates.categoryHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, categoryHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Category hero subtitle (use {category})" />
              <input value={config.templates.storesHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, storesHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Stores hero title" />
              <input value={config.templates.storesHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, storesHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Stores hero subtitle" />
              <input value={config.templates.storeHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, storeHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Store page hero title" />
              <input value={config.templates.storeHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, storeHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Store page hero subtitle" />
              <input value={config.templates.blogHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, blogHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Blog hero title" />
              <input value={config.templates.blogHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, blogHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Blog hero subtitle" />
              <input value={config.templates.productHeroTitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, productHeroTitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Product page hero title" />
              <input value={config.templates.productHeroSubtitle} onChange={(event) => setConfig((prev) => ({ ...prev, templates: { ...prev.templates, productHeroSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Product page hero subtitle" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Hero Campaign Slides</h3>
              <button type="button" onClick={() => setConfig((prev) => ({ ...prev, heroSlides: [...prev.heroSlides, emptySlide()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
                Add slide
              </button>
            </div>

            <div className="space-y-3">
              {config.heroSlides.map((slide, index) => (
                <article key={`${slide.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Slide {index + 1}</p>
                    <button type="button" onClick={() => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.filter((_, slideIndex) => slideIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3">
                    <input value={slide.eyebrow} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, eyebrow: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Eyebrow" />
                    <input value={slide.title} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Title" />
                    <textarea value={slide.subtitle} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: event.target.value } : item) }))} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Subtitle" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={slide.href} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, href: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Primary URL" />
                      <input value={slide.ctaLabel} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, ctaLabel: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Primary button label" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={slide.secondaryHref ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, secondaryHref: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Secondary URL" />
                      <input value={slide.secondaryLabel ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, secondaryLabel: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Secondary button label" />
                    </div>
                    <input value={slide.image ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, image: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Hero image URL" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input value={slide.themeFrom ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, themeFrom: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient from" />
                      <input value={slide.themeVia ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, themeVia: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient via" />
                      <input value={slide.themeTo ?? ''} onChange={(event) => setConfig((prev) => ({ ...prev, heroSlides: prev.heroSlides.map((item, itemIndex) => itemIndex === index ? { ...item, themeTo: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Gradient to" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Trust / Feature Cards</h3>
              <button type="button" onClick={() => setConfig((prev) => ({ ...prev, featureCards: [...prev.featureCards, emptyFeature()] }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">
                Add card
              </button>
            </div>
            <div className="space-y-3">
              {config.featureCards.map((card, index) => (
                <article key={`${card.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input value={card.title} onChange={(event) => setConfig((prev) => ({ ...prev, featureCards: prev.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Card title" />
                    <input value={card.subtitle} onChange={(event) => setConfig((prev) => ({ ...prev, featureCards: prev.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: event.target.value } : item) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Card subtitle" />
                    <button type="button" onClick={() => setConfig((prev) => ({ ...prev, featureCards: prev.featureCards.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={saveAll} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Frontend Configuration'}
        </button>
        {saved ? <span className="text-sm font-semibold text-emerald-600">Saved</span> : null}
      </div>
    </AdminLayout>
  )
}
