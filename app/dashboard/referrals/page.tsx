'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type ReferralPayload = {
  code: string
  shareUrl: string
  config: {
    referrerBonusPoints: number
    referredBonusPoints: number
  }
  summary: {
    invites: number
    registeredInvites: number
    totalReferrerBonusPoints: number
    totalReferredBonusPoints: number
  }
  referrals: Array<{
    id: string
    referredEmail: string
    createdAt: string
    status: 'REGISTERED'
    referrerBonusPoints: number
    referredBonusPoints: number
  }>
}

export default function DashboardReferralsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [referral, setReferral] = useState<ReferralPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/referrals')
      .then((response) => (response.ok ? response.json() : { referral: null }))
      .then((data) => {
        if (!cancelled) setReferral(data.referral ?? null)
      })
      .catch(() => {
        if (!cancelled) setReferral(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  async function copyLink() {
    if (!referral) return
    const fullLink = `${window.location.origin}${referral.shareUrl}`
    await navigator.clipboard.writeText(fullLink)
    setMessage('Referral link copied.')
    window.setTimeout(() => setMessage(null), 2000)
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading referrals...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#581c87_0%,#7c3aed_45%,#2563eb_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Referral workspace</p>
          <h2 className="mt-3 text-4xl font-black">Turn satisfied buyers into acquisition momentum</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Share your referral code, track registered invites, and see the bonus points created for both sides of the invite flow.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Code</p>
              <p className="mt-1 text-xl font-black text-white">{referral?.code ?? '----'}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Registered</p>
              <p className="mt-1 text-2xl font-black text-white">{referral?.summary.registeredInvites ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Your bonus</p>
              <p className="mt-1 text-2xl font-black text-white">{referral?.config.referrerBonusPoints ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Friend bonus</p>
              <p className="mt-1 text-2xl font-black text-white">{referral?.config.referredBonusPoints ?? 0}</p>
            </article>
          </div>
        </div>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-black text-slate-950">Invite flow</p>
          <p className="mt-2 text-sm text-slate-500">Copy your live signup link and share it anywhere you already have buyer trust.</p>
          <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Share link</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{referral ? `${typeof window !== 'undefined' ? window.location.origin : ''}${referral.shareUrl}` : 'Loading...'}</p>
          </div>
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!referral}
            className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Copy referral link
          </button>
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Referral code</p>
          <p className="mt-2 font-mono text-2xl font-black text-slate-950">{referral?.code ?? 'Loading...'}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total bonus points earned</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{referral?.summary.totalReferrerBonusPoints ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">Friend-side bonus delivered: {referral?.summary.totalReferredBonusPoints ?? 0}</p>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Referral activity</h3>
            <p className="text-sm text-slate-500">Every successful registration attributed to your code appears here.</p>
          </div>
          <Link href="/dashboard/rewards" className="text-sm font-semibold text-blue-600 hover:underline">
            Open rewards
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading referral activity...</p>
        ) : (referral?.referrals.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No referral registrations yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {referral?.referrals.map((item) => (
              <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{item.referredEmail}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>Your bonus: <span className="font-semibold text-slate-900">{item.referrerBonusPoints}</span></p>
                  <p>Friend bonus: <span className="font-semibold text-slate-900">{item.referredBonusPoints}</span></p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
