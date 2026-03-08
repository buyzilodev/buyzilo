'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/vendor', label: 'Overview' },
  { href: '/vendor/products', label: 'Products' },
  { href: '/vendor/quotes', label: 'Quote Requests' },
  { href: '/vendor/orders', label: 'Orders' },
  { href: '/vendor/shipments', label: 'Shipments' },
  { href: '/vendor/warehouses', label: 'Warehouses' },
  { href: '/vendor/procurement', label: 'Procurement' },
  { href: '/vendor/support', label: 'Support' },
  { href: '/vendor/returns', label: 'Returns' },
  { href: '/vendor/messages', label: 'Messages' },
  { href: '/vendor/reviews', label: 'Reviews' },
  { href: '/vendor/discussion', label: 'Discussion' },
  { href: '/vendor/earnings', label: 'Earnings' },
  { href: '/vendor/payouts', label: 'Payouts' },
  { href: '/vendor/settings', label: 'Settings' },
]

export function VendorSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <Link href="/" className="text-xl font-black text-blue-600">Buyzilo</Link>
        <p className="text-xs text-slate-500">Vendor Dashboard</p>
      </div>

      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
