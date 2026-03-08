'use client'

import { startTransition, useEffect, useState } from 'react'
import { VendorLayout } from '@/components/vendor/VendorLayout'

type Thread = {
  id: string
  subject: string
  category: string
  updatedAt: string
  messages: Array<{
    id: string
    body: string
    createdAt: string
    sender?: { name?: string | null; email?: string | null; role?: string | null } | null
  }>
}

export default function VendorMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/messages/threads')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        startTransition(() => {
          setThreads(data.threads ?? [])
          setActiveThreadId(data.threads?.[0]?.id ?? null)
          setLoading(false)
        })
      })
      .catch(() => {
        if (cancelled) return
        startTransition(() => {
          setThreads([])
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
    const response = await fetch('/api/messages/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeThreadId, body: draft }),
    })
    if (!response.ok) return
    const data = await response.json()
    setThreads(data.threads ?? [])
    setDraft('')
  }

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null

  return (
    <VendorLayout title="Messages" subtitle="Moderation notices and admin communication">
      {loading ? (
        <p className="text-sm text-slate-500">Loading messages...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Threads</h3>
            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${activeThreadId === thread.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="font-semibold text-slate-800">{thread.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{thread.category} • {new Date(thread.updatedAt).toLocaleString()}</p>
                </button>
              ))}
              {threads.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {!activeThread ? (
              <p className="text-sm text-slate-500">Select a thread to read messages.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{activeThread.subject}</h3>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{activeThread.category}</p>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
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
        </div>
      )}
    </VendorLayout>
  )
}
