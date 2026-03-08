'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRecaptcha } from '@/components/security/useRecaptcha'

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recaptcha = useRecaptcha()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    referralCode: searchParams.get('ref') ?? '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    let recaptchaToken: string | null = null

    try {
      recaptchaToken = await recaptcha.getToken('register')
    } catch (tokenError) {
      const message = tokenError instanceof Error ? tokenError.message : 'Captcha verification failed.'
      setError(message)
      setLoading(false)
      return
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        recaptchaToken,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#2563eb_52%,#7c3aed_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Create Account</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">Open your Buyzilo account and unlock the full buyer flow</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Save products, track alerts, claim loyalty rewards, follow orders, and keep your storefront activity connected in one account.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Alerts</p>
              <p className="mt-2 text-sm text-white/75">Get notified when saved products restock or drop in price.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Rewards</p>
              <p className="mt-2 text-sm text-white/75">Earn loyalty points, referral bonuses, and store-credit perks over time.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Discovery</p>
              <p className="mt-2 text-sm text-white/75">Keep saved searches, recently viewed products, and recommendations in sync.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Join Buyzilo</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Create your account</h2>
            <p className="mt-2 text-sm text-slate-500">Set up your buyer account now. You can upgrade into vendor workflows later if needed.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                placeholder="Create a secure password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Referral code</label>
              <input
                type="text"
                placeholder="Optional referral code"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.referralCode}
                onChange={(event) => setForm({ ...form, referralCode: event.target.value.toUpperCase() })}
              />
              <p className="mt-1 text-xs text-slate-400">Use a referral code from another buyer to unlock a signup bonus.</p>
            </div>

            <button
              type="submit"
              disabled={loading || (recaptcha.enabled && !recaptcha.ready)}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            {recaptcha.enabled ? (
              <p className="text-xs text-slate-400">Protected by Google reCAPTCHA.</p>
            ) : null}
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  )
}
