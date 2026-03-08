'use client'

import { useEffect, useState } from 'react'
import { AddonManagedAdminPage } from '@/components/admin/AddonManagedAdminPage'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type Category = { slug: string; title: string; description: string }
type Article = { slug: string; title: string; excerpt: string; content: string; categorySlug: string; keywords: string[]; featured?: boolean; published?: boolean }

export default function AdminHelpCenterPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/help-center').then((response) => response.ok ? response.json() : { categories: [], articles: [] }).catch(() => ({ categories: [], articles: [] }))
      .then((data) => {
        setCategories(Array.isArray(data.categories) ? data.categories : [])
        setArticles(Array.isArray(data.articles) ? data.articles : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/admin/help-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, articles }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AddonManagedAdminPage
      addonId="help_center"
      pageHref="/admin/website/help-center"
      fallbackTitle="Help Center"
      fallbackSubtitle="Manage support categories and knowledge-base articles"
      loadingText="Loading help center..."
    >
      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading help center...</p>
      ) : (
        <div className="space-y-6">
          <SubsectionNav items={adminWebsiteSubsections} />
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Categories</h2>
                <p className="text-sm text-slate-500">Organize knowledge by support area.</p>
              </div>
              <button
                onClick={() => setCategories((prev) => [...prev, { slug: '', title: '', description: '' }])}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Add category
              </button>
            </div>
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={`category-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr,1fr,1.4fr,auto]">
                  <input value={category.slug} onChange={(event) => setCategories((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, slug: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="slug" />
                  <input value={category.title} onChange={(event) => setCategories((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="title" />
                  <input value={category.description} onChange={(event) => setCategories((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="description" />
                  <button onClick={() => setCategories((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Remove</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Articles</h2>
                <p className="text-sm text-slate-500">Create search-friendly support articles and FAQs.</p>
              </div>
              <button
                onClick={() => setArticles((prev) => [...prev, { slug: '', title: '', excerpt: '', content: '', categorySlug: categories[0]?.slug ?? '', keywords: [], featured: false, published: true }])}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Add article
              </button>
            </div>
            <div className="space-y-4">
              {articles.map((article, index) => (
                <div key={`article-${index}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={article.slug} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, slug: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="slug" />
                    <input value={article.title} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="title" />
                    <input value={article.categorySlug} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, categorySlug: event.target.value } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="category slug" />
                    <input value={article.keywords.join(', ')} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, keywords: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } : item))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="keywords" />
                  </div>
                  <div className="mt-3">
                    <RichTextEditor
                      value={article.excerpt}
                      onChange={(value) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, excerpt: value } : item))}
                      output="text"
                      placeholder="Excerpt"
                      minHeightClassName="min-h-[90px]"
                    />
                  </div>
                  <div className="mt-3">
                    <RichTextEditor
                      value={article.content}
                      onChange={(value) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, content: value } : item))}
                      placeholder="Article content"
                      minHeightClassName="min-h-[220px]"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={article.featured ?? false} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, featured: event.target.checked } : item))} />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={article.published ?? true} onChange={(event) => setArticles((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, published: event.target.checked } : item))} />
                      Published
                    </label>
                    <button onClick={() => setArticles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save help center'}
            </button>
          </div>
        </div>
      )}
    </AddonManagedAdminPage>
  )
}
