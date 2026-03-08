'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AddonManagedAdminPage } from '@/components/admin/AddonManagedAdminPage'

type DiscussionRow = {
  id: string
  type: string
  status: string
  body: string
  createdAt: string
  user: { name?: string | null; email?: string | null; role?: string | null }
  product: { name: string; slug: string; store: { name: string; slug: string } }
  parent?: { id: string; body: string; type: string } | null
  replies: Array<{ id: string }>
}

export default function AdminDiscussionPage() {
  const [items, setItems] = useState<DiscussionRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const response = await fetch('/api/admin/discussion')
      const data = await response.json()
      setItems(data.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function moderate(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    await fetch('/api/admin/discussion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await load()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this discussion item?')) return
    await fetch(`/api/admin/discussion?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  return (
    <AddonManagedAdminPage
      addonId="discussion"
      pageHref="/admin/reviews/discussion"
      fallbackTitle="Discussion"
      fallbackSubtitle="Moderate product questions, answers, and public comments"
      loadingText="Loading discussion queue..."
    >
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Total Threads</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{items.filter((item) => !item.parent).length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-black text-amber-600">{items.filter((item) => item.status === 'PENDING').length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Questions</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{items.filter((item) => item.type === 'QUESTION').length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Replies</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{items.reduce((sum, item) => sum + item.replies.length, 0)}</p>
        </article>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading discussion queue...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Body</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <Link href={`/products/${item.product.slug}`} className="font-semibold text-blue-600 hover:underline">
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{item.product.store.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.user.name ?? item.user.email}
                      <p className="text-xs text-slate-500">{item.user.role ?? 'BUYER'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="max-w-xl">{item.body}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void moderate(item.id, 'APPROVED')} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">Approve</button>
                        <button onClick={() => void moderate(item.id, 'REJECTED')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Reject</button>
                        <button onClick={() => void remove(item.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AddonManagedAdminPage>
  )
}
