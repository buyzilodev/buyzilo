'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PayoutActionsProps = {
  stripeConnected: boolean
  pendingPayout: number
  hasOpenRequest?: boolean
}

export function PayoutActions({ stripeConnected, pendingPayout, hasOpenRequest = false }: PayoutActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function connectStripe() {
    setLoading(true)
    try {
      const response = await fetch('/api/vendor/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      alert(data.error ?? 'Stripe onboarding failed')
    } finally {
      setLoading(false)
    }
  }

  async function requestPayout() {
    setLoading(true)
    try {
      const response = await fetch('/api/vendor/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pendingPayout }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        alert(data.error ?? 'Payout request failed')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!stripeConnected) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={connectStripe}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Connecting...' : 'Connect Stripe'}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={loading || pendingPayout <= 0 || hasOpenRequest}
      onClick={requestPayout}
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {loading ? 'Processing...' : hasOpenRequest ? 'Request Pending' : 'Request Payout'}
    </button>
  )
}
