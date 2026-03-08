'use client'

import { useState } from 'react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type EmailMarketingSegment = 'marketing-consented' | 'recent-buyers-30d' | 'loyalty-members'

type Campaign = {
  id: string
  subject: string
  previewText?: string | null
  segment: EmailMarketingSegment
  sentAt: string
  recipientCount: number
  testEmail?: string | null
}

type EmailMarketingManagerProps = {
  stats: {
    buyers: number
    consentedBuyers: number
    recentBuyers30d: number
    loyaltyAudience: number
  }
  campaigns: Campaign[]
}

const segmentOptions: Array<{ id: EmailMarketingSegment; label: string }> = [
  { id: 'marketing-consented', label: 'All Marketing Consented Buyers' },
  { id: 'recent-buyers-30d', label: 'Recent Buyers (30d)' },
  { id: 'loyalty-members', label: 'Loyalty Audience' },
]

export function EmailMarketingManager({ stats, campaigns: initialCampaigns }: EmailMarketingManagerProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [saving, setSaving] = useState<'test' | 'send' | null>(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    subject: '',
    previewText: '',
    body: '<p>Share promotions, announcements, or curated picks here.</p>',
    segment: 'marketing-consented' as EmailMarketingSegment,
    testEmail: '',
  })

  async function submit(mode: 'test' | 'send') {
    setSaving(mode)
    setMessage('')
    try {
      const response = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mode }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string; campaign?: Campaign; recipientCount?: number; test?: boolean }
      if (!response.ok) {
        setMessage(data.error ?? 'Failed to send campaign')
        return
      }
      if (data.campaign) {
        setCampaigns((prev) => [data.campaign!, ...prev].slice(0, 20))
      }
      setMessage(
        mode === 'test'
          ? `Test email sent to ${form.testEmail}.`
          : `Campaign sent to ${data.recipientCount ?? 0} recipients.`,
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Buyer Accounts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.buyers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Marketing Opt-In</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.consentedBuyers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Recent Buyers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.recentBuyers30d}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Loyalty Audience</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.loyaltyAudience}</p>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Campaign Composer</h3>
        <div className="mt-4 space-y-3">
          <input
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Campaign subject"
          />
          <input
            value={form.previewText}
            onChange={(event) => setForm((prev) => ({ ...prev, previewText: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Preview text"
          />
          <select
            value={form.segment}
            onChange={(event) => setForm((prev) => ({ ...prev, segment: event.target.value as EmailMarketingSegment }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {segmentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Campaign body</p>
            <RichTextEditor
              value={form.body}
              onChange={(value) => setForm((prev) => ({ ...prev, body: value }))}
              placeholder="Build the campaign body with formatted copy, links, and lists."
              minHeightClassName="min-h-[240px]"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr,auto,auto]">
            <input
              value={form.testEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, testEmail: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Test email address"
            />
            <button
              type="button"
              onClick={() => void submit('test')}
              disabled={saving !== null}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {saving === 'test' ? 'Sending Test...' : 'Send Test'}
            </button>
            <button
              type="button"
              onClick={() => void submit('send')}
              disabled={saving !== null}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving === 'send' ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No campaigns sent yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Segment</th>
                  <th className="pb-2">Recipients</th>
                  <th className="pb-2">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-800">
                      <p className="font-medium">{campaign.subject}</p>
                      {campaign.previewText ? <p className="text-xs text-slate-500">{campaign.previewText}</p> : null}
                      {campaign.testEmail ? <p className="text-xs text-blue-600">Test: {campaign.testEmail}</p> : null}
                    </td>
                    <td className="py-2 text-slate-600">{campaign.segment}</td>
                    <td className="py-2 text-slate-600">{campaign.recipientCount}</td>
                    <td className="py-2 text-slate-600">{new Date(campaign.sentAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  )
}
