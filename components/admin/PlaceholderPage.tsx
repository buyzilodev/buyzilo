import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'

export function AdminPlaceholderPage({
  title,
  description,
  links = [],
}: {
  title: string
  description: string
  links?: { label: string; href: string }[]
}) {
  return (
    <AdminLayout title={title} subtitle={description}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">This section is ready for module-specific implementation.</p>
        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
