'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRecaptcha } from '@/components/security/useRecaptcha'

export default function ForgotPasswordPage() {
  const recaptcha = useRecaptcha()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    let recaptchaToken: string | null = null

    try {
      recaptchaToken = await recaptcha.getToken('forgot_password')
    } catch (tokenError) {
      const errorMessage = tokenError instanceof Error ? tokenError.message : 'Captcha verification failed.'
      setMessage(errorMessage)
      setSubmitting(false)
      return
    }

    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, recaptchaToken }),
    })
    const data = await response.json()
    setMessage(data.message ?? 'Request submitted.')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_60%,#1d4ed8_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Password Recovery</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">Request a reset and recover access to your account</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Use your account email to start the password recovery flow for your buyer, vendor, or admin login.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Secure request</p>
              <p className="mt-2 text-sm text-white/75">Recovery requests are protected by reCAPTCHA when enabled by admin.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Single email point</p>
              <p className="mt-2 text-sm text-white/75">Use the same email address you use to sign in across marketplace roles.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Forgot Password</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Send a recovery request</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your email and we will trigger the current reset-request flow for your account.</p>

          <form onSubmit={onSubmit} className="mt-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}

            <button
              type="submit"
              disabled={submitting || (recaptcha.enabled && !recaptcha.ready)}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting request...' : 'Send reset request'}
            </button>

            {recaptcha.enabled ? (
              <p className="mt-3 text-xs text-slate-400">Protected by Google reCAPTCHA.</p>
            ) : null}
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Back to login
            </Link>
            <Link href="/register" className="font-semibold text-slate-600 hover:underline">
              Create account
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
