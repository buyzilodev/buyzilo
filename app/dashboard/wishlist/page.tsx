'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProductThumb from '@/components/ProductThumb'
import { getMatchingBannerCards, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'

const WISHLIST_KEY = 'buyzilo_wishlist'

type WishlistItem = {
  productId: string
  variantId?: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice?: number | null
    images: string[]
    store?: { name?: string; slug?: string }
    category?: { name?: string; slug?: string }
  }
  variant?: {
    id: string
    title: string
    price?: number | null
    image?: string | null
    stock: number
  } | null
}

type PublicSettingsResponse = {
  storefrontConfig?: StorefrontConfig | null
}

type CategoryCount = {
  slug: string
  name: string
  count: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function WishlistPage() {
  const { status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const [categoryStoreSpotlight, setCategoryStoreSpotlight] = useState<Array<{ name: string; slug: string; count: number }>>([])
  const [wishlistCategoryName, setWishlistCategoryName] = useState<string | null>(null)
  const accountBanners = storefrontConfig ? getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'account' }).slice(0, 2) : []

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [router, status])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    fetch('/api/settings/public')
      .then(async (res): Promise<PublicSettingsResponse> => {
        if (!res.ok) {
          return {}
        }
        return await res.json() as PublicSettingsResponse
      })
      .then((data) => setStorefrontConfig(data.storefrontConfig ?? null))
      .catch(() => setStorefrontConfig(null))

    let guestItems: Array<{ productId: string; variantId?: string }> = []
    try {
      const raw = localStorage.getItem(WISHLIST_KEY)
      guestItems = raw ? JSON.parse(raw) : []
    } catch {
      guestItems = []
    }

    const syncAndFetch = async () => {
      if (guestItems.length > 0) {
        for (const item of guestItems.slice(0, 50)) {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }).catch(() => null)
        }
        localStorage.removeItem(WISHLIST_KEY)
      }

      const response = await fetch('/api/wishlist')
      const data = await response.json()
      const nextItems = data.items ?? []
      setItems(nextItems)
      setLoading(false)

      const counts = nextItems.reduce((map: Map<string, CategoryCount>, item: WishlistItem) => {
        const slug = item.product.category?.slug?.trim()
        const name = item.product.category?.name?.trim()
        if (!slug || !name) {
          return map
        }
        const current = map.get(slug) ?? { slug, name, count: 0 }
        current.count += 1
        map.set(slug, current)
        return map
      }, new Map())

      const topCategory = Array.from<CategoryCount>(counts.values()).sort(
        (left, right) => right.count - left.count || left.name.localeCompare(right.name)
      )[0]

      if (!topCategory) {
        setWishlistCategoryName(null)
        setCategoryStoreSpotlight([])
        return
      }

      setWishlistCategoryName(topCategory.name)
      const categoryResponse = await fetch(`/api/products?category=${encodeURIComponent(topCategory.slug)}&limit=18`)
      const categoryData = await categoryResponse.json().catch(() => ({}))
      const spotlightStores = Array.isArray(categoryData.products)
        ? Array.from(
            (categoryData.products as WishlistItem['product'][]).reduce((map, product: WishlistItem['product'] & { store?: { name?: string; slug?: string } }) => {
              const slug = product.store?.slug?.trim()
              const name = product.store?.name?.trim()
              if (!slug || !name) {
                return map
              }
              const current = map.get(slug) ?? { slug, name, count: 0 }
              current.count += 1
              map.set(slug, current)
              return map
            }, new Map<string, { slug: string; name: string; count: number }>())
          )
            .map(([, store]) => store)
            .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
            .slice(0, 3)
        : []

      setCategoryStoreSpotlight(spotlightStores)
    }

    void syncAndFetch().catch(() => {
      setItems([])
      setCategoryStoreSpotlight([])
      setWishlistCategoryName(null)
      setLoading(false)
    })
  }, [status])

  async function remove(productId: string, variantId?: string) {
    const query = new URLSearchParams({ productId })
    if (variantId) {
      query.set('variantId', variantId)
    }
    await fetch(`/api/wishlist?${query.toString()}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)))
  }

  async function moveToCart(item: WishlistItem) {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: 1 }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      alert(data.error ?? 'Failed to add the item to cart.')
      return
    }

    await remove(item.productId, item.variantId)
  }

  async function moveAllAvailableToCart() {
    const movableItems = items.filter((item) => (item.variant?.stock ?? 1) > 0)
    if (movableItems.length === 0) {
      alert('There are no in-stock saved items to move right now.')
      return
    }

    for (const item of movableItems) {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: 1 }),
      })
      if (!response.ok) {
        continue
      }

      const query = new URLSearchParams({ productId: item.productId })
      if (item.variantId) {
        query.set('variantId', item.variantId)
      }
      await fetch(`/api/wishlist?${query.toString()}`, { method: 'DELETE' })
    }

    const response = await fetch('/api/wishlist')
    const data = await response.json()
    setItems(data.items ?? [])
  }

  if (status !== 'authenticated') {
    return null
  }

  return (
    <div className="space-y-6">
      {storefrontConfig && (
        <section className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#111827_0%,#2563eb_52%,#7c3aed_100%)] p-6 text-white shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Wishlist</p>
              <h1 className="mt-2 text-3xl font-black">Turn saved intent into completed orders</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">
                Track favorites, catch price drops, and move ready-to-buy picks back into your cart when the timing is right.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {accountBanners.map((banner, index) => (
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

      <div className="rounded-xl border border-[#e4e6ef] bg-white p-4 text-sm text-gray-600">
        Saved items can trigger product alerts when stock returns or when pricing drops on products you are tracking.
      </div>

      {wishlistCategoryName && categoryStoreSpotlight.length > 0 && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Store Discovery</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Top stores for your saved {wishlistCategoryName} picks
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {categoryStoreSpotlight.map((store) => (
              <Link
                key={store.slug}
                href={`/store/${store.slug}`}
                className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
              >
                <p className="text-sm font-black text-slate-900">{store.name}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {store.count} matching products in your top saved category.
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#e4e6ef] bg-white p-8 text-sm text-gray-500">
          Loading your saved products...
        </div>
      ) : items.length === 0 ? (
        <section className="rounded-xl border border-[#e4e6ef] bg-white p-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Wishlist</p>
          <p className="mt-3 text-4xl font-black text-slate-900">No saved products yet</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            Save products while you browse and come back when you are ready to compare options, watch for price changes, or complete the order.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Browse products
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e4e6ef] bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Wishlist completion</p>
              <p className="text-xs text-gray-500">
                Move in-stock saved items back to cart when you are ready to check out.
              </p>
            </div>
            <button
              onClick={() => void moveAllAvailableToCart()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Move all available to cart
            </button>
          </section>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const name = item.product.name
              const price = item.variant?.price ?? item.product.price
              const image = item.variant?.image ?? item.product.images?.[0]
              const inStock = (item.variant?.stock ?? 1) > 0

              return (
                <article
                  key={`${item.productId}-${item.variantId ?? 'default'}`}
                  className="overflow-hidden rounded-xl border border-[#e4e6ef] bg-white shadow-sm"
                >
                  <Link href={`/products/${item.product.slug}`}>
                    <div className="flex h-44 items-center justify-center bg-gray-50 p-4">
                      <ProductThumb src={image} alt={name} className="h-full w-full object-contain" />
                    </div>
                  </Link>
                  <div className="space-y-3 p-4">
                    {item.product.store?.name && (
                      <p className="text-xs font-medium text-blue-600">{item.product.store.name}</p>
                    )}
                    <Link href={`/products/${item.product.slug}`}>
                      <p className="line-clamp-2 text-sm font-medium text-slate-900">{name}</p>
                    </Link>
                    {item.variant?.title && <p className="text-xs text-gray-500">{item.variant.title}</p>}
                    <p className="font-bold text-[#3699ff]">{formatCurrency(price)}</p>
                    <p className={`text-xs font-semibold ${inStock ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {inStock ? 'Ready to move back to cart' : 'Waiting for restock'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void moveToCart(item)}
                        disabled={!inStock}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        Move to cart
                      </button>
                      <button
                        onClick={() => void remove(item.productId, item.variantId)}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
