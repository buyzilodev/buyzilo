'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'

type CommentRow = {
  id: string
  content: string
  isApproved: boolean
  createdAt: string
  authorName: string | null
  user: { name: string | null; email: string | null } | null
  post: { title: string }
}

export default function AdminWebsiteCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadComments() {
    setLoading(true)
    const response = await fetch('/api/admin/blog/comments')
    if (!response.ok) {
      setComments([])
      setLoading(false)
      return
    }
    const data = (await response.json()) as { comments?: CommentRow[] }
    setComments(Array.isArray(data.comments) ? data.comments : [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadComments()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function setApproval(comment: CommentRow, isApproved: boolean) {
    const response = await fetch('/api/admin/blog/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id, isApproved }),
    })
    if (response.ok) {
      setComments((prev) => prev.map((item) => (item.id === comment.id ? { ...item, isApproved } : item)))
    }
  }

  async function removeComment(comment: CommentRow) {
    if (!confirm('Delete this comment?')) return
    const response = await fetch(`/api/admin/blog/comments?id=${encodeURIComponent(comment.id)}`, { method: 'DELETE' })
    if (response.ok) {
      setComments((prev) => prev.filter((item) => item.id !== comment.id))
    }
  }

  return (
    <AdminLayout title="Comments" subtitle="Moderate storefront blog comments">
      <SubsectionNav items={adminWebsiteSubsections} />

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Latest Comments</h3>
        {loading ? (
          <p className="py-8 text-sm text-slate-500">Loading comments...</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{comment.post.title}</p>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${comment.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {comment.isApproved ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {comment.user?.name ?? comment.user?.email ?? comment.authorName ?? 'Anonymous'} • {new Date(comment.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  {!comment.isApproved && (
                    <button onClick={() => void setApproval(comment, true)} className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                      Approve
                    </button>
                  )}
                  {comment.isApproved && (
                    <button onClick={() => void setApproval(comment, false)} className="rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                      Unapprove
                    </button>
                  )}
                  <button onClick={() => void removeComment(comment)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No comments submitted yet.</p>}
          </div>
        )}
      </article>
    </AdminLayout>
  )
}
