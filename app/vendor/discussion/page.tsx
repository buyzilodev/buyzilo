'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { VendorLayout } from '@/components/vendor/VendorLayout'

type VendorDiscussionItem = {
  id: string
  type: string
  status: string
  body: string
  createdAt: string
  user: { name?: string | null; email?: string | null; role?: string | null }
  product: { id: string; name: string; slug: string }
  replies: Array<{
    id: string
    body: string
    createdAt: string
    user: { name?: string | null; email?: string | null; role?: string | null }
  }>
}

export default function VendorDiscussionPage() {
  const [items, setItems] = useState<VendorDiscussionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingId, setReplyingId] = useState<string | null>(null)

  async function load() {
    const response = await fetch('/api/vendor/discussion')
    const data = await response.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  async function reply(item: VendorDiscussionItem) {
    const body = replyDrafts[item.id]?.trim()
    if (!body) return
    setReplyingId(item.id)
    try {
      const response = await fetch(`/api/products/${item.product.slug}/discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ANSWER', parentId: item.id, body }),
      })
      if (!response.ok) return
      setReplyDrafts((prev) => ({ ...prev, [item.id]: '' }))
      await load()
    } finally {
      setReplyingId(null)
    }
  }

  return (
    <VendorLayout title="Discussion" subtitle="Answer buyer questions and product comments">
      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading discussion queue...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No product discussion yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.type === 'QUESTION' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.type}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  <Link href={`/products/${item.product.slug}`} className="mt-2 block text-sm font-semibold text-blue-600 hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.user.name ?? item.user.email} • {new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">{item.body}</p>

              {item.replies.length > 0 ? (
                <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                  {item.replies.map((reply) => (
                    <div key={reply.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">{reply.user.name ?? reply.user.email}</p>
                      <p className="mt-1 text-sm text-slate-600">{reply.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <textarea
                  value={replyDrafts[item.id] ?? ''}
                  onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Post a public answer"
                />
                <button
                  type="button"
                  onClick={() => void reply(item)}
                  disabled={replyingId === item.id}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {replyingId === item.id ? 'Sending...' : 'Post answer'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </VendorLayout>
  )
}
