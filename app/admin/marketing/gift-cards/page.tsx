'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'

type GiftCard = {
  code: string
  amount: number
  remainingAmount: number
  note?: string
  createdAt: string
  expiresAt: string | null
  redeemedByUserId?: string | null
  isActive: boolean
  recipientName?: string | null
  recipientEmail?: string | null
  senderName?: string | null
  purchaserUserId?: string | null
  source?: 'ADMIN' | 'BUYER_BALANCE'
  deliveryStatus?: 'PENDING' | 'SENT'
}

type CreditBalance = {
  userId: string
  balance: number
  entries: number
  expiringSoon: number
}

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [balances, setBalances] = useState<CreditBalance[]>([])
  const [config, setConfig] = useState<{ expiryDays: number | null; expiringSoonDays: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [message, setMessage] = useState('')
  const [giftCardForm, setGiftCardForm] = useState({ amount: '', note: '', expiresAt: '' })
  const [creditForm, setCreditForm] = useState({ userId: '', amount: '', note: '', expiresAt: '' })
  const [configForm, setConfigForm] = useState({ expiryDays: '365', expiringSoonDays: '30' })

  async function load() {
    const response = await fetch('/api/admin/gift-cards')
    const data = await response.json()
    setGiftCards(data.giftCards ?? [])
    setBalances(data.balances ?? [])
    setConfig(data.config ?? null)
    setConfigForm({
      expiryDays: data.config?.expiryDays == null ? '' : String(data.config.expiryDays),
      expiringSoonDays: data.config?.expiringSoonDays == null ? '30' : String(data.config.expiringSoonDays),
    })
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/gift-cards')
      .then((response) => response.ok ? response.json() : { giftCards: [], balances: [] })
      .then((data) => {
        if (cancelled) return
        setGiftCards(data.giftCards ?? [])
        setBalances(data.balances ?? [])
        setConfig(data.config ?? null)
        setConfigForm({
          expiryDays: data.config?.expiryDays == null ? '' : String(data.config.expiryDays),
          expiringSoonDays: data.config?.expiringSoonDays == null ? '30' : String(data.config.expiringSoonDays),
        })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setGiftCards([])
        setBalances([])
        setConfig(null)
        setConfigForm({ expiryDays: '365', expiringSoonDays: '30' })
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function createGiftCard() {
    const response = await fetch('/api/admin/gift-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'gift-card',
        amount: Number(giftCardForm.amount),
        note: giftCardForm.note,
        expiresAt: giftCardForm.expiresAt || undefined,
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? `Gift card ${data.giftCard.code} created.` : (data.error ?? 'Unable to create gift card'))
    if (response.ok) {
      setGiftCardForm({ amount: '', note: '', expiresAt: '' })
      await load()
    }
  }

  async function issueCredit() {
    const response = await fetch('/api/admin/gift-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'credit',
        userId: creditForm.userId,
        amount: Number(creditForm.amount),
        note: creditForm.note,
        expiresAt: creditForm.expiresAt || undefined,
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Store credit issued.' : (data.error ?? 'Unable to issue store credit'))
    if (response.ok) {
      setCreditForm({ userId: '', amount: '', note: '', expiresAt: '' })
      await load()
    }
  }

  async function saveConfig() {
    setSavingConfig(true)
    setMessage('')
    const payload = {
      storeCreditProgramConfig: JSON.stringify({
        expiryDays: configForm.expiryDays.trim() === '' ? null : Number(configForm.expiryDays),
        expiringSoonDays: Number(configForm.expiringSoonDays || 30),
      }),
    }
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSavingConfig(false)
    setMessage(response.ok ? 'Store-credit policy updated.' : 'Unable to update store-credit policy.')
    if (response.ok) {
      await load()
    }
  }

  return (
    <AdminLayout title="Gift Cards & Store Credit" subtitle="Issue redeemable value and manage buyer credit balances">
      <SubsectionNav items={adminMarketingSubsections} />

      {message && <p className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</p>}

      {config && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-700">
          Default store-credit expiry: <span className="font-semibold">{config.expiryDays ?? 0} days</span>.
          Expiring-soon window: <span className="font-semibold"> {config.expiringSoonDays} days</span>.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Store Credit Policy</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={configForm.expiryDays}
              onChange={(e) => setConfigForm({ ...configForm, expiryDays: e.target.value })}
              placeholder="Expiry days (blank = no expiry)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={configForm.expiringSoonDays}
              onChange={(e) => setConfigForm({ ...configForm, expiringSoonDays: e.target.value })}
              placeholder="Expiring soon window"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              onClick={() => void saveConfig()}
              disabled={savingConfig}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingConfig ? 'Saving...' : 'Save policy'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Create Gift Card</h3>
          <div className="mt-4 grid gap-3">
            <input value={giftCardForm.amount} onChange={(e) => setGiftCardForm({ ...giftCardForm, amount: e.target.value })} placeholder="Amount" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={giftCardForm.note} onChange={(e) => setGiftCardForm({ ...giftCardForm, note: e.target.value })} placeholder="Note" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={giftCardForm.expiresAt} onChange={(e) => setGiftCardForm({ ...giftCardForm, expiresAt: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button onClick={() => void createGiftCard()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Create gift card
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Issue Store Credit</h3>
          <div className="mt-4 grid gap-3">
            <input value={creditForm.userId} onChange={(e) => setCreditForm({ ...creditForm, userId: e.target.value })} placeholder="Buyer user ID" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })} placeholder="Amount" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={creditForm.note} onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })} placeholder="Note" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={creditForm.expiresAt} onChange={(e) => setCreditForm({ ...creditForm, expiresAt: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button onClick={() => void issueCredit()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Issue credit
            </button>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Gift Cards</h3>
          {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Source</th>
                    <th className="pb-2">Expires</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map((card) => (
                    <tr key={card.code} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs text-slate-700">{card.code}</td>
                      <td className="py-2 text-slate-700">${card.amount.toFixed(2)}</td>
                      <td className="py-2 text-xs text-slate-600">
                        {card.recipientEmail ? `${card.recipientName || 'Recipient'} (${card.recipientEmail})` : '-'}
                      </td>
                      <td className="py-2 text-slate-600">{card.source === 'BUYER_BALANCE' ? 'Buyer funded' : 'Admin issued'}</td>
                      <td className="py-2 text-slate-600">{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : '-'}</td>
                      <td className="py-2 text-slate-600">
                        {card.redeemedByUserId ? 'Redeemed' : card.isActive ? card.deliveryStatus === 'PENDING' ? 'Pending delivery' : 'Available' : 'Inactive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Store Credit Balances</h3>
          {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-2">User</th>
                    <th className="pb-2">Balance</th>
                    <th className="pb-2">Expiring Soon</th>
                    <th className="pb-2">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr key={balance.userId} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs text-slate-700">{balance.userId}</td>
                      <td className="py-2 text-slate-700">${balance.balance.toFixed(2)}</td>
                      <td className="py-2 text-slate-700">${balance.expiringSoon.toFixed(2)}</td>
                      <td className="py-2 text-slate-600">{balance.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Expiring Soon Queue</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        ) : balances.filter((balance) => balance.expiringSoon > 0).length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No buyer balances are currently expiring soon.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Current Balance</th>
                  <th className="pb-2">Expiring Soon</th>
                </tr>
              </thead>
              <tbody>
                {balances.filter((balance) => balance.expiringSoon > 0).map((balance) => (
                  <tr key={`expiring-${balance.userId}`} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-700">{balance.userId}</td>
                    <td className="py-2 text-slate-700">${balance.balance.toFixed(2)}</td>
                    <td className="py-2 font-semibold text-amber-700">${balance.expiringSoon.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
