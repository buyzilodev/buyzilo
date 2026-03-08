'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PublicBrandingSettings } from '@/lib/branding'
import type { StorefrontConfig } from '@/lib/helpers/storefrontConfig'

const defaultBranding: PublicBrandingSettings = {
  siteName: 'Buyzilo',
  tagline: 'Shop Everything You Love',
  logoText: 'B',
  logoUrl: '',
  faviconUrl: '',
  supportPhone: '+1 (800) BUYZILO',
  supportEmail: 'support@buyzilo.com',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  footerText: 'All rights reserved.',
  sellerCtaLabel: 'Sell on Buyzilo',
}

const defaultStorefrontConfig: StorefrontConfig = {
  headerMenu: [],
  footerColumns: [],
  bannerCards: [],
  discoveryRoutes: [],
  searchPromotions: [],
  intentPresets: [],
  campaigns: [],
  templates: {
    announcementText: '',
    announcementHref: '/',
    catalogHeroTitle: '',
    catalogHeroSubtitle: '',
    categoryHeroTitle: '',
    categoryHeroSubtitle: '',
    storesHeroTitle: '',
    storesHeroSubtitle: '',
    storeHeroTitle: '',
    storeHeroSubtitle: '',
    blogHeroTitle: '',
    blogHeroSubtitle: '',
    productHeroTitle: '',
    productHeroSubtitle: '',
  },
}

export default function SiteFooter() {
  const [branding, setBranding] = useState<PublicBrandingSettings>(defaultBranding)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(defaultStorefrontConfig)

  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data?.siteName) setBranding((prev) => ({ ...prev, ...data }))
        if (data?.storefrontConfig) setStorefrontConfig(data.storefrontConfig)
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl px-4 py-2 text-2xl font-black text-white" style={{ backgroundColor: branding.primaryColor }}>
                {branding.logoText || 'B'}
              </div>
              <div>
                <p className="text-2xl font-black">{branding.siteName}</p>
                <p className="text-sm text-slate-400">{branding.tagline}</p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm text-slate-400">
              Marketplace storefront with merchandising controls, campaigns, trusted vendors, loyalty tools, and managed operations across the buying journey.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
              <span>{branding.supportPhone}</span>
              <span>{branding.supportEmail}</span>
            </div>
            {storefrontConfig.campaigns.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {storefrontConfig.campaigns.slice(0, 3).map((campaign) => (
                  <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
                    {campaign.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {storefrontConfig.footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-black uppercase tracking-[0.08em] text-white">{column.title}</p>
                <div className="mt-4 space-y-2">
                  {column.links.map((link) => (
                    <Link key={`${column.title}-${link.title}-${link.href}`} href={link.href} className="block text-sm text-slate-400 transition hover:text-white">
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} {branding.siteName}. {branding.footerText}
        </div>
      </div>
    </footer>
  )
}
