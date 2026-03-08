'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'

type AccessRestrictionMode = 'AUTHENTICATED' | 'USER_GROUPS'
type AccessRestrictionTarget = 'CATALOG' | 'CATEGORY' | 'PRODUCT' | 'STORE' | 'PAGE'

type AccessRestrictionRule = {
  id: string
  name: string
  target: AccessRestrictionTarget
  value: string
  mode: AccessRestrictionMode
  allowedGroupIds: string[]
}

type UserGroup = {
  id: string
  name: string
  description?: string | null
}

const emptyRule: AccessRestrictionRule = {
  id: '',
  name: '',
  target: 'CATALOG',
  value: '*',
  mode: 'AUTHENTICATED',
  allowedGroupIds: [],
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AdminAccessRestrictionsPage() {
  const [rules, setRules] = useState<AccessRestrictionRule[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [form, setForm] = useState<AccessRestrictionRule>({ ...emptyRule, id: createId() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/access-restrictions')
      .then((response) => (response.ok ? response.json() : { config: { rules: [] }, groups: [] }))
      .then((data) => {
        if (cancelled) return
        setRules(data.config?.rules ?? [])
        setGroups(data.groups ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setRules([])
        setGroups([])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function resetForm() {
    setForm({ ...emptyRule, id: createId() })
  }

  function addRule() {
    if (!form.name.trim() || !form.value.trim()) {
      setMessage('Rule name and match value are required.')
      return
    }
    if (form.mode === 'USER_GROUPS' && form.allowedGroupIds.length === 0) {
      setMessage('Select at least one user group for group-based restrictions.')
      return
    }
    setRules((prev) => [...prev, { ...form, name: form.name.trim(), value: form.value.trim() }])
    resetForm()
    setMessage('Rule added. Save changes to apply it.')
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((rule) => rule.id !== id))
  }

  async function saveRules() {
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/admin/access-restrictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { rules } }),
    })
    setSaving(false)
    setMessage(response.ok ? 'Access restriction rules saved.' : 'Unable to save access restriction rules.')
  }

  return (
    <AdminLayout title="Access Restrictions" subtitle="Limit storefront content by login state or buyer user group">
      <SubsectionNav items={adminWebsiteSubsections} />

      {message && <p className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Active Rules</h3>
          <p className="mt-2 text-sm text-slate-500">
            Use these rules to require sign-in or specific buyer user groups for catalog, category, product, store, or custom-page access.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No access restrictions configured yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <article key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.target} | Match: {rule.value} | Audience: {rule.mode === 'AUTHENTICATED' ? 'Signed-in users' : 'Selected user groups'}
                      </p>
                      {rule.mode === 'USER_GROUPS' && rule.allowedGroupIds.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Groups: {rule.allowedGroupIds.map((groupId) => groups.find((group) => group.id === groupId)?.name ?? groupId).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => void saveRules()}
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save restrictions'}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Add Rule</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Rule name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={form.target}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  target: event.target.value as AccessRestrictionTarget,
                  value: event.target.value === 'CATALOG' ? '*' : '',
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="CATALOG">Catalog</option>
              <option value="CATEGORY">Category</option>
              <option value="PRODUCT">Product</option>
              <option value="STORE">Store</option>
              <option value="PAGE">Custom page</option>
            </select>
            <input
              value={form.value}
              onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
              placeholder={form.target === 'CATALOG' ? '*' : 'Slug to match'}
              disabled={form.target === 'CATALOG'}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            <select
              value={form.mode}
              onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as AccessRestrictionMode }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="AUTHENTICATED">Signed-in users</option>
              <option value="USER_GROUPS">Specific user groups</option>
            </select>

            {form.mode === 'USER_GROUPS' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Allowed Groups</p>
                <div className="space-y-2">
                  {groups.map((group) => {
                    const checked = form.allowedGroupIds.includes(group.id)
                    return (
                      <label key={group.id} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              allowedGroupIds: event.target.checked
                                ? [...prev.allowedGroupIds, group.id]
                                : prev.allowedGroupIds.filter((groupId) => groupId !== group.id),
                            }))
                          }
                        />
                        <span>
                          <span className="font-semibold">{group.name}</span>
                          {group.description ? <span className="block text-xs text-slate-500">{group.description}</span> : null}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={addRule}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add rule
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
