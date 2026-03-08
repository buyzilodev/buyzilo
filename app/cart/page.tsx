'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ProductThumb from '@/components/ProductThumb'
import { CHECKOUT_COUPON_STORAGE_KEY, GUEST_CART_STORAGE_KEY } from '@/lib/constants/commerce'
import { formatUnitPricing, type UnitPricing } from '@/lib/helpers/unitPricing'
import { getMatchingBannerCards, getMatchingCampaigns, getMatchingIntentPresets, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'

const GUEST_SAVE_FOR_LATER_KEY = 'buyzilo_save_for_later'

type CartItem = {
  productId: string
  variantId?: string
  variant?: {
    id: string
    title: string
    image?: string | null
    price?: number | null
  } | null
  quantity: number
  product?: {
    name: string
    slug: string
    price: number
    images: string[]
    unitPricing?: UnitPricing | null
    store?: { name: string }
  }
  name?: string
  price?: number
  image?: string
  store?: string
  variantLabel?: string
  unitPricing?: UnitPricing | null
}

type RequiredProduct = {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  hasVariants: boolean
  store?: { name: string; slug: string }
}

type ShippingMethod = {
  code: string
  label: string
  price: number
  freeOver?: number | null
}

type RewardsSummary = {
  availablePoints: number
  currentTier: string
  availableRewardClaims: number
}

type RewardsPayload = {
  pointsPerDollar: number
  rewardCouponDiscount: number
  rewardCouponCost: number
  summary: RewardsSummary
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function CartPage() {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [savedItems, setSavedItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [coupon, setCoupon] = useState('')
  const [discountPercent, setDiscountPercent] = useState<number | null>(null)
  const [discountFixed, setDiscountFixed] = useState<number | null>(null)
  const [minOrder, setMinOrder] = useState<number | null>(null)
  const [couponMsg, setCouponMsg] = useState('')
  const [bundleDiscount, setBundleDiscount] = useState(0)
  const [bundleTitles, setBundleTitles] = useState<string[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [requiredProductsMap, setRequiredProductsMap] = useState<Record<string, RequiredProduct[]>>({})
  const [rewards, setRewards] = useState<RewardsPayload | null>(null)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const cartBanners = storefrontConfig ? getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'cart' }).slice(0, 2) : []
  const cartCampaigns = storefrontConfig ? getMatchingCampaigns(storefrontConfig.campaigns, { page: 'cart' }) : []
  const cartIntentPresets = storefrontConfig ? getMatchingIntentPresets(storefrontConfig.intentPresets, 'cart') : []

  useEffect(() => {
    fetch('/api/settings/public')
      .then((response) => response.json())
      .then((data) => {
        setShippingMethods(Array.isArray(data?.shippingMethods) ? data.shippingMethods : [])
        setStorefrontConfig(data?.storefrontConfig ?? null)
      })
      .catch(() => setShippingMethods([]))
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setRewards(null)
      return
    }

    fetch('/api/rewards')
      .then((response) => response.ok ? response.json() : { rewards: null })
      .then((data) => setRewards(data.rewards ?? null))
      .catch(() => setRewards(null))
  }, [session?.user])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_COUPON_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { code?: string }
      if (parsed?.code) {
        setCoupon(parsed.code)
      }
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      Promise.all([
        fetch('/api/cart').then((res) => res.json()),
        fetch('/api/wishlist').then((res) => res.ok ? res.json() : { items: [] }),
      ])
        .then(([cartData, wishlistData]) => {
          setItems(
            (cartData.items ?? []).map((item: CartItem) => ({
              ...item,
              name: item.product?.name,
              price: item.variant?.price ?? item.product?.price,
              image: item.variant?.image ?? item.product?.images?.[0],
              store: item.product?.store?.name,
              variantLabel: item.variant?.title ?? undefined,
              unitPricing: item.product?.unitPricing ?? null,
            }))
          )
          setSavedItems(
            (wishlistData.items ?? []).map((item: CartItem) => ({
              ...item,
              name: item.product?.name,
              price: item.variant?.price ?? item.product?.price,
              image: item.variant?.image ?? item.product?.images?.[0],
              store: item.product?.store?.name,
              variantLabel: item.variant?.title ?? undefined,
              quantity: 1,
              unitPricing: item.product?.unitPricing ?? null,
            }))
          )
        })
        .catch(() => {
          setItems([])
          setSavedItems([])
        })
        .finally(() => setLoading(false))
      return
    }

    try {
      const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      setItems(Array.isArray(parsed) ? parsed : [])
      const rawWishlist = localStorage.getItem(GUEST_SAVE_FOR_LATER_KEY)
      const parsedWishlist = rawWishlist ? JSON.parse(rawWishlist) : []
      setSavedItems(Array.isArray(parsedWishlist) ? parsedWishlist : [])
    } catch {
      setItems([])
      setSavedItems([])
    } finally {
      setLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)))
    if (productIds.length === 0) {
      setRequiredProductsMap({})
      return
    }

    fetch(`/api/products?ids=${encodeURIComponent(productIds.join(','))}`)
      .then((response) => response.json())
      .then((data) => {
        const nextMap: Record<string, RequiredProduct[]> = {}
        for (const product of data.products ?? []) {
          nextMap[product.id] = Array.isArray(product.requiredProducts) ? product.requiredProducts : []
        }
        setRequiredProductsMap(nextMap)
      })
      .catch(() => setRequiredProductsMap({}))
  }, [items])

  async function updateQty(productId: string, quantity: number, variantId?: string) {
    if (quantity < 1) return

    if (session?.user) {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity }),
      })
      if (!response.ok) return
      const data = await response.json()
      setItems(
        (data.items ?? []).map((item: CartItem) => ({
          ...item,
          name: item.product?.name,
          price: item.variant?.price ?? item.product?.price,
          image: item.variant?.image ?? item.product?.images?.[0],
          store: item.product?.store?.name,
          variantLabel: item.variant?.title ?? undefined,
          unitPricing: item.product?.unitPricing ?? null,
        }))
      )
      return
    }

    setItems((prev) => {
      const next = prev.map((item) => (item.productId === productId && item.variantId === variantId ? { ...item, quantity } : item))
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  async function removeItem(productId: string, variantId?: string) {
    if (session?.user) {
      const query = new URLSearchParams({ productId })
      if (variantId) query.set('variantId', variantId)
      await fetch(`/api/cart?${query.toString()}`, { method: 'DELETE' })
      const response = await fetch('/api/cart')
      const data = await response.json()
      setItems(
        (data.items ?? []).map((item: CartItem) => ({
          ...item,
          name: item.product?.name,
          price: item.variant?.price ?? item.product?.price,
          image: item.variant?.image ?? item.product?.images?.[0],
          store: item.product?.store?.name,
          variantLabel: item.variant?.title ?? undefined,
        }))
      )
      return
    }

    setItems((prev) => {
      const next = prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  async function moveToWishlist(item: CartItem) {
    if (session?.user) {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        alert(data.error ?? 'Failed to move item to wishlist')
        return
      }
      const wishlistResponse = await fetch('/api/wishlist')
      const wishlistData = await wishlistResponse.json()
      setSavedItems(
        (wishlistData.items ?? []).map((wishlistItem: CartItem) => ({
          ...wishlistItem,
          name: wishlistItem.product?.name,
          price: wishlistItem.variant?.price ?? wishlistItem.product?.price,
          image: wishlistItem.variant?.image ?? wishlistItem.product?.images?.[0],
          store: wishlistItem.product?.store?.name,
          variantLabel: wishlistItem.variant?.title ?? undefined,
          quantity: 1,
          unitPricing: wishlistItem.product?.unitPricing ?? null,
        }))
      )
    } else {
      const existing = savedItems.some((savedItem) => savedItem.productId === item.productId && savedItem.variantId === item.variantId)
      if (!existing) {
        const nextSavedItems = [...savedItems, { ...item, quantity: 1 }]
        setSavedItems(nextSavedItems)
        localStorage.setItem(GUEST_SAVE_FOR_LATER_KEY, JSON.stringify(nextSavedItems.map((savedItem) => ({
          productId: savedItem.productId,
          variantId: savedItem.variantId,
          name: savedItem.name,
          price: savedItem.price,
          image: savedItem.image,
          store: savedItem.store,
          variantLabel: savedItem.variantLabel,
          unitPricing: savedItem.unitPricing,
          product: savedItem.product,
          variant: savedItem.variant,
        }))))
      }
    }
    await removeItem(item.productId, item.variantId)
  }

  async function moveSavedToCart(item: CartItem) {
    if (!session?.user) {
      const nextCartItems = [...items, { ...item, quantity: 1 }]
      const nextSavedItems = savedItems.filter((savedItem) => !(savedItem.productId === item.productId && savedItem.variantId === item.variantId))
      setItems(nextCartItems)
      setSavedItems(nextSavedItems)
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(nextCartItems))
      localStorage.setItem(GUEST_SAVE_FOR_LATER_KEY, JSON.stringify(nextSavedItems))
      return
    }

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.productId, variantId: item.variantId, quantity: 1 }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      alert(data.error ?? 'Failed to move item to cart')
      return
    }

    const [cartResponse, wishlistResponse] = await Promise.all([
      fetch('/api/cart'),
      fetch(`/api/wishlist?${new URLSearchParams({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
      }).toString()}`, { method: 'DELETE' }).then(() => fetch('/api/wishlist')),
    ])
    const [cartData, wishlistData] = await Promise.all([cartResponse.json(), wishlistResponse.json()])
    setItems(
      (cartData.items ?? []).map((cartItem: CartItem) => ({
        ...cartItem,
        name: cartItem.product?.name,
        price: cartItem.variant?.price ?? cartItem.product?.price,
        image: cartItem.variant?.image ?? cartItem.product?.images?.[0],
        store: cartItem.product?.store?.name,
        variantLabel: cartItem.variant?.title ?? undefined,
        unitPricing: cartItem.product?.unitPricing ?? null,
      }))
    )
    setSavedItems(
      (wishlistData.items ?? []).map((wishlistItem: CartItem) => ({
        ...wishlistItem,
        name: wishlistItem.product?.name,
        price: wishlistItem.variant?.price ?? wishlistItem.product?.price,
        image: wishlistItem.variant?.image ?? wishlistItem.product?.images?.[0],
        store: wishlistItem.product?.store?.name,
        variantLabel: wishlistItem.variant?.title ?? undefined,
        quantity: 1,
        unitPricing: wishlistItem.product?.unitPricing ?? null,
      }))
    )
  }

  async function applyCoupon() {
    if (!coupon.trim()) return
    const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(coupon.trim())}`)
    if (!response.ok) {
      setDiscountPercent(null)
      setDiscountFixed(null)
      setMinOrder(null)
      setCouponMsg('Invalid or expired coupon')
      localStorage.removeItem(CHECKOUT_COUPON_STORAGE_KEY)
      return
    }
    const data = await response.json()
    setDiscountPercent(data.discountPercent ?? null)
    setDiscountFixed(data.discountFixed ?? null)
    setMinOrder(data.minOrder ?? null)
    const couponCode = coupon.trim().toUpperCase()
    if (data.minOrder != null && subtotal < data.minOrder) {
      setCouponMsg(`Coupon saved. Add ${formatCurrency(data.minOrder - subtotal)} more to apply it.`)
    } else {
      setCouponMsg('Coupon applied')
    }
    localStorage.setItem(CHECKOUT_COUPON_STORAGE_KEY, JSON.stringify({ code: couponCode }))
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.price ?? item.product?.price ?? 0) * item.quantity, 0),
    [items]
  )
  const presentProductIds = useMemo(() => new Set(items.map((item) => item.productId)), [items])
  const missingRequiredByItem = useMemo(() => {
    const map: Record<string, RequiredProduct[]> = {}
    for (const item of items) {
      const key = `${item.productId}:${item.variantId ?? 'default'}`
      map[key] = (requiredProductsMap[item.productId] ?? []).filter((requiredProduct) => !presentProductIds.has(requiredProduct.id))
    }
    return map
  }, [items, presentProductIds, requiredProductsMap])
  const checkoutMissingRequired = useMemo(
    () =>
      Array.from(
        new Map(
          Object.values(missingRequiredByItem)
            .flat()
            .map((item) => [item.id, item] as const)
        ).values()
      ),
    [missingRequiredByItem]
  )
  useEffect(() => {
    if (items.length === 0) {
      setBundleDiscount(0)
      setBundleTitles([])
      return
    }
    void fetch('/api/bundles/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price ?? item.product?.price ?? 0,
          name: item.name ?? item.product?.name,
        })),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setBundleDiscount(Number(data.discountAmount ?? 0))
        setBundleTitles(Array.isArray(data.bundles) ? data.bundles.map((bundle: { title: string }) => bundle.title) : [])
      })
      .catch(() => {
        setBundleDiscount(0)
        setBundleTitles([])
      })
  }, [items])
  const canApplyDiscount = minOrder == null || subtotal >= minOrder
  const couponDiscountAmount = canApplyDiscount
    ? Math.min(
      subtotal,
      discountPercent != null
        ? (subtotal * discountPercent) / 100
        : (discountFixed ?? 0)
    )
    : 0
  const discountAmount = Math.min(subtotal, couponDiscountAmount + bundleDiscount)
  const defaultShipping = shippingMethods[0]
  const shipping = defaultShipping
    ? defaultShipping.freeOver != null && subtotal >= defaultShipping.freeOver
      ? 0
      : defaultShipping.price
    : 0
  const total = Math.max(0, subtotal - discountAmount + shipping)
  const estimatedEarnedPoints = rewards
    ? Math.floor(Math.max(0, subtotal - discountAmount) * rewards.pointsPerDollar)
    : 0

  async function addRequiredProduct(item: RequiredProduct) {
    if (item.hasVariants) return

    if (session?.user) {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.id, quantity: 1 }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        alert(data.error ?? 'Failed to add required product')
        return
      }

      const data = await response.json()
      setItems(
        (data.items ?? []).map((cartItem: CartItem) => ({
          ...cartItem,
          name: cartItem.product?.name,
          price: cartItem.variant?.price ?? cartItem.product?.price,
          image: cartItem.variant?.image ?? cartItem.product?.images?.[0],
          store: cartItem.product?.store?.name,
          variantLabel: cartItem.variant?.title ?? undefined,
        }))
      )
      return
    }

    setItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.productId === item.id && !cartItem.variantId)
      const next = existing
        ? prev.map((cartItem) => (cartItem.productId === item.id && !cartItem.variantId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem))
        : [
          ...prev,
          {
            productId: item.id,
            quantity: 1,
            name: item.name,
            price: item.price,
            image: item.images?.[0],
            store: item.store?.name,
          },
        ]
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    if (!coupon.trim()) return
    if (discountPercent != null || discountFixed != null) return
    void applyCoupon()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon, subtotal, discountPercent, discountFixed])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-slate-500">Loading cart...</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <h2 className="text-2xl font-black text-slate-900">Your cart is empty</h2>
          <p className="mt-2 text-sm text-slate-500">Add products to continue checkout.</p>
          <Link href="/products" className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {storefrontConfig && (
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] px-6 py-6 text-white shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Cart Experience</p>
                <h1 className="mt-2 text-3xl font-black">Review items before checkout</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Bundles, rewards, store credit, required products, and campaign paths stay visible through checkout prep.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {cartBanners.map((banner, index) => (
                  <Link key={`${banner.title}-${index}`} href={banner.href} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-black text-white">{banner.title}</p>
                    <p className="mt-2 text-sm text-white/75">{banner.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <h1 className="mb-6 text-2xl font-black text-slate-900">Shopping Cart ({items.length})</h1>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            {items.map((item) => {
              const name = item.name ?? item.product?.name ?? 'Product'
              const price = item.price ?? item.product?.price ?? 0
              const image = item.image ?? item.variant?.image ?? item.product?.images?.[0]
              const store = item.store ?? item.product?.store?.name
              const unitPricing = item.unitPricing ?? item.product?.unitPricing ?? null
              const formattedUnitPricing = formatUnitPricing(price, unitPricing)
              const missingRequired = missingRequiredByItem[`${item.productId}:${item.variantId ?? 'default'}`] ?? []
              return (
                <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-slate-50 p-2">
                      <ProductThumb src={image} alt={name} className="h-full w-full rounded-lg object-contain" />
                    </div>
                    <div className="flex-1">
                      {store && <p className="text-xs font-medium text-blue-600">{store}</p>}
                      <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
                      {item.variantLabel && <p className="mt-1 text-xs text-slate-500">{item.variantLabel}</p>}
                      <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(price)}</p>
                      {formattedUnitPricing && (
                        <p className="text-xs font-semibold text-slate-500">
                          {formatCurrency(formattedUnitPricing.unitPrice)} per {formattedUnitPricing.label}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
                      <button type="button" onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)} className="px-3 py-1.5 text-sm font-bold hover:bg-slate-50">-</button>
                      <span className="px-3 py-1.5 text-sm font-semibold">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)} className="px-3 py-1.5 text-sm font-bold hover:bg-slate-50">+</button>
                    </div>
                    <p className="min-w-20 text-right text-sm font-bold text-slate-900">{formatCurrency(price * item.quantity)}</p>
                    <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="text-sm text-red-500 hover:text-red-600">
                      Remove
                    </button>
                    <button type="button" onClick={() => void moveToWishlist(item)} className="text-sm text-slate-500 hover:text-slate-700">
                      Save for later
                    </button>
                  </div>
                  {missingRequired.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-800">Missing required products</p>
                      <p className="mt-1 text-xs text-amber-700">
                        Add these items before checkout can continue.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missingRequired.map((requiredProduct) => (
                          <div key={`${item.productId}-${requiredProduct.id}`} className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs">
                            <Link href={`/products/${requiredProduct.slug}`} className="font-semibold text-slate-800 hover:text-blue-600">
                              {requiredProduct.name}
                            </Link>
                            {requiredProduct.hasVariants ? (
                              <Link href={`/products/${requiredProduct.slug}`} className="font-semibold text-amber-700 hover:underline">
                                Choose options
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void addRequiredProduct(requiredProduct)}
                                className="font-semibold text-amber-700 hover:underline"
                              >
                                Add item
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Coupon</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button type="button" onClick={applyCoupon} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Apply
                </button>
              </div>
              {couponMsg && <p className="mt-2 text-xs text-slate-500">{couponMsg}</p>}
            </div>

            {savedItems.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Saved For Later</h3>
                    <p className="text-xs text-slate-500">Keep items nearby without blocking checkout.</p>
                  </div>
                  {session?.user && (
                    <Link href="/dashboard/wishlist" className="text-sm font-semibold text-blue-600 hover:underline">
                      Open wishlist
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  {savedItems.map((item) => {
                    const name = item.name ?? item.product?.name ?? 'Product'
                    const price = item.price ?? item.product?.price ?? 0
                    const image = item.image ?? item.variant?.image ?? item.product?.images?.[0]
                    const store = item.store ?? item.product?.store?.name
                    const unitPricing = item.unitPricing ?? item.product?.unitPricing ?? null
                    const formattedUnitPricing = formatUnitPricing(price, unitPricing)
                    return (
                      <div key={`saved-${item.productId}-${item.variantId ?? 'default'}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-white p-2">
                          <ProductThumb src={image} alt={name} className="h-full w-full rounded-lg object-contain" />
                        </div>
                        <div className="flex-1">
                          {store && <p className="text-xs font-medium text-blue-600">{store}</p>}
                          <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
                          {item.variantLabel && <p className="mt-1 text-xs text-slate-500">{item.variantLabel}</p>}
                          <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(price)}</p>
                          {formattedUnitPricing && (
                            <p className="text-xs font-semibold text-slate-500">
                              {formatCurrency(formattedUnitPricing.unitPrice)} per {formattedUnitPricing.label}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => void moveSavedToCart(item)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                          Move to cart
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black text-slate-900">Order Summary</h2>
              {checkoutMissingRequired.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-800">Checkout blocked by required products</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Add: {checkoutMissingRequired.map((item) => item.name).join(', ')}
                  </p>
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>
                      Discount
                    </span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {bundleTitles.length > 0 && (
                  <p className="text-xs text-slate-500">Includes bundle savings from: {bundleTitles.join(', ')}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-semibold text-slate-900">{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
                </div>
                {defaultShipping && (
                  <p className="text-xs text-slate-500">Estimated via {defaultShipping.label}</p>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {rewards && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Reward points</p>
                      <p className="text-xs text-slate-500">
                        {rewards.summary.availablePoints} points available • {rewards.summary.currentTier} tier
                      </p>
                    </div>
                    <Link href="/dashboard/rewards" className="text-xs font-semibold text-blue-600 hover:underline">
                      Open rewards
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-white px-3 py-2 text-slate-600">
                      Estimated on this order: <span className="font-semibold text-slate-900">{estimatedEarnedPoints} pts</span>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 text-slate-600">
                      Claimable coupons: <span className="font-semibold text-slate-900">{rewards.summary.availableRewardClaims}</span>
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/checkout"
                className={`mt-5 block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white ${
                  checkoutMissingRequired.length > 0
                    ? 'pointer-events-none bg-slate-300'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Proceed to Checkout
              </Link>
            </div>

            {cartCampaigns.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Campaigns</h2>
                <div className="mt-4 space-y-3">
                  {cartCampaigns.slice(0, 2).map((campaign) => (
                    <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{campaign.eyebrow}</p>
                      <p className="mt-2 text-sm font-black text-slate-900">{campaign.title}</p>
                      <p className="mt-2 text-xs text-slate-500">{campaign.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {cartIntentPresets.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Intent Presets</h2>
                <div className="mt-4 space-y-3">
                  {cartIntentPresets.slice(0, 2).map((preset) => (
                    <Link key={preset.slug} href={preset.href} className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">{preset.title}</p>
                      <p className="mt-2 text-xs text-slate-500">{preset.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
