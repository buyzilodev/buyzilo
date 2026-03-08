'use client'

import { useEffect, useState } from 'react'
import { PRODUCT_COMPARE_KEY } from '@/lib/constants/storefront'

type CompareButtonProps = {
  productId: string
  productName: string
  className?: string
}

export default function CompareButton({ productId, productName, className }: CompareButtonProps) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(PRODUCT_COMPARE_KEY)
        const parsed: string[] = raw ? JSON.parse(raw) : []
        setActive(parsed.includes(productId))
      } catch {
        setActive(false)
      }
    })
  }, [productId])

  function toggleCompare() {
    try {
      const raw = localStorage.getItem(PRODUCT_COMPARE_KEY)
      const parsed: string[] = raw ? JSON.parse(raw) : []
      const next = parsed.includes(productId)
        ? parsed.filter((id) => id !== productId)
        : [...parsed.filter((id) => id !== productId), productId].slice(-4)
      localStorage.setItem(PRODUCT_COMPARE_KEY, JSON.stringify(next))
      setActive(next.includes(productId))
      window.dispatchEvent(new Event('buyzilo:compare-updated'))
    } catch {
      alert(`Failed to update compare list for ${productName}`)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleCompare}
      className={className ?? 'rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50'}
    >
      {active ? 'Comparing' : 'Compare'}
    </button>
  )
}
