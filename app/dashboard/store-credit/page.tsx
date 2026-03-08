'use client'

import { useEffect, useState } from 'react'

type GiftCertificate = {
  code: string
  amount: number
  remainingAmount: number
  createdAt: string
  expiresAt: string | null
  redeemedByUserId?: string | null
  redeemedAt?: string | null
  recipientName?: string | null
  recipientEmail?: string | null
  senderName?: string | null
  personalMessage?: string | null
  deliveryStatus?: 'PENDING' | 'SENT'
  source?: 'ADMIN' | 'BUYER_BALANCE'
}

type StoreCreditPayload = {
  balance: number
  expiringSoonBalance: number
  expiryDays: number | null
  expiringSoonDays: number
  entries: Array<{
    id: string
    type: string
    amount: number
    note?: string
    createdAt: string
    giftCardCode?: string
    expiresAt?: string | null
    remainingAmount?: number
  }>
}

type CertificatesPayload = {
  purchased: GiftCertificate[]
  redeemed: GiftCertificate[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function StoreCreditPage() {
  const [storeCredit, setStoreCredit] = useState<StoreCreditPayload | null>(null)
  const [certificates, setCertificates] = useState<CertificatesPayload>({ purchased: [], redeemed: [] })
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sendForm, setSendForm] = useState({
    amount: '',
    senderName: '',
    recipientName: '',
    recipientEmail: '',
    personalMessage: '',
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/store-credit')
      .then((response) => (response.ok ? response.json() : { storeCredit: null, certificates: { purchased: [], redeemed: [] } }))
      .then((data) => {
        if (cancelled) return
        setStoreCredit(data.storeCredit ?? null)
        setCertificates(data.certificates ?? { purchased: [], redeemed: [] })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setStoreCredit(null)
        setCertificates({ purchased: [], redeemed: [] })
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function redeem() {
    setRedeeming(true)
    setMessage(null)
    const response = await fetch('/api/store-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', code }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error ?? 'Unable to redeem gift card')
      setRedeeming(false)
      return
    }
    setCode('')
    setStoreCredit(data.storeCredit ?? null)
    setCertificates(data.certificates ?? { purchased: [], redeemed: [] })
    setMessage('Gift certificate redeemed.')
    setRedeeming(false)
  }

  async function sendCertificate() {
    setSending(true)
    setMessage(null)
    const response = await fetch('/api/store-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-certificate',
        amount: Number(sendForm.amount),
        senderName: sendForm.senderName,
        recipientName: sendForm.recipientName,
        recipientEmail: sendForm.recipientEmail,
        personalMessage: sendForm.personalMessage,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error ?? 'Unable to send gift certificate')
      setSending(false)
      return
    }
    setSendForm({
      amount: '',
      senderName: '',
      recipientName: '',
      recipientEmail: '',
      personalMessage: '',
    })
    setStoreCredit(data.storeCredit ?? null)
    setCertificates(data.certificates ?? { purchased: [], redeemed: [] })
    setMessage(`Gift certificate ${data.certificate?.code ?? ''} created and delivered.`.trim())
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_50%,#0f766e_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Wallet workspace</p>
          <h2 className="mt-3 text-4xl font-black">Balance, redemptions, and giftable credit</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Use store credit at checkout, redeem incoming codes, and convert balance into professionally tracked gift certificates.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Balance</p>
              <p className="mt-1 text-2xl font-black text-white">{formatCurrency(storeCredit?.balance ?? 0)}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Expiring soon</p>
              <p className="mt-1 text-2xl font-black text-white">{formatCurrency(storeCredit?.expiringSoonBalance ?? 0)}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Sent</p>
              <p className="mt-1 text-2xl font-black text-white">{certificates.purchased.length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Redeemed</p>
              <p className="mt-1 text-2xl font-black text-white">{certificates.redeemed.length}</p>
            </article>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-black text-slate-950">Expiry policy</p>
            <p className="mt-2 text-sm text-slate-500">
              {storeCredit?.expiryDays ? `New credit typically expires after ${storeCredit.expiryDays} days.` : 'New credit does not expire by default.'}
            </p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-black text-slate-950">Ledger visibility</p>
            <p className="mt-2 text-sm text-slate-500">Every redemption, issue, application, and expiry is tracked in one wallet history.</p>
          </article>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Redeem a gift certificate</h3>
          <p className="mt-1 text-sm text-slate-500">Convert a certificate code into available store credit.</p>
          <div className="mt-5 flex gap-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="GIFT-XXXX-XXXX"
              className="w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void redeem()}
              disabled={redeeming || !code.trim()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Send a gift certificate</h3>
          <p className="mt-1 text-sm text-slate-500">Fund a certificate from your own balance and deliver it by email.</p>
          <div className="mt-5 grid gap-3">
            <input value={sendForm.amount} onChange={(event) => setSendForm({ ...sendForm, amount: event.target.value })} placeholder="Amount" className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm" />
            <input value={sendForm.senderName} onChange={(event) => setSendForm({ ...sendForm, senderName: event.target.value })} placeholder="Your name" className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm" />
            <input value={sendForm.recipientName} onChange={(event) => setSendForm({ ...sendForm, recipientName: event.target.value })} placeholder="Recipient name" className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm" />
            <input value={sendForm.recipientEmail} onChange={(event) => setSendForm({ ...sendForm, recipientEmail: event.target.value })} placeholder="Recipient email" className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm" />
            <textarea value={sendForm.personalMessage} onChange={(event) => setSendForm({ ...sendForm, personalMessage: event.target.value })} placeholder="Optional message" className="min-h-[110px] rounded-[1rem] border border-slate-200 px-4 py-3 text-sm" />
            <button
              type="button"
              onClick={() => void sendCertificate()}
              disabled={sending || !sendForm.amount.trim() || !sendForm.senderName.trim() || !sendForm.recipientName.trim() || !sendForm.recipientEmail.trim()}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Create and send'}
            </button>
          </div>
        </section>
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Wallet activity</h3>
            <p className="text-sm text-slate-500">Redemptions, admin credit, refund credit, checkout use, and expiry events.</p>
          </div>
          <p className="text-sm text-slate-400">{storeCredit?.entries.length ?? 0} entries</p>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading wallet activity...</p>
        ) : (storeCredit?.entries.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No wallet activity yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {storeCredit?.entries.map((entry) => (
              <article key={entry.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{entry.type.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                    {entry.note ? <p className="mt-1 text-xs text-slate-500">{entry.note}</p> : null}
                    {entry.giftCardCode ? <p className="mt-1 font-mono text-xs text-slate-500">{entry.giftCardCode}</p> : null}
                    {entry.expiresAt && (entry.remainingAmount ?? 0) > 0 ? (
                      <p className="mt-1 text-xs text-amber-600">
                        Expires {new Date(entry.expiresAt).toLocaleDateString()} | Remaining {formatCurrency(Number(entry.remainingAmount ?? 0))}
                      </p>
                    ) : null}
                  </div>
                  <span className={`text-sm font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {entry.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(entry.amount))}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Sent certificates</h3>
          <p className="mt-1 text-sm text-slate-500">Certificates funded from your balance and delivered to recipients.</p>
          {certificates.purchased.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sent certificates yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {certificates.purchased.map((certificate) => (
                <article key={certificate.code} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{certificate.recipientName || 'Recipient'} ({certificate.recipientEmail || 'No email'})</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{certificate.code}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {certificate.deliveryStatus === 'SENT' ? 'Delivered by email' : 'Pending delivery'} | {new Date(certificate.createdAt).toLocaleString()}
                      </p>
                      {certificate.personalMessage ? <p className="mt-1 text-xs text-slate-500">{certificate.personalMessage}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-950">{formatCurrency(certificate.amount)}</p>
                      <p className="text-xs text-slate-500">{certificate.redeemedByUserId ? 'Redeemed' : 'Available'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Redeemed certificates</h3>
          <p className="mt-1 text-sm text-slate-500">Gift certificates already converted into your balance.</p>
          {certificates.redeemed.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No redeemed certificates yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {certificates.redeemed.map((certificate) => (
                <article key={certificate.code} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{certificate.code}</p>
                  <p className="mt-1 text-xs text-slate-500">Redeemed {certificate.redeemedAt ? new Date(certificate.redeemedAt).toLocaleString() : 'recently'}</p>
                  <p className="mt-2 text-sm font-bold text-emerald-600">{formatCurrency(certificate.amount)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
