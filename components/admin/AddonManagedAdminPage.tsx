'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { AddonInactivePanel } from '@/components/admin/AddonInactivePanel'

type PageRuntime = {
  addonId: string
  active: boolean
  visible: boolean
  page: {
    title?: string
    subtitle?: string
    inactiveTitle?: string
    inactiveDescription?: string
  }
} | null

export function AddonManagedAdminPage({
  addonId,
  pageHref,
  fallbackTitle,
  fallbackSubtitle,
  loadingText,
  children,
}: {
  addonId: string
  pageHref: string
  fallbackTitle: string
  fallbackSubtitle: string
  loadingText?: string
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [runtime, setRuntime] = useState<PageRuntime>(null)

  useEffect(() => {
    let mounted = true

    fetch(`/api/admin/addons/runtime?page=${encodeURIComponent(pageHref)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted) return
        setRuntime(payload?.pageRuntime ?? null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [pageHref])

  const title = runtime?.page.title ?? fallbackTitle
  const subtitle = runtime?.page.subtitle ?? fallbackSubtitle

  if (loading) {
    return (
      <AdminLayout title={title} subtitle={subtitle}>
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          {loadingText ?? 'Loading addon workspace...'}
        </p>
      </AdminLayout>
    )
  }

  if (runtime && runtime.active === false) {
    return (
      <AdminLayout title={title} subtitle={subtitle}>
        <AddonInactivePanel
          addonId={addonId}
          title={runtime.page.inactiveTitle ?? `${fallbackTitle} addon is inactive`}
          description={runtime.page.inactiveDescription ?? `Activate the ${addonId} package to reopen this workspace.`}
        />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={title} subtitle={subtitle}>
      {children}
    </AdminLayout>
  )
}
