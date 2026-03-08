'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type ConsentState = {
  policyAccepted: boolean
  marketingConsent: boolean
  analyticsConsent: boolean
  updatedAt: string | null
}

type DeletionRequest = {
  status: string
  reason?: string
  requestedAt: string
  processedAt?: string | null
  resolutionNote?: string | null
} | null

export default function DashboardPrivacyPage() {
  const { status } = useSession()
  const router = useRouter()
  const [consent, setConsent] = useState<ConsentState | null>(null)
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let active = true
    fetch('/api/gdpr')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setConsent(data.consent ?? null)
        setDeletionRequest(data.deletionRequest ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [router, status])

  async function saveConsent(next: Partial<ConsentState>) {
    if (!consent) return
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/gdpr', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...consent, ...next }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(data.error ?? 'Failed to update privacy settings')
      return
    }
    setConsent(data.consent)
    setMessage('Privacy settings updated.')
  }

  async function submitDeletion(action: 'request_deletion' | 'cancel_deletion') {
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/gdpr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(data.error ?? 'Failed to update deletion request')
      return
    }
    setDeletionRequest(data.request ?? null)
    setMessage(action === 'request_deletion' ? 'Deletion request submitted.' : 'Deletion request cancelled.')
  }

  if (status === 'loading' || status === 'unauthenticated' || loading || !consent) {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading privacy center...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_48%,#14b8a6_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Privacy workspace</p>
          <h2 className="mt-3 text-4xl font-black">Consent, export, and erasure in one accountable place</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Control marketplace permissions, review deletion activity, and keep a clear audit trail for how your buyer account is handled.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Policy</p>
              <p className="mt-1 text-2xl font-black text-white">{consent.policyAccepted ? 'Accepted' : 'Pending'}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Marketing</p>
              <p className="mt-1 text-2xl font-black text-white">{consent.marketingConsent ? 'On' : 'Off'}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Deletion</p>
              <p className="mt-1 text-2xl font-black text-white">{deletionRequest?.status ?? 'None'}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <a href="/api/gdpr?download=1" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Download personal data</p>
            <p className="mt-2 text-sm text-slate-500">Export profile, orders, preferences, alerts, and related buyer-account data as JSON.</p>
          </a>
          <Link href="/dashboard/security" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Open security</p>
            <p className="mt-2 text-sm text-slate-500">Move between privacy controls and account-protection settings without leaving the workspace.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Consent preferences</h3>
            <p className="text-sm text-slate-500">Marketplace policy, marketing, and analytics preferences with update history.</p>
          </div>
          <p className="text-xs text-slate-400">Last updated: {consent.updatedAt ? new Date(consent.updatedAt).toLocaleString() : 'Not recorded yet'}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-semibold text-slate-900">Policy acknowledgement</p>
              <p className="mt-1 text-sm text-slate-500">Stored so your account privacy choices maintain an audit trail.</p>
            </div>
            <input type="checkbox" checked={consent.policyAccepted} onChange={(event) => void saveConsent({ policyAccepted: event.target.checked })} />
          </label>
          <label className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-semibold text-slate-900">Marketing consent</p>
              <p className="mt-1 text-sm text-slate-500">Allows promotional emails and related audience targeting.</p>
            </div>
            <input type="checkbox" checked={consent.marketingConsent} onChange={(event) => void saveConsent({ marketingConsent: event.target.checked })} />
          </label>
          <label className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-semibold text-slate-900">Analytics consent</p>
              <p className="mt-1 text-sm text-slate-500">Keeps personalization and analytics-related account preferences available.</p>
            </div>
            <input type="checkbox" checked={consent.analyticsConsent} onChange={(event) => void saveConsent({ analyticsConsent: event.target.checked })} />
          </label>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-rose-900">Account erasure</h3>
            <p className="text-sm text-slate-500">Approved requests anonymize the buyer account and remove buyer-facing personal data where applicable.</p>
          </div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{deletionRequest?.status ?? 'No active request'}</span>
        </div>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          className="mt-4 w-full rounded-[1rem] border border-slate-300 px-4 py-3 text-sm"
          placeholder="Optional reason for your request"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitDeletion('request_deletion')}
            disabled={saving}
            className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Request deletion
          </button>
          {deletionRequest?.status === 'REQUESTED' && (
            <button
              type="button"
              onClick={() => void submitDeletion('cancel_deletion')}
              disabled={saving}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel request
            </button>
          )}
        </div>

        {deletionRequest && (
          <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Current request: {deletionRequest.status}</p>
            <p className="mt-1">Requested: {new Date(deletionRequest.requestedAt).toLocaleString()}</p>
            {deletionRequest.reason ? <p className="mt-1">Reason: {deletionRequest.reason}</p> : null}
            {deletionRequest.resolutionNote ? <p className="mt-1">Resolution: {deletionRequest.resolutionNote}</p> : null}
          </div>
        )}
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  )
}
