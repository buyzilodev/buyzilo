'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type SubsectionItem = {
  label: string
  href: string
}

export function SubsectionNav({ items }: { items: SubsectionItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              active
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
