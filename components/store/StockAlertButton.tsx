'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type StockAlertButtonProps = {
  productId: string
  productName: string
  variantId?: string
  variantLabel?: string
  disabled?: boolean
  className?: string
}

export default function StockAlertButton({
  productId,
  productName,
  variantId,
  variantLabel,
  disabled,
  className,
}: StockAlertButtonProps) {
  const { status } = useSession()
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') {
      setActive(false)
      return
    }

    fetch('/api/stock-alerts')
      .then((response) => response.ok ? response.json() : { subscriptions: [] })
      .then((data) => {
        const match = (data.subscriptions ?? []).some(
          (item: { productId: string; variantId?: string | null }) =>
            item.productId === productId && (item.variantId ?? undefined) === variantId
        )
        setActive(match)
      })
      .catch(() => setActive(false))
  }, [productId, status, variantId])

  async function toggle() {
    if (status !== 'authenticated') {
      alert('Please sign in to subscribe to back-in-stock alerts.')
      return
    }

    setLoading(true)
    try {
      if (active) {
        const query = new URLSearchParams({ productId })
        if (variantId) query.set('variantId', variantId)
        const response = await fetch(`/api/stock-alerts?${query.toString()}`, { method: 'DELETE' })
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { error?: string }
          alert(data.error ?? 'Failed to remove stock alert')
          return
        }
        setActive(false)
        return
      }

      const response = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to subscribe to stock alerts')
        return
      }
      setActive(true)
    } finally {
      setLoading(false)
    }
  }

  const label = variantLabel ? `${productName} (${variantLabel})` : productName

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={disabled || loading}
      className={className ?? 'rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-60'}
    >
      {loading ? '...' : active ? 'Subscribed' : `Notify me for ${label.length > 28 ? 'restock' : 'restock'}`}
    </button>
  )
}
