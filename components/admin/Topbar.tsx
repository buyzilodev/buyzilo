'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type TopbarProps = {
  title: string
  onMenuToggle: () => void
  workspaceSummary?: {
    totalAttention: number
    urgentItems: Array<{
      label: string
      count: number
      href: string
      tone: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
    }>
  } | null
  adminIdentity?: {
    name?: string | null
    email: string
    role: string
  } | null
}

const ranges = ['Today', 'Last 7 days', 'Last 30 days', 'This Month']

function toneClass(tone: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate') {
  const map = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return map[tone]
}

export function Topbar({ title, onMenuToggle, workspaceSummary, adminIdentity }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [range, setRange] = useState('Last 7 days')
  const [search, setSearch] = useState('')

  function resolveSearchRoute(term: string) {
    const q = term.trim().toLowerCase()
    if (!q) return '/admin'
    const encoded = encodeURIComponent(term.trim())

    if (q.includes('order') || q.includes('shipment') || q.includes('cart') || q.includes('call')) {
      return `/admin/orders?search=${encoded}`
    }
    if (q.includes('product') || q.includes('category') || q.includes('feature') || q.includes('filter') || q.includes('option') || q.includes('review')) {
      return `/admin/products/manage?search=${encoded}`
    }
    if (q.includes('customer') || q.includes('user') || q.includes('admin group') || q.includes('manager')) {
      return `/admin/customers?search=${encoded}`
    }
    if (q.includes('vendor') || q.includes('plan') || q.includes('payout') || q.includes('accounting')) {
      return `/admin/vendors?search=${encoded}`
    }
    if (q.includes('coupon') || q.includes('promotion') || q.includes('banner') || q.includes('newsletter') || q.includes('feed')) {
      return `/admin/marketing?search=${encoded}`
    }
    if (q.includes('page') || q.includes('blog') || q.includes('menu') || q.includes('comment') || q.includes('sitemap')) {
      return `/admin/website?search=${encoded}`
    }
    if (q.includes('setting') || q.includes('tax') || q.includes('payment') || q.includes('shipping') || q.includes('localization') || q.includes('email')) {
      return `/admin/settings?search=${encoded}`
    }

    if (pathname.startsWith('/admin/orders')) return `/admin/orders?search=${encoded}`
    if (pathname.startsWith('/admin/products')) return `/admin/products/manage?search=${encoded}`
    if (pathname.startsWith('/admin/customers')) return `/admin/customers?search=${encoded}`
    if (pathname.startsWith('/admin/vendors')) return `/admin/vendors?search=${encoded}`
    if (pathname.startsWith('/admin/marketing')) return `/admin/marketing?search=${encoded}`
    if (pathname.startsWith('/admin/website')) return `/admin/website?search=${encoded}`
    if (pathname.startsWith('/admin/settings')) return `/admin/settings?search=${encoded}`

    return `/admin/orders?search=${encoded}`
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = resolveSearchRoute(search)
    router.push(target)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-3 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm lg:hidden"
          >
            Menu
          </button>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>

        <div className="flex flex-1 items-center gap-3 lg:max-w-3xl lg:justify-end">
          <form className="w-full max-w-xl" onSubmit={onSearchSubmit}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders, products, customers..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 shadow-inner outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </form>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
          >
            {ranges.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">A</span>
            <span className="hidden text-slate-700 lg:inline">{adminIdentity?.role ?? 'Admin'}</span>
          </button>
        </div>
      </div>

      {workspaceSummary?.urgentItems?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
          <Link href="/admin" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100">
            {workspaceSummary.totalAttention} active admin tasks
          </Link>
          {workspaceSummary.urgentItems.slice(0, 3).map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`rounded-full border px-3 py-1 text-xs font-semibold hover:opacity-90 ${toneClass(item.tone)}`}
            >
              {item.label}: {item.count}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  )
}
