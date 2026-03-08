'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

const GUEST_WISHLIST_KEY = 'buyzilo_wishlist'

type WishlistButtonProps = {
  productId: string
  productName: string
  variantId?: string
  variantLabel?: string
  className?: string
}

type GuestWishlistItem = {
  productId: string
  variantId?: string
}

export default function WishlistButton({
  productId,
  productName,
  variantId,
  variantLabel,
  className,
}: WishlistButtonProps) {
  const { status } = useSession()
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const label = useMemo(
    () => (variantLabel ? `${productName} (${variantLabel})` : productName),
    [productName, variantLabel]
  )

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/wishlist')
        .then((response) => response.ok ? response.json() : { items: [] })
        .then((data) => {
          const match = (data.items ?? []).some((item: { productId: string; variantId?: string | null }) => item.productId === productId && (item.variantId ?? undefined) === variantId)
          setActive(match)
        })
        .catch(() => setActive(false))
      return
    }

    try {
      const raw = localStorage.getItem(GUEST_WISHLIST_KEY)
      const parsed: GuestWishlistItem[] = raw ? JSON.parse(raw) : []
      setActive(parsed.some((item) => item.productId === productId && item.variantId === variantId))
    } catch {
      setActive(false)
    }
  }, [productId, status, variantId])

  async function toggleWishlist() {
    setLoading(true)
    try {
      if (status === 'authenticated') {
        if (active) {
          const query = new URLSearchParams({ productId })
          if (variantId) query.set('variantId', variantId)
          const response = await fetch(`/api/wishlist?${query.toString()}`, { method: 'DELETE' })
          if (!response.ok) return
          setActive(false)
        } else {
          const response = await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId }),
          })
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string }
            alert(data.error ?? 'Failed to update wishlist')
            return
          }
          setActive(true)
        }
        return
      }

      const raw = localStorage.getItem(GUEST_WISHLIST_KEY)
      const parsed: GuestWishlistItem[] = raw ? JSON.parse(raw) : []
      const exists = parsed.some((item) => item.productId === productId && item.variantId === variantId)
      const next = exists
        ? parsed.filter((item) => !(item.productId === productId && item.variantId === variantId))
        : [...parsed, { productId, variantId }]
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(next))
      setActive(!exists)
    } catch {
      alert(`Failed to update wishlist for ${label}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggleWishlist()}
      disabled={loading}
      className={className ?? 'rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60'}
      aria-pressed={active}
    >
      {loading ? '...' : active ? 'Saved' : 'Wishlist'}
    </button>
  )
}
