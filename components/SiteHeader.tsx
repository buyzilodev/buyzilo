'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import type { PublicBrandingSettings } from '@/lib/branding'
import { PRODUCT_COMPARE_KEY } from '@/lib/constants/storefront'
import { getMatchingBannerCards, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'

const fallbackCategories = [
  { name: 'Electronics', slug: 'electronics', image: 'E' },
  { name: 'Fashion', slug: 'fashion', image: 'F' },
  { name: 'Sports', slug: 'sports', image: 'S' },
]

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
    announcementText: 'Free shipping on orders over $100',
    announcementHref: '/products',
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

export default function SiteHeader() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [categories, setCategories] = useState<{ name: string; slug: string; image?: string | null }[]>(fallbackCategories)
  const [customPages, setCustomPages] = useState<{ title: string; slug: string }[]>([])
  const [cartCount, setCartCount] = useState<number | null>(null)
  const [wishlistCount, setWishlistCount] = useState<number | null>(null)
  const [compareCount, setCompareCount] = useState(0)
  const [branding, setBranding] = useState<PublicBrandingSettings>(defaultBranding)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(defaultStorefrontConfig)
  const headerBanners = getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'home' }).slice(0, 3)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) && data.length ? setCategories(data) : null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/pages')
      .then((res) => res.json())
      .then((data) => setCustomPages(Array.isArray(data) ? data : []))
      .catch(() => setCustomPages([]))
  }, [])

  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data?.siteName) setBranding((prev) => ({ ...prev, ...data }))
        if (data?.storefrontConfig) setStorefrontConfig(data.storefrontConfig)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/cart')
        .then((res) => res.json())
        .then((data) => setCartCount((data.items ?? []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)))
        .catch(() => {})

      fetch('/api/wishlist')
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setWishlistCount((data.items ?? []).length))
        .catch(() => {})
    }
  }, [status])

  useEffect(() => {
    const syncCompareCount = () => {
      try {
        const raw = localStorage.getItem(PRODUCT_COMPARE_KEY)
        const items = raw ? JSON.parse(raw) : []
        setCompareCount(Array.isArray(items) ? items.length : 0)
      } catch {
        setCompareCount(0)
      }
    }

    syncCompareCount()
    window.addEventListener('buyzilo:compare-updated', syncCompareCount)
    return () => window.removeEventListener('buyzilo:compare-updated', syncCompareCount)
  }, [])

  const displayCartCount = (() => {
    if (status === 'authenticated') return cartCount ?? 0
    if (status === 'unauthenticated') {
      try {
        const raw = localStorage.getItem('buyzilo_guest_cart')
        const cart = raw ? JSON.parse(raw) : []
        return cart.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
      } catch {
        return 0
      }
    }
    return 0
  })()

  const displayWishlistCount = (() => {
    if (status === 'authenticated') return wishlistCount ?? 0
    if (status === 'unauthenticated') {
      try {
        const raw = localStorage.getItem('buyzilo_wishlist')
        const items = raw ? JSON.parse(raw) : []
        return Array.isArray(items) ? items.length : 0
      } catch {
        return 0
      }
    }
    return 0
  })()

  return (
    <header style={{ ['--brand-color' as string]: branding.primaryColor }}>
      <div className="border-b border-slate-800 bg-slate-950 py-2 text-xs text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4">
          <Link href={storefrontConfig.templates.announcementHref || '/products'} className="font-semibold text-white/85 hover:text-white">
            {storefrontConfig.templates.announcementText || 'Free shipping on orders over $100'}
          </Link>
          <div className="flex flex-wrap gap-4 text-white/75">
            <span>{branding.supportPhone}</span>
            <span>{branding.supportEmail}</span>
            {session ? (
              <span className="text-blue-300">Hi, {session.user?.name?.split(' ')[0]}!</span>
            ) : (
              <Link href="/login" className="hover:text-white">Sign In</Link>
            )}
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="rounded-2xl px-4 py-2 text-2xl font-black text-white" style={{ backgroundColor: branding.primaryColor }}>
                  {branding.logoText || 'B'}
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tight text-slate-900">{branding.siteName}</p>
                  <p className="text-xs text-slate-500">{branding.tagline}</p>
                </div>
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
                <select className="border-r border-slate-200 bg-transparent px-3 py-3 text-sm text-slate-600 outline-none">
                  <option>All</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products, categories, campaigns and stores..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                />
                <Link href={`/products?search=${encodeURIComponent(searchQuery)}`} className="px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: branding.primaryColor }}>
                  Search
                </Link>
              </div>

              <div className="hidden items-center gap-2 xl:flex">
                {storefrontConfig.headerMenu.map((item) => (
                  <div key={`${item.title}-${item.href}`} className="group relative">
                    <Link
                      href={item.href}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                        item.highlight
                          ? 'text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      style={item.highlight ? { backgroundColor: branding.primaryColor } : undefined}
                    >
                      {item.title}
                    </Link>
                    {item.children && item.children.length > 0 ? (
                      <div className="invisible absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                        <div className="space-y-1">
                          {item.children.map((child) => (
                            <Link key={`${child.title}-${child.href}`} href={child.href} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                {customPages.slice(0, 3).map((page) => (
                  <Link key={page.slug} href={`/pages/${page.slug}`} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="relative">
                <button onClick={() => setShowUserMenu((value) => !value)} className="rounded-[1.25rem] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {session ? 'Account' : 'Sign in'}
                </button>
                {showUserMenu ? (
                  <div className="absolute right-0 top-14 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {session ? (
                      <>
                        <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">My account</Link>
                        <Link href="/dashboard/orders" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">My orders</Link>
                        {(session.user as { role?: string }).role === 'VENDOR' ? <Link href="/vendor" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">Vendor panel</Link> : null}
                        {['ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR'].includes((session.user as { role?: string }).role ?? '') ? <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">Admin panel</Link> : null}
                        <button onClick={() => signOut({ callbackUrl: '/' })} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/login" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">Sign in</Link>
                        <Link href="/register" className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50">Register</Link>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <Link href="/dashboard/wishlist" className="relative rounded-[1.25rem] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Wishlist
                {displayWishlistCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[11px] font-bold text-white">{displayWishlistCount}</span> : null}
              </Link>
              <Link href="/compare" className="relative rounded-[1.25rem] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Compare
                {compareCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{compareCount}</span> : null}
              </Link>
              <Link href="/cart" className="relative rounded-[1.25rem] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cart
                {displayCartCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white">{displayCartCount}</span> : null}
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 xl:hidden">
            {storefrontConfig.headerMenu.map((item) => (
              <Link key={`${item.title}-${item.href}-mobile`} href={item.href} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {item.title}
              </Link>
            ))}
          </div>

          {storefrontConfig.discoveryRoutes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {storefrontConfig.discoveryRoutes.slice(0, 4).map((route) => (
                <Link key={`${route.title}-${route.href}`} href={route.href} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  {route.title}
                </Link>
              ))}
            </div>
          ) : null}

          {headerBanners.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {headerBanners.map((banner, index) => (
                <Link
                  key={`${banner.title}-${index}`}
                  href={banner.href}
                  className={`rounded-[1.5rem] border px-4 py-4 transition hover:shadow-sm ${
                    banner.tone === 'amber'
                      ? 'border-amber-200 bg-amber-50'
                      : banner.tone === 'emerald'
                        ? 'border-emerald-200 bg-emerald-50'
                        : banner.tone === 'rose'
                          ? 'border-rose-200 bg-rose-50'
                          : banner.tone === 'slate'
                            ? 'border-slate-200 bg-slate-100'
                            : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <p className="text-sm font-black text-slate-900">{banner.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{banner.subtitle}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  )
}
