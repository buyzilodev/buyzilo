'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type Category = {
  id: string
  name: string
  slug: string
  image: string | null
  parentId: string | null
  feePercent?: number
  featureKeys?: string[]
  filterKeys?: string[]
  productCount: number
  parent?: { name: string } | null
}

type CategoryForm = {
  name: string
  slug: string
  image: string
  parentId: string
  feePercent: string
  featureKeys: string
  filterKeys: string
}

const defaultForm: CategoryForm = {
  name: '',
  slug: '',
  image: '[]',
  parentId: '',
  feePercent: '0',
  featureKeys: '',
  filterKeys: '',
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [search, setSearch] = useState('')

  const load = () => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const filtered = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  )

  const parentCategories = categories.filter((category) => !category.parentId)

  async function handleSave() {
    if (!form.name.trim()) {
      return
    }

    const payload = {
      ...(editId ? { id: editId } : {}),
      name: form.name,
      slug: form.slug || generateSlug(form.name),
      image: form.image || null,
      parentId: form.parentId || null,
      feePercent: Number(form.feePercent || '0'),
      featureKeys: form.featureKeys.split(',').map((item) => item.trim()).filter(Boolean),
      filterKeys: form.filterKeys.split(',').map((item) => item.trim()).filter(Boolean),
    }

    await fetch('/api/admin/categories', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setForm(defaultForm)
    setShowForm(false)
    setEditId(null)
    load()
  }

  function handleEdit(category: Category) {
    setEditId(category.id)
    setForm({
      name: category.name,
      slug: category.slug,
      image: category.image || '[]',
      parentId: category.parentId || '',
      feePercent: String(category.feePercent ?? 0),
      featureKeys: (category.featureKeys ?? []).join(', '),
      filterKeys: (category.filterKeys ?? []).join(', '),
    })
    setShowForm(true)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) {
      return
    }

    await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <AdminLayout title="Categories" subtitle="Manage product categories and vendor fee rules">
      <div className="mb-6 flex items-center justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          className="w-64 rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            setShowForm(true)
            setEditId(null)
            setForm(defaultForm)
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          + Add Category
        </button>
      </div>

      {showForm ? (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold">{editId ? 'Edit Category' : 'Add New Category'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category Name</label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                    slug: generateSlug(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Electronics"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. electronics"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Icon / Image token</label>
              <input
                value={form.image}
                onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. electronics-icon"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Parent Category</label>
              <select
                value={form.parentId}
                onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (Top Level)</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vendor Category Fee (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.feePercent}
                onChange={(event) => setForm((prev) => ({ ...prev, feePercent: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Feature Template Keys</label>
              <input
                value={form.featureKeys}
                onChange={(event) => setForm((prev) => ({ ...prev, featureKeys: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="brand, material, warranty"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Filter Keys</label>
              <input
                value={form.filterKeys}
                onChange={(event) => setForm((prev) => ({ ...prev, filterKeys: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="brand, price, availability"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => void handleSave()} className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700">
              {editId ? 'Update' : 'Save Category'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditId(null)
                setForm(defaultForm)
              }}
              className="rounded-lg border border-gray-200 px-6 py-2 font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-500">
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Slug</th>
                <th className="px-6 py-4 text-left">Parent</th>
                <th className="px-6 py-4 text-left">Vendor Fee</th>
                <th className="px-6 py-4 text-left">Feature Templates</th>
                <th className="px-6 py-4 text-left">Products</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((category) => (
                <tr key={category.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-400">{category.image || '[]'}</span>
                      <p className="font-medium">{category.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{category.slug}</td>
                  <td className="px-6 py-4 text-gray-500">{category.parent?.name ?? '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{(category.feePercent ?? 0).toFixed(2)}%</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{(category.featureKeys ?? []).join(', ') || '-'}</td>
                  <td className="px-6 py-4 font-semibold">{category.productCount ?? 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(category)} className="rounded-lg bg-blue-100 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-200">
                        Edit
                      </button>
                      <button onClick={() => void deleteCategory(category.id)} className="rounded-lg bg-red-100 px-3 py-1 text-xs text-red-600 transition hover:bg-red-200">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
