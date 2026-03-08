'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/admin/Sidebar'
import { Topbar } from '@/components/admin/Topbar'

type WorkspaceSummary = {
  totalAttention: number
  sectionBadges: Record<string, number>
  pageBadges: Record<string, number>
  urgentItems: Array<{
    label: string
    count: number
    href: string
    tone: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
    description: string
  }>
}

type AddonRuntime = {
  activeAddonIds: string[]
  adminLinks?: Array<{
    id: string
    addonId?: string
    label: string
    href: string
    description?: string
    category: string
  }>
}

type AdminIdentity = {
  id: string
  name?: string | null
  email: string
  role: string
  permissions?: string[]
}

export function AdminLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [brandName, setBrandName] = useState('Buyzilo')
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummary | null>(null)
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null)
  const [addonRuntime, setAddonRuntime] = useState<AddonRuntime | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/public').then((res) => res.json()).catch(() => null),
      fetch('/api/admin/workspace-summary').then((res) => res.ok ? res.json() : null).catch(() => null),
      fetch('/api/me').then((res) => res.ok ? res.json() : null).catch(() => null),
      fetch('/api/admin/addons/runtime').then((res) => res.ok ? res.json() : null).catch(() => null),
    ]).then(([settings, summary, me, runtime]) => {
      if (settings?.siteName) setBrandName(settings.siteName)
      if (summary) setWorkspaceSummary(summary)
      if (me) setAdminIdentity(me)
      if (runtime) setAddonRuntime(runtime)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#eef1f5]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
        />
      )}

      <Sidebar
        brandName={brandName}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        workspaceSummary={workspaceSummary}
        adminIdentity={adminIdentity}
        addonRuntime={addonRuntime}
      />

      <main className="lg:ml-72">
        <Topbar
          title={title}
          onMenuToggle={() => setMobileOpen((v) => !v)}
          workspaceSummary={workspaceSummary}
          adminIdentity={adminIdentity}
        />

        <section className="px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[1380px]">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Admin Workspace</p>
            <h1 className="text-2xl font-black text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>

            {children}
          </div>
        </section>
      </main>
    </div>
  )
}
