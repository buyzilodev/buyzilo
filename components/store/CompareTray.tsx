'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PRODUCT_COMPARE_KEY } from '@/lib/constants/storefront'

type CompareProduct = {
  id: string
  name: string
  slug: string
}

export default function CompareTray() {
  const [products, setProducts] = useState<CompareProduct[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const raw = localStorage.getItem(PRODUCT_COMPARE_KEY)
        const ids: string[] = raw ? JSON.parse(raw) : []
        if (ids.length === 0) {
          setProducts([])
          return
        }
        const response = await fetch(`/api/products?ids=${ids.join(',')}`)
        const data = await response.json()
        if (cancelled) return
        setProducts(data.products ?? [])
      } catch {
        if (cancelled) return
        setProducts([])
      }
    }

    void load()
    window.addEventListener('buyzilo:compare-updated', load)
    return () => {
      cancelled = true
      window.removeEventListener('buyzilo:compare-updated', load)
    }
  }, [])

  if (products.length === 0) {
    return null
  }

  return (
    <div className="sticky bottom-4 z-40 mx-auto mt-6 max-w-7xl px-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <div>
          <p className="text-sm font-semibold text-slate-900">Compare products</p>
          <p className="text-xs text-slate-500">{products.map((product) => product.name).join(', ')}</p>
        </div>
        <Link href="/compare" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Open compare
        </Link>
      </div>
    </div>
  )
}
