'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'
import { RECENTLY_VIEWED_PRODUCTS_KEY } from '@/lib/constants/storefront'
import { formatUnitPricing, type UnitPricing } from '@/lib/helpers/unitPricing'

type ViewedProduct = {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string[]
  unitPricing?: UnitPricing | null
  store: { name: string; slug: string }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function RecentlyViewedProducts({ currentProductId }: { currentProductId: string }) {
  const [products, setProducts] = useState<ViewedProduct[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY)
        const ids: string[] = raw ? JSON.parse(raw) : []
        const filtered = ids.filter((id) => id !== currentProductId).slice(0, 6)
        if (filtered.length === 0) {
          if (cancelled) return
          setProducts([])
          return
        }
        fetch(`/api/products?ids=${filtered.join(',')}`)
          .then((response) => response.json())
          .then((data) => {
            if (cancelled) return
            setProducts(data.products ?? [])
          })
          .catch(() => {
            if (cancelled) return
            setProducts([])
          })
      } catch {
        if (cancelled) return
        setProducts([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [currentProductId])

  if (products.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-2xl font-black text-slate-900">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {products.map((product) => (
          <article key={product.id} className="rounded-xl border border-slate-200 p-2">
            {(() => {
              const unitPricing = formatUnitPricing(product.price, product.unitPricing)
              return (
                <>
                  <Link href={`/products/${product.slug}`} className="block rounded-lg bg-slate-50 p-2">
                    <div className="flex h-24 items-center justify-center">
                      <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
                    </div>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-800">{product.name}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(product.price)}</p>
                  {unitPricing && (
                    <p className="text-xs font-semibold text-slate-500">
                      {formatCurrency(unitPricing.unitPrice)} per {unitPricing.label}
                    </p>
                  )}
                </>
              )
            })()}
          </article>
        ))}
      </div>
    </section>
  )
}
