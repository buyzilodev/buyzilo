'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Preferences = {
  stockAlerts: boolean
  priceDropAlerts: boolean
  savedSearchAlerts: boolean
  loyaltyAlerts: boolean
  referralAlerts: boolean
  storeCreditAlerts: boolean
  smsOrderUpdates: boolean
  digestFrequency: 'off' | 'daily' | 'weekly'
}

const defaultPreferences: Preferences = {
  stockAlerts: true,
  priceDropAlerts: true,
  savedSearchAlerts: true,
  loyaltyAlerts: true,
  referralAlerts: true,
  storeCreditAlerts: true,
  smsOrderUpdates: true,
  digestFrequency: 'daily',
}

type RetentionNotification = {
  id: string
  kind: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  href?: string
}

export default function DashboardNotificationsPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [retentionNotifications, setRetentionNotifications] = useState<RetentionNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/notification-preferences')
      .then((response) => response.ok ? response.json() : { preferences: defaultPreferences })
      .then((data) => {
        if (cancelled) return
        setPreferences(data.preferences ?? defaultPreferences)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPreferences(defaultPreferences)
        setLoading(false)
      })
    fetch('/api/retention-notifications')
      .then((response) => response.ok ? response.json() : { notifications: [] })
      .then((data) => {
        if (cancelled) return
        setRetentionNotifications(data.notifications ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setRetentionNotifications([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function markNotificationsRead() {
    const response = await fetch('/api/retention-notifications', { method: 'PATCH' })
    const data = await response.json()
    if (response.ok) {
      setRetentionNotifications(data.notifications ?? [])
      setMessage('Retention notifications marked as read.')
    }
  }

  async function save(next: Partial<Preferences>) {
    const merged = { ...preferences, ...next }
    setPreferences(merged)
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    setSaving(false)
    setMessage(response.ok ? 'Notification preferences updated.' : 'Failed to save preferences.')
  }

  if (loading) {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading your notification controls...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#2563eb_48%,#0f766e_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Notification center</p>
          <h2 className="mt-3 text-4xl font-black">Control the full buyer follow-up system</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Manage how Buyzilo follows up on alerts, saved discovery, rewards, referrals, store credit, and order updates across in-app and SMS channels.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Unread</p>
              <p className="mt-1 text-2xl font-black text-white">{retentionNotifications.filter((item) => !item.isRead).length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">SMS</p>
              <p className="mt-1 text-2xl font-black text-white">{preferences.smsOrderUpdates ? 'ON' : 'OFF'}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Digest</p>
              <p className="mt-1 text-2xl font-black text-white">{preferences.digestFrequency.toUpperCase()}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Alerts</p>
              <p className="mt-1 text-2xl font-black text-white">
                {[preferences.stockAlerts, preferences.priceDropAlerts, preferences.savedSearchAlerts].filter(Boolean).length}/3
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Link href="/dashboard/digest" className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Digest settings</p>
            <p className="mt-2 text-sm text-slate-500">Use your digest page to review the summary fed by these notification settings.</p>
          </Link>
          <Link href="/dashboard/stock-alerts" className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Alert inbox</p>
            <p className="mt-2 text-sm text-slate-500">Review back-in-stock and price-drop signals triggered by your saved products.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">Notification preferences</h3>
        <p className="mt-1 text-sm text-slate-500">Turn individual buyer-alert channels on or off without losing the underlying feature data.</p>
        <div className="mt-6 space-y-4">
          {[
            { key: 'stockAlerts' as const, label: 'Back-in-stock alerts', description: 'In-app alerts when subscribed products or variants become available again.' },
            { key: 'priceDropAlerts' as const, label: 'Price-drop alerts', description: 'In-app alerts when saved products or wishlist items become cheaper.' },
            { key: 'savedSearchAlerts' as const, label: 'Saved-search tracking', description: 'Keep highlighting saved searches that now have new matching products.' },
            { key: 'loyaltyAlerts' as const, label: 'Loyalty alerts', description: 'Notify me when reward coupons and loyalty milestones are added.' },
            { key: 'referralAlerts' as const, label: 'Referral alerts', description: 'Notify me when invited signups trigger referral bonuses.' },
            { key: 'storeCreditAlerts' as const, label: 'Store-credit alerts', description: 'Notify me when gift cards, refunds, or admin credit add value to my balance.' },
            { key: 'smsOrderUpdates' as const, label: 'SMS order updates', description: 'Send order, shipment, and delivery SMS when a phone number is available.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-bold text-slate-950">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={() => void save({ [item.key]: !preferences[item.key] } as Partial<Preferences>)}
                disabled={saving}
                className={`h-7 w-14 rounded-full transition ${preferences[item.key] ? 'bg-blue-600' : 'bg-slate-300'} disabled:opacity-60`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${preferences[item.key] ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Digest cadence</h3>
          <p className="mt-1 text-sm text-slate-500">Choose how often your buyer digest should be prepared.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['off', 'daily', 'weekly'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => void save({ digestFrequency: option })}
                disabled={saving}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${preferences.digestFrequency === option ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} disabled:opacity-60`}
              >
                {option === 'off' ? 'Off' : option === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Retention notifications</h3>
              <p className="text-sm text-slate-500">Recent loyalty, referral, and wallet messages generated for your account.</p>
            </div>
            <button type="button" onClick={() => void markNotificationsRead()} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Mark all read
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {retentionNotifications.length === 0 ? (
              <p className="text-sm text-slate-500">No retention notifications yet.</p>
            ) : (
              retentionNotifications.map((item) => (
                <div key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-slate-600">{item.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                      {item.href ? (
                        <Link href={item.href} className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">
                          Open related page
                        </Link>
                      ) : null}
                    </div>
                    {!item.isRead ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">NEW</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  )
}
