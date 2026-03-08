'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'

type BlogPostRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  metaTitle: string | null
  metaDescription: string | null
  published: boolean
  publishedAt: string | null
  author: { name: string | null; email: string | null } | null
  commentsCount: number
  tags: string[]
  createdAt: string
}

type BlogForm = {
  title: string
  slug: string
  excerpt: string
  content: string
  metaTitle: string
  metaDescription: string
  tags: string
  published: boolean
}

const emptyForm: BlogForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  metaTitle: '',
  metaDescription: '',
  tags: '',
  published: false,
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function AdminWebsiteBlogPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<BlogForm>(emptyForm)

  async function loadPosts() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/blog')
      const data = (await response.json()) as BlogPostRow[] | { error?: string }
      if (!response.ok) {
        setError(!Array.isArray(data) ? data.error ?? 'Failed to load posts' : 'Failed to load posts')
        setPosts([])
      } else {
        setPosts(Array.isArray(data) ? data : [])
      }
    } catch {
      setError('Failed to load posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  const publishedCount = useMemo(() => posts.filter((post) => post.published).length, [posts])

  function openCreate() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(post: BlogPostRow) {
    setEditId(post.id)
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      metaTitle: post.metaTitle ?? '',
      metaDescription: post.metaDescription ?? '',
      tags: post.tags.join(', '),
      published: post.published,
    })
    setShowForm(true)
  }

  async function savePost() {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        title: form.title.trim(),
        slug: form.slug.trim() || toSlug(form.title),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        metaTitle: form.metaTitle.trim(),
        metaDescription: form.metaDescription.trim(),
        published: form.published,
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      }

      const response = await fetch('/api/admin/blog', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error ?? 'Failed to save post')
        return
      }

      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
      await loadPosts()
    } catch {
      setError('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(post: BlogPostRow) {
    if (!confirm(`Delete "${post.title}"?`)) return
    try {
      const response = await fetch(`/api/admin/blog?id=${encodeURIComponent(post.id)}`, { method: 'DELETE' })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Failed to delete post')
        return
      }
      await loadPosts()
    } catch {
      setError('Failed to delete post')
    }
  }

  return (
    <AdminLayout title="Blog" subtitle="Create, edit, publish, and manage storefront blog content">
      <SubsectionNav items={adminWebsiteSubsections} />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Total Posts</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{posts.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Published</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{publishedCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + New Post
          </button>
        </article>
      </div>

      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {showForm && (
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-slate-900">{editId ? 'Edit Post' : 'Create Post'}</h3>
          <div className="grid gap-3">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value, slug: prev.slug || toSlug(event.target.value) }))}
              placeholder="Title"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="Slug" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={form.excerpt} onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))} rows={2} placeholder="Excerpt" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} rows={8} placeholder="Content" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.metaTitle} onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value }))} placeholder="Meta title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={form.metaDescription} onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value }))} rows={2} placeholder="Meta description" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))} />
              Publish now
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={savePost} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : editId ? 'Update Post' : 'Create Post'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">No posts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{post.title}</p>
                    <p className="text-xs text-slate-500">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{post.author?.name ?? post.author?.email ?? 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${post.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {post.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{post.commentsCount}</td>
                  <td className="px-4 py-3 text-slate-700">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(post)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                      <button onClick={() => void deletePost(post)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminLayout>
  )
}
