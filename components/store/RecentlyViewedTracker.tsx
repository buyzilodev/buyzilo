'use client'

import { useEffect } from 'react'
import { RECENTLY_VIEWED_PRODUCTS_KEY } from '@/lib/constants/storefront'

export default function RecentlyViewedTracker({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY)
      const parsed: string[] = raw ? JSON.parse(raw) : []
      const next = [productId, ...parsed.filter((id) => id !== productId)].slice(0, 8)
      localStorage.setItem(RECENTLY_VIEWED_PRODUCTS_KEY, JSON.stringify(next))
    } catch {
      // noop
    }
  }, [productId])

  return null
}
