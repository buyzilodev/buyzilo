'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function DashboardSecurityPage() {
  const { status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [router, status])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage('New password and confirmation do not match.')
      return
    }

    setSaving(true)
    setMessage('')
    const response = await fetch('/api/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await response.json()
    setSaving(false)
    setMessage(response.ok ? 'Password updated successfully.' : data.error ?? 'Failed to update password')
    if (response.ok) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading security settings...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#334155_44%,#2563eb_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Security workspace</p>
          <h2 className="mt-3 text-4xl font-black">Protect the account behind every order and wallet action</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Keep your login current, reduce account risk, and make sure the buyer identity tied to orders, rewards, and wallet value stays protected.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Password access</p>
              <p className="mt-1 text-2xl font-black text-white">Active</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Update path</p>
              <p className="mt-1 text-2xl font-black text-white">Live</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Risk reminder</p>
              <p className="mt-1 text-2xl font-black text-white">Reuse: no</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/dashboard/profile" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Review account profile</p>
            <p className="mt-2 text-sm text-slate-500">Keep core identity details aligned with the login that protects your buyer activity.</p>
          </Link>
          <Link href="/dashboard/privacy" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Open privacy controls</p>
            <p className="mt-2 text-sm text-slate-500">Move between account protection, consent settings, and data handling from one workspace.</p>
          </Link>
        </div>
      </section>

      <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Change password</h3>
            <p className="text-sm text-slate-500">Use a strong password you do not reuse on other sites or services.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
            className="w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            className="w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm"
            required
          />
        </div>

        {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
