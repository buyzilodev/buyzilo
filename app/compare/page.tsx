'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductThumb from '@/components/ProductThumb'
import { PRODUCT_COMPARE_KEY } from '@/lib/constants/storefront'
import { getMatchingBannerCards, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { formatUnitPricing, type UnitPricing } from '@/lib/helpers/unitPricing'

type CompareProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  comparePrice?: number | null
  stock: number
  images: string[]
  unitPricing?: UnitPricing | null
  store: { name: string; slug: string }
  category: { name: string; slug: string }
  reviewCount: number
  averageRating?: number | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function ComparePage() {
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const compareBanners = storefrontConfig ? getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'search' }).slice(0, 2) : []

  useEffect(() => {
    let cancelled = false

    fetch('/api/settings/public')
      .then(async (response): Promise<{ storefrontConfig?: StorefrontConfig | null }> => {
        if (!response.ok) {
          return {}
        }
        return await response.json() as { storefrontConfig?: StorefrontConfig | null }
      })
      .then((data) => {
        if (cancelled) return
        setStorefrontConfig(data.storefrontConfig ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setStorefrontConfig(null)
      })

    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(PRODUCT_COMPARE_KEY)
        const ids: string[] = raw ? JSON.parse(raw) : []

        if (ids.length === 0) {
          if (cancelled) return
          setProducts([])
          setLoading(false)
          return
        }

        fetch(`/api/products?ids=${ids.join(',')}`)
          .then(async (response): Promise<{ products?: CompareProduct[] }> => {
            return await response.json() as { products?: CompareProduct[] }
          })
          .then((data) => {
            if (cancelled) return
            setProducts(data.products ?? [])
            setLoading(false)
          })
          .catch(() => {
            if (cancelled) return
            setProducts([])
            setLoading(false)
          })
      } catch {
        if (cancelled) return
        setProducts([])
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  function removeProduct(productId: string) {
    const next = products.filter((product) => product.id !== productId)
    setProducts(next)
    localStorage.setItem(PRODUCT_COMPARE_KEY, JSON.stringify(next.map((product) => product.id)))
    window.dispatchEvent(new Event('buyzilo:compare-updated'))
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">Loading your comparison set...</div>
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-2xl font-black text-slate-900">No products selected for comparison</h1>
        <p className="mt-2 text-sm text-slate-500">Add up to four products from the catalog or product detail pages.</p>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {storefrontConfig && (
        <section className="mb-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] p-6 text-white shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Comparison</p>
              <h1 className="mt-2 text-3xl font-black">Compare products before you commit</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Keep discovery context while checking pricing, store, stock, unit value, and review signals side by side.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {compareBanners.map((banner, index) => (
                <Link
                  key={`${banner.title}-${index}`}
                  href={banner.href}
                  className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 backdrop-blur"
                >
                  <p className="text-sm font-black text-white">{banner.title}</p>
                  <p className="mt-2 text-sm text-white/75">{banner.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Compare products</h1>
        <p className="text-sm text-slate-500">Review price, stock, store, category, and review signals side by side.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-4 text-left font-semibold text-slate-600">Field</th>
              {products.map((product) => (
                <th key={product.id} className="p-4 text-left">
                  <div className="space-y-3">
                    <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 p-4">
                      <ProductThumb src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <Link href={`/products/${product.slug}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600">
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{product.store.name}</p>
                    </div>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800"
                    >
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: 'Price',
                render: (product: CompareProduct) => formatCurrency(product.price),
              },
              {
                label: 'Compare Price',
                render: (product: CompareProduct) =>
                  product.comparePrice ? formatCurrency(product.comparePrice) : '-',
              },
              {
                label: 'Unit Price',
                render: (product: CompareProduct) => {
                  const unitPricing = formatUnitPricing(product.price, product.unitPricing)
                  return unitPricing ? `${formatCurrency(unitPricing.unitPrice)} per ${unitPricing.label}` : '-'
                },
              },
              {
                label: 'Stock',
                render: (product: CompareProduct) => (product.stock > 0 ? `${product.stock} available` : 'Out of stock'),
              },
              {
                label: 'Category',
                render: (product: CompareProduct) => product.category.name,
              },
              {
                label: 'Store',
                render: (product: CompareProduct) => product.store.name,
              },
              {
                label: 'Reviews',
                render: (product: CompareProduct) =>
                  `${product.reviewCount} reviews${product.averageRating != null ? ` | ${product.averageRating}/5` : ''}`,
              },
              {
                label: 'Description',
                render: (product: CompareProduct) => product.description || '-',
              },
            ].map((row) => (
              <tr key={row.label} className="border-t border-slate-100 align-top">
                <td className="p-4 font-semibold text-slate-700">{row.label}</td>
                {products.map((product) => (
                  <td key={`${row.label}-${product.id}`} className="p-4 text-slate-600">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
