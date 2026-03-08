import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'
import { getAddonStorefrontPageRuntime } from '@/lib/addons/manager'

export async function AddonManagedStorefrontPage({
  pageHref,
  fallback,
  children,
}: {
  pageHref: string
  fallback: {
    title: string
    subtitle?: string
    inactiveTitle?: string
    inactiveDescription?: string
  }
  children: React.ReactNode
}) {
  const viewer = await getSessionAccessViewerContext()
  const runtime = await getAddonStorefrontPageRuntime(pageHref, {
    isAuthenticated: viewer.isAuthenticated,
  })

  if (runtime && runtime.visible === false) {
    notFound()
  }

  if (runtime && runtime.active === false) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Addon Route</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              {runtime.page.inactiveTitle ?? fallback.inactiveTitle ?? `${fallback.title} is unavailable`}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              {runtime.page.inactiveDescription ?? fallback.inactiveDescription ?? 'This addon-backed page is currently unavailable.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                Return home
              </Link>
              <Link href="/dashboard/support" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
