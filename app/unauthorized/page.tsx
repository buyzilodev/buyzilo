'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const getRedirectLink = () => {
    if (['ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR'].includes(role ?? '')) return { href: '/admin', label: 'Go to admin workspace' }
    if (role === 'VENDOR') return { href: '/vendor', label: 'Go to vendor workspace' }
    return { href: '/dashboard', label: 'Go to buyer account' }
  }

  const link = getRedirectLink()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#2563eb_55%,#7c3aed_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Access Control</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">This page is outside the permissions on your current account</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Buyzilo separates buyer, vendor, manager, and admin workspaces. Your current session is signed in, but not allowed to open this route.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Current session</p>
              <p className="mt-2 text-sm text-white/75">
                {session?.user?.email ? `Signed in as ${session.user.email}` : 'No active session detected.'}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Current role</p>
              <p className="mt-2 text-sm text-white/75">{role ? String(role) : 'Guest visitor'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Access Denied</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">You do not have permission to view this page</h2>
          <p className="mt-2 text-sm text-slate-500">
            Move back to the workspace that matches your role, or sign out and switch accounts.
          </p>

          <div className="mt-6 space-y-3">
            {session ? (
              <>
                <Link
                  href={link.href}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {link.label}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to homepage
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
