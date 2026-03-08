'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

const roles = ['BUYER', 'VENDOR', 'ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')

  const load = useCallback(() => {
    const params = roleFilter ? `?role=${roleFilter}` : ''
    fetch(`/api/admin/users${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [roleFilter])

  useEffect(() => {
    load()
  }, [load])

  const vendors = useMemo(() => users.filter((u) => u.role === 'VENDOR').length, [users])
  const buyers = useMemo(() => users.filter((u) => u.role === 'BUYER').length, [users])

  return (
    <AdminLayout title="Users" subtitle="Role-based user directory and account overview">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Visible Users" value={String(users.length)} hint="Current filtered list" />
        <StatCard label="Vendors" value={String(vendors)} hint="Seller accounts" />
        <StatCard label="Buyers" value={String(buyers)} hint="Customer accounts" />
      </div>

      <div className="mt-4">
        <Section
          title="User Accounts"
          subtitle={`Total users in dataset: ${total}`}
          action={
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          }
        >
          {loading ? (
            <p className="py-8 text-sm text-slate-500">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="py-3 font-medium text-slate-900">{user.name ?? 'Unnamed user'}</td>
                      <td className="py-3 text-slate-600">{user.email}</td>
                      <td className="py-3"><StatusBadge status={user.role} /></td>
                      <td className="py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No users found.</p>}
            </div>
          )}
        </Section>
      </div>
    </AdminLayout>
  )
}
