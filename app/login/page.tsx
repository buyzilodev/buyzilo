'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const response = await fetch('/api/auth/session')
    const session = await response.json()
    const role = session?.user?.role

    if (['ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR'].includes(role ?? '')) {
      router.push('/admin')
      return
    }

    if (role === 'VENDOR') {
      router.push('/vendor')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_52%,#0f766e_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Buyzilo Account</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">Sign in and pick up exactly where you left off</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Orders, saved products, rewards, alerts, and storefront campaigns stay connected across your buyer account.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Rewards</p>
              <p className="mt-2 text-sm text-white/75">Track loyalty points and claim reward coupons from your dashboard.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Wishlist</p>
              <p className="mt-2 text-sm text-white/75">Save products, watch for price drops, and move ready items back to cart.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black">Orders</p>
              <p className="mt-2 text-sm text-white/75">Review shipments, invoices, returns, and post-purchase activity in one place.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Welcome Back</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-500">Use your email and password to continue to your buyer, vendor, or admin workspace.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Do not have an account?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
