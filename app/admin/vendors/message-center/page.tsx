'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminVendorSubsections } from '@/components/admin/subsections'

type VendorOption = {
  id: string
  name: string
  vendor: { id: string; name?: string | null; email?: string | null }
}

type Thread = {
  id: string
  subject: string
  category: string
  updatedAt: string
  participants: Array<{ user: { id: string; name?: string | null; email?: string | null; role?: string | null } }>
  messages: Array<{
    id: string
    body: string
    createdAt: string
    sender?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null
  }>
}

export default function AdminVendorMessageCenterPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [newThread, setNewThread] = useState({ vendorUserId: '', subject: '', message: '' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/vendor-threads')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        startTransition(() => {
          setThreads(data.threads ?? [])
          setVendors(data.vendors ?? [])
          setActiveThreadId(data.threads?.[0]?.id ?? null)
          setLoading(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        startTransition(() => {
          setThreads([])
          setVendors([])
          setActiveThreadId(null)
          setLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function sendReply() {
    if (!activeThreadId || !draft.trim()) return
    const response = await fetch('/api/admin/vendor-threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeThreadId, message: draft }),
    })
    if (!response.ok) return
    const data = await response.json()
    setThreads(data.threads ?? [])
    setDraft('')
  }

  async function createThread() {
    if (!newThread.vendorUserId || !newThread.subject.trim() || !newThread.message.trim()) return
    const response = await fetch('/api/admin/vendor-threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newThread),
    })
    if (!response.ok) return
    const data = await response.json()
    setThreads(data.threads ?? [])
    setActiveThreadId(data.threads?.[0]?.id ?? null)
    setNewThread({ vendorUserId: '', subject: '', message: '' })
  }

  const activeThread = useMemo(() => threads.find((thread) => thread.id === activeThreadId) ?? null, [activeThreadId, threads])

  return (
    <AdminLayout title="Vendor Message Center" subtitle="Threads involving vendors and admin staff">
      <SubsectionNav items={adminVendorSubsections} />

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading vendor threads...</p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[320px,1fr,320px]">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Vendor Threads</h3>
            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${activeThreadId === thread.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="font-semibold text-slate-800">{thread.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {thread.participants.map((participant) => participant.user.name ?? participant.user.email ?? participant.user.role).join(', ')}
                  </p>
                </button>
              ))}
              {threads.length === 0 && <p className="text-sm text-slate-500">No vendor threads found.</p>}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {!activeThread ? (
              <p className="text-sm text-slate-500">Select a vendor thread.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{activeThread.subject}</h3>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{activeThread.category}</p>
                </div>
                <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {activeThread.messages.map((message) => (
                    <div key={message.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-800">{message.sender?.name ?? message.sender?.email ?? message.sender?.role ?? 'System'}</p>
                        <span className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-slate-700">{message.body}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Reply to this thread" />
                  <button onClick={() => void sendReply()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Send reply
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">New Vendor Thread</h3>
            <div className="space-y-3">
              <select value={newThread.vendorUserId} onChange={(event) => setNewThread((prev) => ({ ...prev, vendorUserId: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.vendor.id} value={vendor.vendor.id}>{vendor.name} ({vendor.vendor.name ?? vendor.vendor.email})</option>
                ))}
              </select>
              <input value={newThread.subject} onChange={(event) => setNewThread((prev) => ({ ...prev, subject: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Subject" />
              <textarea value={newThread.message} onChange={(event) => setNewThread((prev) => ({ ...prev, message: event.target.value }))} rows={6} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Message" />
              <button onClick={() => void createThread()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Create thread
              </button>
            </div>
          </article>
        </div>
      )}
    </AdminLayout>
  )
}
