'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminOrderSubsections } from '@/components/admin/subsections'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type SupportRequest = {
  id: string
  subject: string
  status: string
  resolutionNote?: string | null
  createdAt: string
  user?: { id: string; name?: string | null; email?: string | null } | null
  store?: {
    id: string
    name: string
    slug: string
    vendor?: { id: string; name?: string | null; email?: string | null } | null
  } | null
  order?: { id: string; status: string } | null
  thread?: {
    messages: Array<{
      id: string
      body: string
      createdAt: string
      sender?: { name?: string | null; email?: string | null; role?: string | null } | null
    }>
  } | null
  meta?: {
    type?: 'TICKET' | 'CALL_REQUEST'
    callbackPhone?: string | null
    callbackWindow?: string | null
  } | null
}

const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

export default function AdminCallRequestsPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, { message: string; resolutionNote: string }>>({})

  async function load() {
    const response = await fetch('/api/admin/support?type=CALL_REQUEST')
    const data = await response.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  async function updateRequest(id: string, payload: Record<string, string>) {
    setSaving(true)
    try {
      await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Call Requests" subtitle="Review callback requests and coordinate follow-up with buyers">
      <SubsectionNav items={adminOrderSubsections} />

      <article className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Callback Queue</h3>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading callback requests...</p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No callback requests found.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{item.subject}</h4>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">Call Request</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.user?.name || item.user?.email || 'Guest'} {item.store ? `| ${item.store.name}` : ''} {item.order ? `| Order ${item.order.id}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      Callback: {item.meta?.callbackPhone || 'Not provided'}
                      {item.meta?.callbackWindow ? ` | ${item.meta.callbackWindow}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <select value={item.status} onChange={(event) => void updateRequest(item.id, { status: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      {statuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {item.thread?.messages?.map((message) => (
                    <div key={message.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-600">{message.sender?.name || message.sender?.email || message.sender?.role || 'User'}</p>
                      <p className="mt-1 text-sm text-slate-800">{message.body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <RichTextEditor
                    value={drafts[item.id]?.message ?? ''}
                    onChange={(value) => setDrafts((prev) => ({ ...prev, [item.id]: { message: value, resolutionNote: prev[item.id]?.resolutionNote ?? item.resolutionNote ?? '' } }))}
                    output="text"
                    placeholder="Reply to this ticket"
                    minHeightClassName="min-h-[110px]"
                  />
                  <input value={drafts[item.id]?.resolutionNote ?? item.resolutionNote ?? ''} onChange={(event) => setDrafts((prev) => ({ ...prev, [item.id]: { message: prev[item.id]?.message ?? '', resolutionNote: event.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Resolution note" />
                  <div className="flex gap-2">
                    <button onClick={() => void updateRequest(item.id, { message: drafts[item.id]?.message ?? '' })} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                      Reply
                    </button>
                    <button onClick={() => void updateRequest(item.id, { status: 'RESOLVED', resolutionNote: drafts[item.id]?.resolutionNote ?? '' })} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      Resolve
                    </button>
                    <button onClick={() => void updateRequest(item.id, { status: 'CLOSED', resolutionNote: drafts[item.id]?.resolutionNote ?? '' })} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                      Close
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </AdminLayout>
  )
}
