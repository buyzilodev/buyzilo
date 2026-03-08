'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'
import { RECENTLY_VIEWED_PRODUCTS_KEY } from '@/lib/constants/storefront'

type RecommendedProduct = {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string[]
  store: { name: string; slug: string }
}

type RecommendationSection = {
  id: string
  title: string
  subtitle: string
  products: RecommendedProduct[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function RecommendationRails() {
  const [sections, setSections] = useState<RecommendationSection[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY)
        const recentIds: string[] = raw ? JSON.parse(raw) : []
        const params = new URLSearchParams()
        if (recentIds.length > 0) {
          params.set('recentIds', recentIds.slice(0, 8).join(','))
          params.set('productId', recentIds[0])
        }
        const query = params.toString() ? `?${params.toString()}` : ''
        const response = await fetch(`/api/recommendations${query}`)
        const data = await response.json()
        if (cancelled) return
        setSections(data.sections ?? [])
      } catch {
        if (cancelled) return
        setSections([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (sections.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{section.title}</h2>
              <p className="text-sm text-slate-500">{section.subtitle}</p>
            </div>
            <Link href="/products" className="text-sm font-semibold text-blue-600 hover:underline">
              Explore more
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {section.products.map((product) => (
              <article key={product.id} className="rounded-xl border border-slate-200 p-2">
                <Link href={`/products/${product.slug}`} className="block rounded-lg bg-slate-50 p-2">
                  <div className="flex h-28 items-center justify-center">
                    <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
                  </div>
                </Link>
                <p className="mt-2 text-xs font-medium text-blue-600">{product.store.name}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800">{product.name}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(product.price)}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
