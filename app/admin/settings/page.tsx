'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'

type Settings = {
  siteName: string
  siteEmail: string
  sitePhone: string
  currency: string
  timezone: string
  commissionRate: string
  minPayout: string
  payoutSchedule: string
  allowGuestCheckout: string
  requireEmailVerification: string
  maintenanceMode: string
  allowVendorRegistration: string
  autoApproveVendors: string
  autoApproveProducts: string
  maxProductImages: string
  maxProductsPerVendor: string
  tagline: string
  logoText: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  secondaryColor: string
  sellerCtaLabel: string
  footerText: string
}

const defaultSettings: Settings = {
  siteName: 'Buyzilo',
  siteEmail: 'admin@buyzilo.com',
  sitePhone: '+1 (800) BUYZILO',
  currency: 'USD',
  timezone: 'UTC',
  commissionRate: '10',
  minPayout: '50',
  payoutSchedule: 'weekly',
  allowGuestCheckout: 'true',
  requireEmailVerification: 'false',
  maintenanceMode: 'false',
  allowVendorRegistration: 'true',
  autoApproveVendors: 'false',
  autoApproveProducts: 'false',
  maxProductImages: '8',
  maxProductsPerVendor: '100',
  tagline: 'Shop Everything You Love',
  logoText: 'B',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  sellerCtaLabel: 'Sell on Buyzilo',
  footerText: 'All rights reserved.',
}

export default function SiteSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings((prev) => ({ ...prev, ...(data as Partial<Settings>) }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const toggle = (key: keyof Settings) => {
    update(key, settings[key] === 'true' ? 'false' : 'true')
  }

  const Toggle = ({ settingKey }: { settingKey: keyof Settings }) => (
    <button
      type="button"
      onClick={() => toggle(settingKey)}
      className={`h-6 w-12 rounded-full transition-colors ${settings[settingKey] === 'true' ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <div className={`mx-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[settingKey] === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )

  if (loading) {
    return <AdminLayout title="Site Settings"><div className="py-12 text-center text-gray-400">Loading settings...</div></AdminLayout>
  }

  return (
    <AdminLayout title="Site Settings" subtitle="Configure marketplace and white-label options">
      <SubsectionNav items={adminSettingsSubsections} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">General</h2>
          <div className="space-y-4">
            {[
              { key: 'siteName', label: 'Site Name' },
              { key: 'siteEmail', label: 'Admin Email' },
              { key: 'sitePhone', label: 'Support Phone' },
              { key: 'tagline', label: 'Tagline' },
            ].map((item) => (
              <div key={item.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{item.label}</label>
                <input
                  value={settings[item.key as keyof Settings]}
                  onChange={(e) => update(item.key as keyof Settings, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
              <select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm">
                <option>USD</option><option>EUR</option><option>GBP</option><option>PKR</option><option>AED</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">White-label Branding</h2>
          <div className="space-y-4">
            {[
              { key: 'logoText', label: 'Logo Text' },
              { key: 'logoUrl', label: 'Logo URL' },
              { key: 'faviconUrl', label: 'Favicon URL' },
              { key: 'primaryColor', label: 'Primary Color' },
              { key: 'secondaryColor', label: 'Secondary Color' },
              { key: 'sellerCtaLabel', label: 'Seller CTA Label' },
              { key: 'footerText', label: 'Footer Text' },
            ].map((item) => (
              <div key={item.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{item.label}</label>
                <input
                  value={settings[item.key as keyof Settings]}
                  onChange={(e) => update(item.key as keyof Settings, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Commission and Payouts</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Platform Commission Rate (%)</label>
              <input type="number" value={settings.commissionRate} onChange={(e) => update('commissionRate', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Minimum Payout Amount</label>
              <input type="number" value={settings.minPayout} onChange={(e) => update('minPayout', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payout Schedule</label>
              <select value={settings.payoutSchedule} onChange={(e) => update('payoutSchedule', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Platform Controls</h2>
          <div className="space-y-3">
            {[
              { key: 'allowVendorRegistration', label: 'Allow Vendor Registration' },
              { key: 'autoApproveVendors', label: 'Auto-Approve Vendors' },
              { key: 'autoApproveProducts', label: 'Auto-Approve Products' },
              { key: 'allowGuestCheckout', label: 'Allow Guest Checkout' },
              { key: 'requireEmailVerification', label: 'Require Email Verification' },
              { key: 'maintenanceMode', label: 'Maintenance Mode' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <Toggle settingKey={item.key as keyof Settings} />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max Product Images</label>
              <input type="number" value={settings.maxProductImages} onChange={(e) => update('maxProductImages', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Max Products Per Vendor</label>
              <input type="number" value={settings.maxProductsPerVendor} onChange={(e) => update('maxProductsPerVendor', e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} className={`rounded-xl px-8 py-3 font-semibold text-white transition ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {saved ? 'Settings saved' : 'Save settings'}
        </button>
      </div>
    </AdminLayout>
  )
}
