'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

interface CustomPage {
  id: string
  title: string
  slug: string
  content: string
  isActive: boolean
  createdAt: string
}

export default function CustomPagesPage() {
  const [pages, setPages] = useState<CustomPage[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', content: '', isActive: true })

  async function fetchPages() {
    const res = await fetch('/api/admin/pages')
    const data = await res.json()
    setPages(Array.isArray(data) ? data : [])
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchPages() }, [])

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const handleSave = async () => {
    if (!form.title || !form.content) return
    setSaving(true)
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { id: editId, ...form } : form

    const res = await fetch('/api/admin/pages', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      await fetchPages()
      setShowForm(false)
      setEditId(null)
      setForm({ title: '', slug: '', content: '', isActive: true })
    }
    setSaving(false)
  }

  const handleEdit = (page: CustomPage) => {
    setEditId(page.id)
    setForm({ title: page.title, slug: page.slug, content: page.content, isActive: page.isActive })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return
    await fetch('/api/admin/pages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchPages()
  }

  const defaultPages = [
    { title: 'Privacy Policy', slug: 'privacy-policy', template: `# Privacy Policy\n\nLast updated: March 2026\n\n## Introduction\nWelcome to Buyzilo. We respect your privacy and are committed to protecting your personal data.\n\n## Data We Collect\n- Name and email address\n- Order and payment information\n- Usage data and cookies\n\n## How We Use Your Data\nWe use your data to process orders, improve our services, and communicate with you.\n\n## Contact Us\nFor privacy questions, contact us at privacy@buyzilo.com` },
    { title: 'Terms of Service', slug: 'terms-of-service', template: `# Terms of Service\n\nLast updated: March 2026\n\n## Acceptance of Terms\nBy using Buyzilo, you agree to these terms.\n\n## Use of Service\nYou must be 18+ to use this service. You agree not to misuse our platform.\n\n## Vendor Terms\nVendors must provide accurate product information and fulfill orders promptly.\n\n## Contact\nFor questions, contact legal@buyzilo.com` },
    { title: 'Return Policy', slug: 'return-policy', template: `# Return Policy\n\nWe offer a 30-day return policy on most items.\n\n## Eligibility\n- Items must be unused and in original packaging\n- Return request must be made within 30 days\n\n## Process\n1. Contact our support team\n2. Receive return label\n3. Ship item back\n4. Refund processed in 5-7 days` },
  ]

  return (
    <AdminLayout title="Custom Pages" subtitle="Create and manage static pages like Privacy Policy, Terms, etc.">

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">{pages.length} pages created</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', slug: '', content: '', isActive: true }) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition"
        >
          + Create Page
        </button>
      </div>

      {pages.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-blue-800 mb-3">📄 Quick Start Templates</p>
          <div className="flex gap-3 flex-wrap">
            {defaultPages.map(template => (
              <button
                key={template.slug}
                onClick={() => {
                  setForm({ title: template.title, slug: template.slug, content: template.template, isActive: true })
                  setShowForm(true)
                }}
                className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-bold mb-4">{editId ? 'Edit Page' : 'Create New Page'}</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Privacy Policy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="bg-gray-50 px-3 py-2 text-gray-400 text-sm border-r">/pages/</span>
                <input
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
              <span className="text-gray-400 font-normal ml-2">(Markdown supported)</span>
            </label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={12}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="# Page Title&#10;&#10;Write your page content here..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Published</span>
              <button
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editId ? 'Update Page' : 'Publish Page'}
              </button>

              <button
                onClick={() => { setShowForm(false); setEditId(null) }}
                className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {pages.length === 0 && !showForm ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-gray-500 font-medium">No pages yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first page using the button above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-500">
                <th className="text-left px-6 py-4">Title</th>
                <th className="text-left px-6 py-4">URL</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Created</th>
                <th className="text-left px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {pages.map(page => (
                <tr key={page.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{page.title}</td>

                  <td className="px-6 py-4">
                    <a
                      href={`/pages/${page.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      /pages/{page.slug}
                    </a>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${page.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {page.isActive ? 'Published' : 'Draft'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-500">
                    {new Date(page.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <a
                        href={`/pages/${page.slug}`}
                        target="_blank"
                        className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-lg hover:bg-gray-200 transition"
                      >
                        View
                      </a>

                      <button
                        onClick={() => handleEdit(page)}
                        className="bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-lg hover:bg-blue-200 transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(page.id)}
                        className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-lg hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </AdminLayout>
  )
}
