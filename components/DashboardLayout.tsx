'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import type { PublicBrandingSettings } from '@/lib/branding'

type DashboardNavItem = {
  href: string
  label: string
  shortLabel: string
  icon: string
  tone: string
}

type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

type DashboardShellSummary = {
  orders: number
  cartItems: number
  wishlistItems: number
  unreadAlerts: number
  unreadRetention: number
  availablePoints: number
  storeCreditBalance: number
}

const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Command Center', shortLabel: 'Home', icon: 'C', tone: 'from-sky-500 to-blue-600' },
      { href: '/dashboard/orders', label: 'Orders', shortLabel: 'Orders', icon: 'O', tone: 'from-cyan-500 to-sky-600' },
      { href: '/dashboard/quotes', label: 'Quote Requests', shortLabel: 'Quotes', icon: 'Q', tone: 'from-blue-500 to-indigo-700' },
      { href: '/dashboard/wishlist', label: 'Wishlist', shortLabel: 'Wishlist', icon: 'W', tone: 'from-rose-500 to-orange-500' },
      { href: '/dashboard/stock-alerts', label: 'Alerts', shortLabel: 'Alerts', icon: 'A', tone: 'from-amber-500 to-orange-500' },
    ],
  },
  {
    label: 'Retention',
    items: [
      { href: '/dashboard/rewards', label: 'Rewards', shortLabel: 'Rewards', icon: 'R', tone: 'from-emerald-500 to-teal-600' },
      { href: '/dashboard/referrals', label: 'Referrals', shortLabel: 'Referrals', icon: 'F', tone: 'from-fuchsia-500 to-violet-600' },
      { href: '/dashboard/store-credit', label: 'Store Credit', shortLabel: 'Credit', icon: 'S', tone: 'from-indigo-500 to-blue-700' },
      { href: '/dashboard/saved-searches', label: 'Saved Searches', shortLabel: 'Searches', icon: 'Q', tone: 'from-sky-400 to-cyan-600' },
      { href: '/dashboard/digest', label: 'Digest', shortLabel: 'Digest', icon: 'D', tone: 'from-slate-600 to-slate-900' },
      { href: '/dashboard/notifications', label: 'Notifications', shortLabel: 'Notify', icon: 'N', tone: 'from-blue-500 to-indigo-600' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Profile', shortLabel: 'Profile', icon: 'P', tone: 'from-violet-500 to-purple-600' },
      { href: '/dashboard/addresses', label: 'Addresses', shortLabel: 'Address', icon: 'D', tone: 'from-orange-500 to-amber-600' },
      { href: '/dashboard/security', label: 'Security', shortLabel: 'Security', icon: 'K', tone: 'from-zinc-700 to-slate-900' },
      { href: '/dashboard/privacy', label: 'Privacy', shortLabel: 'Privacy', icon: 'Y', tone: 'from-teal-500 to-emerald-600' },
      { href: '/dashboard/reviews', label: 'Reviews', shortLabel: 'Reviews', icon: 'V', tone: 'from-yellow-500 to-amber-600' },
      { href: '/dashboard/support', label: 'Support', shortLabel: 'Support', icon: 'T', tone: 'from-blue-500 to-cyan-600' },
    ],
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function DashboardSidebar({
  branding,
  summary,
}: {
  branding: PublicBrandingSettings | null
  summary: DashboardShellSummary
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden xl:flex xl:w-[310px] xl:flex-col xl:gap-5 xl:border-r xl:border-slate-200 xl:bg-white/80 xl:p-5 xl:backdrop-blur">
      <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-5 text-white shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/10 text-lg font-black text-white">
            {(branding?.siteName ?? 'B').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-black">{branding?.siteName ?? 'Buyzilo'}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Customer dashboard</p>
          </div>
        </Link>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Orders</p>
            <p className="mt-1 text-2xl font-black text-white">{summary.orders}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Rewards</p>
            <p className="mt-1 text-2xl font-black text-white">{summary.availablePoints}</p>
          </div>
        </div>
      </div>

      <nav className="space-y-5">
        {dashboardNavGroups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[1.1rem] px-3 py-3 transition ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.tone} text-sm font-black text-white`}>
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <p className={`text-xs ${active ? 'text-white/60' : 'text-slate-400'}`}>{item.shortLabel}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-900">Buyer pulse</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span>Cart items</span>
            <span className="font-bold text-slate-900">{summary.cartItems}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span>Wishlist</span>
            <span className="font-bold text-slate-900">{summary.wishlistItems}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span>Unread alerts</span>
            <span className="font-bold text-slate-900">{summary.unreadAlerts + summary.unreadRetention}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span>Store credit</span>
            <span className="font-bold text-slate-900">{formatCurrency(summary.storeCreditBalance)}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function DashboardLayout({
  children,
  title = 'Dashboard',
  subtitle,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [branding, setBranding] = useState<PublicBrandingSettings | null>(null)
  const [summary, setSummary] = useState<DashboardShellSummary>({
    orders: 0,
    cartItems: 0,
    wishlistItems: 0,
    unreadAlerts: 0,
    unreadRetention: 0,
    availablePoints: 0,
    storeCreditBalance: 0,
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadShell() {
      try {
        const [
          publicSettings,
          ordersRes,
          cartRes,
          wishlistRes,
          alertsRes,
          rewardsRes,
          creditRes,
          retentionRes,
        ] = await Promise.all([
          fetch('/api/settings/public').then((response) => response.ok ? response.json() : null).catch(() => null),
          fetch('/api/orders').then((response) => response.ok ? response.json() : { orders: [] }).catch(() => ({ orders: [] })),
          fetch('/api/cart').then((response) => response.ok ? response.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch('/api/wishlist').then((response) => response.ok ? response.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch('/api/stock-alerts').then((response) => response.ok ? response.json() : { alerts: [] }).catch(() => ({ alerts: [] })),
          fetch('/api/rewards').then((response) => response.ok ? response.json() : { rewards: null }).catch(() => ({ rewards: null })),
          fetch('/api/store-credit').then((response) => response.ok ? response.json() : { storeCredit: null }).catch(() => ({ storeCredit: null })),
          fetch('/api/retention-notifications').then((response) => response.ok ? response.json() : { notifications: [] }).catch(() => ({ notifications: [] })),
        ])

        if (cancelled) return

        setBranding(publicSettings)
        setSummary({
          orders: Array.isArray(ordersRes.orders) ? ordersRes.orders.length : 0,
          cartItems: Array.isArray(cartRes.items) ? cartRes.items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity ?? 0), 0) : 0,
          wishlistItems: Array.isArray(wishlistRes.items) ? wishlistRes.items.length : 0,
          unreadAlerts: Array.isArray(alertsRes.alerts) ? alertsRes.alerts.filter((item: { isRead?: boolean }) => !item.isRead).length : 0,
          unreadRetention: Array.isArray(retentionRes.notifications) ? retentionRes.notifications.filter((item: { isRead?: boolean }) => !item.isRead).length : 0,
          availablePoints: Number(rewardsRes.rewards?.summary?.availablePoints ?? 0),
          storeCreditBalance: Number(creditRes.storeCredit?.balance ?? 0),
        })
      } catch {
        if (cancelled) return
        setBranding(null)
      }
    }

    if (session?.user) {
      void loadShell()
    }

    return () => {
      cancelled = true
    }
  }, [session?.user, pathname])

  const currentSection = useMemo(() => {
    for (const group of dashboardNavGroups) {
      const item = group.items.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`))
      if (item) return item
    }
    return dashboardNavGroups[0].items[0]
  }, [pathname])

  const userLabel = session?.user?.name ?? session?.user?.email ?? 'Customer'
  const unreadTotal = summary.unreadAlerts + summary.unreadRetention

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc_0%,#eef3fb_45%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1700px] gap-5 px-3 py-3 md:px-4">
        <DashboardSidebar branding={branding} summary={summary} />

        <div className="flex min-h-screen flex-1 flex-col gap-5">
          <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-900 xl:hidden"
                >
                  {menuOpen ? 'X' : 'M'}
                </button>
                <div className={`hidden h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br ${currentSection.tone} text-base font-black text-white md:flex`}>
                  {currentSection.icon}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Customer workspace</p>
                  <h1 className="text-2xl font-black text-slate-950">{title}</h1>
                  {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href="/help" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Help Center
                </Link>
                <Link href="/products" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Storefront
                </Link>
                <Link href="/cart" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Cart {summary.cartItems > 0 ? `(${summary.cartItems})` : ''}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Sign out
                </button>
              </div>
            </div>

            {menuOpen && (
              <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 xl:hidden">
                {dashboardNavGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`rounded-[1rem] border px-4 py-3 text-sm font-semibold ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_56%,#0f766e_100%)] p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Buyer identity</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-white/10 text-xl font-black text-white">
                    {userLabel.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{userLabel}</p>
                    <p className="text-sm text-white/70">{session?.user?.email}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Rewards</p>
                    <p className="mt-1 text-2xl font-black text-white">{summary.availablePoints}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Credit</p>
                    <p className="mt-1 text-2xl font-black text-white">{formatCurrency(summary.storeCreditBalance)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Unread</p>
                    <p className="mt-1 text-2xl font-black text-white">{unreadTotal}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Link href="/dashboard/rewards" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                  <p className="text-sm font-bold text-slate-900">Claim rewards</p>
                  <p className="mt-1 text-sm text-slate-500">Use loyalty and referral value faster.</p>
                </Link>
                <Link href="/dashboard/stock-alerts" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                  <p className="text-sm font-bold text-slate-900">Review alerts</p>
                  <p className="mt-1 text-sm text-slate-500">Watch restocks and price drops.</p>
                </Link>
                <Link href="/dashboard/support" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                  <p className="text-sm font-bold text-slate-900">Support and help</p>
                  <p className="mt-1 text-sm text-slate-500">Tickets, callback requests, and guides.</p>
                </Link>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
