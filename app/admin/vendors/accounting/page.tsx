'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { adminVendorSubsections } from '@/components/admin/subsections'

type PayoutRecord = {
  id: string
  amount: number
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID' | string
  note?: string | null
  stripeTransferId?: string | null
  createdAt: string
  processedAt?: string | null
  store: {
    id: string
    name: string
    slug: string
    pendingPayout: number
    totalEarned: number
    stripeAccountId?: string | null
  }
}

type StoreRecord = {
  id: string
  name: string
  slug: string
  pendingPayout: number
  totalEarned: number
  commissionRate: number
  categoryFeeExposure?: number
  stripeAccountId?: string | null
  vendor: {
    name?: string | null
    email?: string | null
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function AdminVendorsAccountingPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [stores, setStores] = useState<StoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payouts')
      const data = await response.json()
      setPayouts(Array.isArray(data?.payouts) ? data.payouts : [])
      setStores(Array.isArray(data?.stores) ? data.stores : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load().catch(() => setLoading(false))
  }, [])

  const totals = useMemo(() => ({
    requested: payouts.filter((payout) => payout.status === 'REQUESTED').reduce((sum, payout) => sum + payout.amount, 0),
    approved: payouts.filter((payout) => payout.status === 'APPROVED').reduce((sum, payout) => sum + payout.amount, 0),
    paid: payouts.filter((payout) => payout.status === 'PAID').reduce((sum, payout) => sum + payout.amount, 0),
  }), [payouts])

  async function updatePayout(id: string, status: 'APPROVED' | 'REJECTED' | 'PAID') {
    const note = window.prompt(`Add a note for ${status.toLowerCase()} (optional):`, '') ?? ''
    setSavingId(id)
    try {
      const response = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, note }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to update payout')
        return
      }
      await load()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminLayout title="Vendor Accounting" subtitle="Review payout requests and monitor settlement balances">
      <SubsectionNav items={adminVendorSubsections} />

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-amber-700">Requested</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totals.requested)}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totals.approved)}</p>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-blue-700">Paid</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totals.paid)}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Payout Review Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Approve requests before transfer, then mark them paid when settlement is sent.</p>
            </div>
            <button onClick={() => void load()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading payout requests...</p>
          ) : payouts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payout requests recorded.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {payouts.map((payout) => {
                const canApprove = payout.status === 'REQUESTED'
                const canReject = payout.status === 'REQUESTED' || payout.status === 'APPROVED'
                const canPay = payout.status === 'APPROVED'
                const saving = savingId === payout.id

                return (
                  <article key={payout.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{payout.store.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(payout.createdAt).toLocaleString()} | {payout.store.slug}
                        </p>
                      </div>
                      <StatusBadge status={payout.status} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Request Amount</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(payout.amount)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Store Pending</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(payout.store.pendingPayout)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Stripe</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{payout.store.stripeAccountId ? 'Connected' : 'Missing connection'}</p>
                      </div>
                    </div>

                    {(payout.note || payout.processedAt || payout.stripeTransferId) && (
                      <div className="mt-4 space-y-1 text-sm text-slate-600">
                        {payout.note && <p>Note: {payout.note}</p>}
                        {payout.processedAt && <p>Processed: {new Date(payout.processedAt).toLocaleString()}</p>}
                        {payout.stripeTransferId && <p>Transfer: {payout.stripeTransferId}</p>}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!canApprove || saving}
                        onClick={() => void updatePayout(payout.id, 'APPROVED')}
                        className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving && canApprove ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={!canReject || saving}
                        onClick={() => void updatePayout(payout.id, 'REJECTED')}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving && canReject ? 'Saving...' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        disabled={!canPay || saving}
                        onClick={() => void updatePayout(payout.id, 'PAID')}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving && canPay ? 'Processing...' : 'Mark Paid'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Store Settlement Balances</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading stores...</p>
          ) : stores.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No stores found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-3">Store</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">Commission</th>
                    <th className="pb-3">Category Fees</th>
                    <th className="pb-3">Earned</th>
                    <th className="pb-3">Pending</th>
                    <th className="pb-3">Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="border-t border-slate-100 align-top">
                      <td className="py-3">
                        <p className="font-semibold text-slate-900">{store.name}</p>
                        <p className="text-xs text-slate-500">{store.slug}</p>
                      </td>
                      <td className="py-3 text-slate-600">
                        <p>{store.vendor.name || 'Vendor account'}</p>
                        <p className="text-xs text-slate-500">{store.vendor.email || 'No email'}</p>
                      </td>
                      <td className="py-3 text-slate-700">{store.commissionRate}%</td>
                      <td className="py-3 text-slate-700">{formatCurrency(store.categoryFeeExposure ?? 0)}</td>
                      <td className="py-3 font-semibold text-slate-900">{formatCurrency(store.totalEarned)}</td>
                      <td className="py-3 font-semibold text-slate-900">{formatCurrency(store.pendingPayout)}</td>
                      <td className="py-3 text-slate-600">{store.stripeAccountId ? 'Connected' : 'Missing'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}
