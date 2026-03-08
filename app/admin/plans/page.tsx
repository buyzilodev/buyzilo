'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type VendorPlanRow = {
  id: string
  name: string
  price: number
  billingCycle: string
  productLimit: number
  commissionRate: number
  features: string[]
  isActive: boolean
  subscribers: number
  monthlyRevenue: number
}

type PlanForm = {
  name: string
  price: string
  productLimit: string
  commissionRate: string
  billingCycle: 'monthly' | 'yearly'
  features: string
  isActive: boolean
}

const emptyForm: PlanForm = {
  name: '',
  price: '',
  productLimit: '',
  commissionRate: '',
  billingCycle: 'monthly',
  features: '',
  isActive: true,
}

export default function VendorPlansPage() {
  const [plans, setPlans] = useState<VendorPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm)

  async function loadPlans() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/plans')
      const data = (await response.json()) as VendorPlanRow[] | { error?: string }
      if (!response.ok) {
        setError(!Array.isArray(data) ? data.error ?? 'Failed to load plans' : 'Failed to load plans')
        setPlans([])
      } else {
        setPlans(Array.isArray(data) ? data : [])
      }
    } catch {
      setError('Failed to load plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlans()
  }, [])

  const totals = useMemo(() => {
    const totalSubscribers = plans.reduce((sum, plan) => sum + plan.subscribers, 0)
    const monthlyRevenue = plans.reduce((sum, plan) => sum + plan.monthlyRevenue, 0)
    return {
      totalPlans: plans.length,
      activePlans: plans.filter((plan) => plan.isActive).length,
      totalSubscribers,
      monthlyRevenue,
    }
  }, [plans])

  function openCreate() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function openEdit(plan: VendorPlanRow) {
    setEditId(plan.id)
    setForm({
      name: plan.name,
      price: String(plan.price),
      productLimit: String(plan.productLimit),
      commissionRate: String(plan.commissionRate),
      billingCycle: plan.billingCycle === 'yearly' ? 'yearly' : 'monthly',
      features: plan.features.join(', '),
      isActive: plan.isActive,
    })
    setShowForm(true)
    setError(null)
  }

  async function savePlan() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        name: form.name.trim(),
        price: Number(form.price),
        productLimit: Number(form.productLimit),
        commissionRate: Number(form.commissionRate),
        billingCycle: form.billingCycle,
        features: form.features.split(',').map((item) => item.trim()).filter(Boolean),
        isActive: form.isActive,
      }

      const response = await fetch('/api/admin/plans', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error ?? 'Failed to save plan')
        return
      }

      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
      await loadPlans()
    } catch {
      setError('Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  async function togglePlan(plan: VendorPlanRow) {
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
      })
      if (response.ok) await loadPlans()
    } catch {
      setError('Failed to update plan status')
    }
  }

  async function deletePlan(plan: VendorPlanRow) {
    if (!confirm(`Delete plan "${plan.name}"?`)) return
    try {
      const response = await fetch(`/api/admin/plans?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Failed to delete plan')
        return
      }
      await loadPlans()
    } catch {
      setError('Failed to delete plan')
    }
  }

  return (
    <AdminLayout title="Vendor Plans" subtitle="Manage subscription plans for vendors">
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Plans</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totals.totalPlans}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Active Plans</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totals.activePlans}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Subscribers</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totals.totalSubscribers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Monthly Revenue</p>
          <p className="mt-1 text-2xl font-black text-slate-900">${totals.monthlyRevenue.toFixed(2)}</p>
        </article>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Plan Catalog</h2>
        <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Create Plan
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {showForm && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">{editId ? 'Edit Plan' : 'Create Plan'}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Plan name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={form.billingCycle} onChange={(event) => setForm((prev) => ({ ...prev, billingCycle: event.target.value as 'monthly' | 'yearly' }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input type="number" min="0" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="Price" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="number" min="0" value={form.productLimit} onChange={(event) => setForm((prev) => ({ ...prev, productLimit: event.target.value }))} placeholder="Product limit" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="number" min="0" max="100" value={form.commissionRate} onChange={(event) => setForm((prev) => ({ ...prev, commissionRate: event.target.value }))} placeholder="Commission rate (%)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Active
            </label>
            <textarea value={form.features} onChange={(event) => setForm((prev) => ({ ...prev, features: event.target.value }))} rows={3} placeholder="Features (comma separated)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={savePlan} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : editId ? 'Update Plan' : 'Create Plan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading plans...</p>
        ) : plans.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">No plans created yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Subscribers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{plan.name}</p>
                    <p className="text-xs text-slate-500">{plan.features.slice(0, 3).join(', ') || 'No features'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">${plan.price.toFixed(2)} / {plan.billingCycle}</td>
                  <td className="px-4 py-3 text-slate-700">{plan.productLimit}</td>
                  <td className="px-4 py-3 text-slate-700">{plan.commissionRate}%</td>
                  <td className="px-4 py-3 text-slate-700">{plan.subscribers}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {plan.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(plan)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                      <button onClick={() => void togglePlan(plan)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {plan.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => void deletePlan(plan)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
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
