'use client'

import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#2563eb_52%,#0f766e_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Reset Password</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">Password reset delivery is staged, but token completion is not live yet</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            The recovery request endpoint is active, but the final token-based reset form has not been connected to a backend token flow yet.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">What works now</p>
              <p className="mt-2 text-sm text-white/75">Buyers can submit a reset request from the forgot-password page using the current recovery endpoint.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">What remains</p>
              <p className="mt-2 text-sm text-white/75">A token issue, verification, and password-update route still need to be implemented server-side.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Status</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Reset completion is not available yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            If you need to recover access right now, use the request flow first. This page is now presented clearly instead of acting like a finished reset form.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/forgot-password"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open forgot-password
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
