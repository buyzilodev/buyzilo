'use client'
import { useEffect, useState } from 'react'
import { VendorSidebar } from '@/components/vendor/VendorSidebar'

type Store = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  moderationNote?: string | null
  locator?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string
    email?: string
    latitude?: string
    longitude?: string
    hours?: string
  }
}

type VendorTermsStatus = {
  config: {
    enabled: boolean
    version: string
    title: string
    summary: string
    content: string
  }
  acceptance: {
    version: string
    acceptedAt: string
  } | null
  isCurrentAccepted: boolean
}

const defaultLocator = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  hours: '',
}

export default function VendorSettingsPage() {
  const [store, setStore] = useState<Store | null>(null)
  const [vendorTerms, setVendorTerms] = useState<VendorTermsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '' })
  const [locator, setLocator] = useState(defaultLocator)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/store').then((r) => r.json()),
      fetch('/api/vendor/terms').then((r) => r.json()).catch(() => null),
    ])
      .then(([storeData, termsData]) => {
        setStore(storeData)
        setVendorTerms(termsData)
        if (storeData) {
          setForm({ name: storeData.name, description: storeData.description ?? '' })
          setLocator({ ...defaultLocator, ...(storeData.locator ?? {}) })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    const res = await fetch('/api/vendor/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description || undefined,
        acceptVendorTerms: acceptTerms,
        vendorTermsVersion: vendorTerms?.config.version,
      }),
    })
    setCreating(false)
    if (res.ok) {
      const data = await res.json()
      setStore(data)
      setForm({ name: data.name, description: data.description ?? '' })
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to create store')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return
    setSaving(true)
    const response = await fetch('/api/vendor/store', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description, locator }),
    })
    const data = await response.json()
    setSaving(false)
    if (response.ok) {
      setStore(data)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <VendorSidebar />
        <main className="ml-64 flex-1 p-8"><p className="text-gray-500">Loading...</p></main>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <VendorSidebar />
        <main className="ml-64 flex-1 p-8">
          <h1 className="text-2xl font-bold mb-6">Create Your Store</h1>
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="My Store" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
            </div>
            {vendorTerms?.config.enabled ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{vendorTerms.config.title}</p>
                <p className="mt-1 text-xs text-slate-500">Version {vendorTerms.config.version}</p>
                <p className="mt-2">{vendorTerms.config.summary}</p>
                <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-6 whitespace-pre-wrap">
                  {vendorTerms.config.content}
                </div>
                <label className="mt-3 flex items-start gap-2">
                  <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5" />
                  <span>I agree to the current vendor terms and marketplace seller policy.</span>
                </label>
              </div>
            ) : null}
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Store'}
            </button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <VendorSidebar />
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Store Settings</h1>
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm p-6 max-w-3xl space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Store Locator</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <input value={locator.addressLine1} onChange={(e) => setLocator({ ...locator, addressLine1: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Address line 1" />
              <input value={locator.addressLine2} onChange={(e) => setLocator({ ...locator, addressLine2: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Address line 2" />
              <input value={locator.city} onChange={(e) => setLocator({ ...locator, city: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="City" />
              <input value={locator.state} onChange={(e) => setLocator({ ...locator, state: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="State / Region" />
              <input value={locator.postalCode} onChange={(e) => setLocator({ ...locator, postalCode: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Postal code" />
              <input value={locator.country} onChange={(e) => setLocator({ ...locator, country: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Country" />
              <input value={locator.phone} onChange={(e) => setLocator({ ...locator, phone: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Store phone" />
              <input value={locator.email} onChange={(e) => setLocator({ ...locator, email: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Store email" />
              <input value={locator.latitude} onChange={(e) => setLocator({ ...locator, latitude: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Latitude" />
              <input value={locator.longitude} onChange={(e) => setLocator({ ...locator, longitude: e.target.value })} className="rounded-lg border px-3 py-2" placeholder="Longitude" />
              <textarea value={locator.hours} onChange={(e) => setLocator({ ...locator, hours: e.target.value })} className="rounded-lg border px-3 py-2 md:col-span-2" rows={3} placeholder="Opening hours" />
            </div>
          </div>

          <p className="text-xs text-gray-500">Slug: {store.slug}</p>
          <p className="text-xs text-gray-500">Status: {store.status}</p>
          {store.moderationNote && <p className="text-xs text-amber-700">Review note: {store.moderationNote}</p>}

          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </main>
    </div>
  )
}
