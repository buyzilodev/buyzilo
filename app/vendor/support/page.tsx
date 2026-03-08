'use client'

import { useEffect, useState } from 'react'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type SupportRequest = {
  id: string
  subject: string
  status: string
  resolutionNote?: string | null
  createdAt: string
  user?: { id: string; name?: string | null; email?: string | null } | null
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

export default function VendorSupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, { message: string; resolutionNote: string }>>({})

  async function load() {
    const response = await fetch('/api/vendor/support')
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
      setDrafts((prev) => ({ ...prev, [id]: { message: '', resolutionNote: prev[id]?.resolutionNote ?? '' } }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendorLayout title="Support" subtitle="Handle buyer support requests for your store">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Support Queue</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No support requests for this store.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{request.subject}</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {request.meta?.type === 'CALL_REQUEST' ? 'Call Request' : 'Ticket'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {request.user?.name || request.user?.email || 'Buyer'} | {new Date(request.createdAt).toLocaleString()} {request.order ? `| Order ${request.order.id}` : ''}
                    </p>
                    {request.meta?.type === 'CALL_REQUEST' && (
                      <p className="mt-1 text-xs text-blue-700">
                        Callback: {request.meta.callbackPhone || 'Not provided'}
                        {request.meta.callbackWindow ? ` | ${request.meta.callbackWindow}` : ''}
                      </p>
                    )}
                  </div>
                  <select value={request.status} onChange={(event) => void updateRequest(request.id, { status: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 space-y-3">
                  {request.thread?.messages?.map((message) => (
                    <div key={message.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-600">{message.sender?.name || message.sender?.email || message.sender?.role || 'User'}</p>
                      <p className="mt-1 text-sm text-slate-800">{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <RichTextEditor
                    value={drafts[request.id]?.message ?? ''}
                    onChange={(value) => setDrafts((prev) => ({ ...prev, [request.id]: { message: value, resolutionNote: prev[request.id]?.resolutionNote ?? '' } }))}
                    output="text"
                    placeholder="Reply to the buyer"
                    minHeightClassName="min-h-[110px]"
                  />
                  <input value={drafts[request.id]?.resolutionNote ?? request.resolutionNote ?? ''} onChange={(event) => setDrafts((prev) => ({ ...prev, [request.id]: { message: prev[request.id]?.message ?? '', resolutionNote: event.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Resolution note" />
                  <div className="flex gap-2">
                    <button onClick={() => void updateRequest(request.id, { message: drafts[request.id]?.message ?? '' })} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                      Send reply
                    </button>
                    <button onClick={() => void updateRequest(request.id, { status: 'RESOLVED', resolutionNote: drafts[request.id]?.resolutionNote ?? '' })} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      Mark resolved
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </VendorLayout>
  )
}
