'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        setName(data.name ?? '')
        setEmail(data.email ?? '')
      })
      .catch(() => {})
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [router, status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
    setMessage(res.ok ? 'Profile updated successfully.' : 'Unable to update your profile.')
  }

  if (status !== 'authenticated') {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading your customer profile...</div>
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Profile workspace</p>
        <h2 className="mt-3 text-3xl font-black text-slate-950">Identity and buyer account details</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Keep your buyer identity current so orders, support, reviews, and retention features stay tied to the right account profile.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-400">Email changes remain locked to protect authentication and order history.</p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Current account identity</p>
            <p className="mt-2">Role: {(session?.user?.role ?? 'BUYER').toString()}</p>
            <p className="mt-1">Signed in as: {session?.user?.email}</p>
          </div>

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] text-2xl font-black text-white">
              {(name || email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-black text-slate-950">{name || 'Customer profile'}</p>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Related account lanes</h3>
          <div className="mt-4 grid gap-3">
            <Link href="/dashboard/addresses" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100">
              <p className="text-sm font-bold text-slate-950">Addresses</p>
              <p className="mt-1 text-sm text-slate-500">Keep delivery details ready for checkout.</p>
            </Link>
            <Link href="/dashboard/security" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100">
              <p className="text-sm font-bold text-slate-950">Security</p>
              <p className="mt-1 text-sm text-slate-500">Update password and protect account access.</p>
            </Link>
            <Link href="/dashboard/privacy" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100">
              <p className="text-sm font-bold text-slate-950">Privacy</p>
              <p className="mt-1 text-sm text-slate-500">Review consent, export, and deletion tools.</p>
            </Link>
          </div>
        </section>
      </aside>
    </div>
  )
}
