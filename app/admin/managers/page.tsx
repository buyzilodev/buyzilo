'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RolePermissions, type Permission } from '@/lib/permissions'

type ManagerRow = {
  id: string
  name: string | null
  email: string
  role: string
  permissions: Permission[]
  createdAt: string
}

const roles = ['MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR'] as const
const roleDescriptions: Record<(typeof roles)[number], string> = {
  MANAGER: 'Broad marketplace operations, catalog review, vendors, and reports.',
  SUPPORT: 'Buyer-facing support, customer issues, and order follow-up.',
  FINANCE: 'Payouts, revenue visibility, and finance-oriented review.',
  MODERATOR: 'Catalog moderation, product approval, and review quality.',
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER',
    permissions: [...RolePermissions.MANAGER],
  })
  const [editState, setEditState] = useState<Record<string, { role: string; permissions: Permission[] }>>({})

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/managers')
      const data = await response.json()
      const rows = Array.isArray(data) ? data : []
      setManagers(rows)
      setEditState(
        Object.fromEntries(
          rows.map((manager: ManagerRow) => [
            manager.id,
            {
              role: manager.role,
              permissions: manager.permissions ?? [],
            },
          ])
        )
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => ({
    total: managers.length,
    managers: managers.filter((row) => row.role === 'MANAGER').length,
    support: managers.filter((row) => row.role === 'SUPPORT').length,
    finance: managers.filter((row) => row.role === 'FINANCE').length,
    moderators: managers.filter((row) => row.role === 'MODERATOR').length,
  }), [managers])

  function setRole(role: string) {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: [...(RolePermissions[role] ?? [])],
    }))
  }

  function togglePermission(permission: Permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }))
  }

  function setEditRole(id: string, role: string) {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        role,
        permissions: [...(RolePermissions[role] ?? [])],
      },
    }))
  }

  function toggleEditPermission(id: string, permission: Permission) {
    setEditState((prev) => {
      const current = prev[id] ?? { role: 'MANAGER', permissions: [] }
      return {
        ...prev,
        [id]: {
          ...current,
          permissions: current.permissions.includes(permission)
            ? current.permissions.filter((item) => item !== permission)
            : [...current.permissions, permission],
        },
      }
    })
  }

  async function createManager() {
    const response = await fetch('/api/admin/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) return
    setShowForm(false)
    setForm({ name: '', email: '', password: '', role: 'MANAGER', permissions: [...RolePermissions.MANAGER] })
    await load()
  }

  async function saveManager(id: string) {
    const current = editState[id]
    if (!current) return
    setSavingId(id)
    try {
      await fetch('/api/admin/managers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          role: current.role,
          permissions: current.permissions,
        }),
      })
      setEditingId(null)
      await load()
    } finally {
      setSavingId(null)
    }
  }

  async function removeManager(id: string) {
    if (!window.confirm('Delete this admin team account?')) return
    await fetch('/api/admin/managers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  return (
    <AdminLayout title="Admin Access Levels" subtitle="Manage manager, support, finance, and moderator teams with clearer operational control">
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Team Members" value={String(stats.total)} hint="Non-owner admin team accounts" />
        <StatCard label="Managers" value={String(stats.managers)} hint="Operations and catalog leadership" />
        <StatCard label="Support" value={String(stats.support)} hint="Customer-facing admin staff" />
        <StatCard label="Finance" value={String(stats.finance)} hint="Payout and revenue-focused staff" />
        <StatCard label="Moderators" value={String(stats.moderators)} hint="Catalog and review moderation" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
        <Section title="Role Matrix" subtitle="Operational intent for each internal role">
          <div className="space-y-3">
            {roles.map((role) => (
              <article key={role} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={role} />
                  <span className="text-xs font-semibold text-slate-500">{RolePermissions[role].length} default permissions</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{roleDescriptions[role]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {RolePermissions[role].map((permission) => (
                    <span key={permission} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {permission}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Operational Shortcuts" subtitle="Jump into the backend areas each role typically owns">
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/admin/orders" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Orders and fulfillment desk
            </Link>
            <Link href="/admin/products/manage" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Product review and catalog desk
            </Link>
            <Link href="/admin/customers/message-center" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Customer message center
            </Link>
            <Link href="/admin/vendors/accounting" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Vendor accounting and payouts
            </Link>
          </div>
        </Section>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? 'Close' : 'Add Team Member'}
        </button>
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Create Admin User</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={form.role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {Object.values(RolePermissions.ADMIN).map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                {permission}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => void createManager()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Create
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-8 text-sm text-slate-500">Loading team...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Permissions</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((manager) => {
                  const editable = editingId === manager.id
                  const current = editState[manager.id] ?? { role: manager.role, permissions: manager.permissions ?? [] }
                  return (
                    <tr key={manager.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 text-slate-800">{manager.name ?? 'Unnamed'}</td>
                      <td className="py-3 text-slate-700">{manager.email}</td>
                      <td className="py-3">
                        {editable ? (
                          <select value={current.role} onChange={(event) => setEditRole(manager.id, event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                            {roles.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={manager.role} />
                        )}
                      </td>
                      <td className="py-3 text-xs text-slate-600">
                        {editable ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            {Object.values(RolePermissions.ADMIN).map((permission) => (
                              <label key={permission} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={current.permissions.includes(permission)}
                                  onChange={() => toggleEditPermission(manager.id, permission)}
                                />
                                {permission}
                              </label>
                            ))}
                          </div>
                        ) : (
                          manager.permissions.join(', ') || '-'
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{new Date(manager.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {editable ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveManager(manager.id)}
                                disabled={savingId === manager.id}
                                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {savingId === manager.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingId(manager.id)}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          )}
                          <button type="button" onClick={() => void removeManager(manager.id)} className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {managers.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No admin team users found.</p> : null}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
