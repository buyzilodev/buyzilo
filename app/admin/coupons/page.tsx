'use client'
import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type Coupon = {
  id: string
  code: string
  discount: number
  isPercent: boolean
  minOrder: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '', discount: '', isPercent: true,
    minOrder: '', maxUses: '', expiresAt: '',
  })

  const load = () => {
    fetch('/api/admin/coupons')
      .then((res) => res.json())
      .then((data) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (!form.code || !form.discount) return
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.toUpperCase(),
        discount: parseFloat(form.discount),
        isPercent: form.isPercent,
        minOrder: form.minOrder ? parseFloat(form.minOrder) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    })
    setForm({ code: '', discount: '', isPercent: true, minOrder: '', maxUses: '', expiresAt: '' })
    setShowForm(false)
    load()
  }

  const toggleCoupon = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/coupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    load()
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <AdminLayout title="Coupons & Discounts" subtitle="Create and manage coupon codes">
      <div className="flex justify-between items-center mb-6">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-gray-500 text-sm">Total Coupons</p>
            <p className="text-2xl font-bold text-blue-600">{coupons.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-gray-500 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-600">{coupons.filter((c) => c.isActive).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-gray-500 text-sm">Total Used</p>
            <p className="text-2xl font-bold text-purple-600">{coupons.reduce((s, c) => s + c.usedCount, 0)}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition whitespace-nowrap"
        >
          + Create Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-bold mb-4">Create New Coupon</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="e.g. SAVE10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select value={String(form.isPercent)} onChange={(e) => setForm({ ...form, isPercent: e.target.value === 'true' })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="true">Percentage (%)</option>
                <option value="false">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
              <input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">Create Coupon</button>
            <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-500">
                <th className="text-left px-6 py-4">Code</th>
                <th className="text-left px-6 py-4">Discount</th>
                <th className="text-left px-6 py-4">Min Order</th>
                <th className="text-left px-6 py-4">Usage</th>
                <th className="text-left px-6 py-4">Expires</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 font-mono font-bold px-3 py-1 rounded-lg text-gray-800">{coupon.code}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-green-600">
                    {coupon.isPercent ? `${coupon.discount}%` : `$${coupon.discount}`} off
                  </td>
                  <td className="px-6 py-4 text-gray-500">${coupon.minOrder ?? 0}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">{coupon.usedCount}/{coupon.maxUses ?? '∞'}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {coupon.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleCoupon(coupon.id, coupon.isActive)} className={`text-xs px-3 py-1 rounded-lg mr-2 ${coupon.isActive ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteCoupon(coupon.id)} className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-lg">Delete</button>
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
