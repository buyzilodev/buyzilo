'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { dispatchFacebookPixelEvent } from '@/lib/helpers/facebookPixel'
import { dispatchGoogleAnalyticsEvent } from '@/lib/helpers/googleAnalytics'
import { getMatchingBannerCards, getMatchingCampaigns, getMatchingIntentPresets } from '@/lib/helpers/storefrontConfig'
import { checkoutContactSchema, type CheckoutContactInput } from '@/lib/validators/checkout'
import type { StorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { formatUnitPricing, type UnitPricing } from '@/lib/helpers/unitPricing'
import {
  CHECKOUT_COUPON_STORAGE_KEY,
  GUEST_CART_STORAGE_KEY,
} from '@/lib/constants/commerce'

type CheckoutItem = {
  productId: string
  variantId?: string
  variantLabel?: string
  quantity: number
  name: string
  price: number
  image?: string
  store?: string
  unitPricing?: UnitPricing | null
}

type AppliedCoupon = {
  code: string
  discountPercent: number | null
  discountFixed: number | null
  minOrder: number | null
}

type ShippingMethod = {
  code: string
  label: string
  price: number
  etaDays?: string
  freeOver?: number | null
}

type StoreCreditSummary = {
  balance: number
}

type RewardsPayload = {
  pointsPerDollar: number
  rewardCouponCost: number
  rewardCouponDiscount: number
  summary: {
    availablePoints: number
    currentTier: string
    availableRewardClaims: number
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function CheckoutForm() {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [bundleDiscount, setBundleDiscount] = useState(0)
  const [bundleTitles, setBundleTitles] = useState<string[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [shippingMethodCode, setShippingMethodCode] = useState('')
  const [storeCredit, setStoreCredit] = useState<StoreCreditSummary | null>(null)
  const [applyStoreCredit, setApplyStoreCredit] = useState(true)
  const [rewards, setRewards] = useState<RewardsPayload | null>(null)
  const [rewardMessage, setRewardMessage] = useState<string | null>(null)
  const [rewardClaiming, setRewardClaiming] = useState(false)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const checkoutBanners = storefrontConfig ? getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'checkout' }).slice(0, 2) : []
  const checkoutCampaigns = storefrontConfig ? getMatchingCampaigns(storefrontConfig.campaigns, { page: 'checkout' }) : []
  const checkoutIntentPresets = storefrontConfig ? getMatchingIntentPresets(storefrontConfig.intentPresets, 'checkout') : []

  const form = useForm<CheckoutContactInput>({
    resolver: zodResolver(checkoutContactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      zip: '',
      country: 'United States',
    },
  })

  useEffect(() => {
    fetch('/api/settings/public')
      .then((response) => response.json())
      .then((data) => {
        const methods = Array.isArray(data?.shippingMethods) ? data.shippingMethods : []
        setShippingMethods(methods)
        setStorefrontConfig(data?.storefrontConfig ?? null)
        if (methods[0]?.code) {
          setShippingMethodCode((current) => current || methods[0].code)
        }
      })
      .catch(() => setShippingMethods([]))
  }, [])

  useEffect(() => {
    if (session?.user?.email) {
      form.setValue('email', session.user.email)
    }
    if (session?.user?.name) {
      const [firstName, ...rest] = session.user.name.split(' ')
      form.setValue('firstName', firstName ?? '')
      form.setValue('lastName', rest.join(' '))
    }
  }, [form, session?.user?.email, session?.user?.name])

  useEffect(() => {
    if (status !== 'authenticated') {
      setStoreCredit(null)
      setRewards(null)
      return
    }
    Promise.all([
      fetch('/api/store-credit').then((response) => response.ok ? response.json() : { storeCredit: null }),
      fetch('/api/rewards').then((response) => response.ok ? response.json() : { rewards: null }),
    ])
      .then(([creditData, rewardsData]) => {
        setStoreCredit(creditData.storeCredit ?? null)
        setRewards(rewardsData.rewards ?? null)
      })
      .catch(() => {
        setStoreCredit(null)
        setRewards(null)
      })
  }, [status])

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'authenticated') {
      fetch('/api/cart')
        .then((response) => response.json())
        .then((data) => {
          const mapped: CheckoutItem[] = (data.items ?? []).map(
            (item: {
              productId: string
              variantId?: string
              quantity: number
              product?: { name?: string; price?: number; images?: string[]; unitPricing?: UnitPricing | null; store?: { name?: string } }
              variant?: { title?: string; price?: number | null; image?: string | null }
            }) => ({
              productId: item.productId,
              variantId: item.variantId,
              variantLabel: item.variant?.title,
              quantity: item.quantity,
              name: item.variant?.title ? `${item.product?.name ?? 'Product'} (${item.variant.title})` : item.product?.name ?? 'Product',
              price: item.variant?.price ?? item.product?.price ?? 0,
              image: item.variant?.image ?? item.product?.images?.[0],
              store: item.product?.store?.name,
              unitPricing: item.product?.unitPricing ?? null,
            })
          )
          setItems(mapped)
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
      return
    }

    try {
      const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      const mapped: CheckoutItem[] = Array.isArray(parsed)
        ? parsed.map((item: { productId: string; variantId?: string; variantLabel?: string; quantity: number; name?: string; price?: number; image?: string; store?: string; unitPricing?: UnitPricing | null }) => ({
          productId: item.productId,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          name: item.name ?? 'Product',
          price: Number(item.price ?? 0),
          image: item.image,
          store: item.store,
          unitPricing: item.unitPricing ?? null,
        }))
        : []
      setItems(mapped)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [status])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])
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
          price: item.price,
          name: item.name,
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
  const couponMinOrder = appliedCoupon?.minOrder ?? null
  const couponEligible = couponMinOrder == null || subtotal >= couponMinOrder
  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon || !couponEligible) return 0
    if (appliedCoupon.discountPercent != null) {
      return Math.min(subtotal, (subtotal * appliedCoupon.discountPercent) / 100)
    }
    if (appliedCoupon.discountFixed != null) {
      return Math.min(subtotal, appliedCoupon.discountFixed)
    }
    return 0
  }, [appliedCoupon, couponEligible, subtotal])
  const discountAmount = Math.min(subtotal, couponDiscountAmount + bundleDiscount)
  const selectedShipping = shippingMethods.find((method) => method.code === shippingMethodCode) ?? shippingMethods[0] ?? null
  const shipping = selectedShipping
    ? selectedShipping.freeOver != null && subtotal >= selectedShipping.freeOver
      ? 0
      : selectedShipping.price
    : 0
  const preCreditTotal = Math.max(0, subtotal - discountAmount + shipping)
  const storeCreditApplied = applyStoreCredit ? Math.min(preCreditTotal, storeCredit?.balance ?? 0) : 0
  const total = Math.max(0, preCreditTotal - storeCreditApplied)
  const estimatedEarnedPoints = rewards
    ? Math.floor(Math.max(0, subtotal - discountAmount) * rewards.pointsPerDollar)
    : 0

  async function applyCoupon(code?: string) {
    const finalCode = (code ?? couponInput).trim()
    if (!finalCode) return

    setCouponLoading(true)
    setCouponMessage(null)
    try {
      const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(finalCode)}`)
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setAppliedCoupon(null)
        setCouponMessage(data.error ?? 'Invalid or expired coupon')
        localStorage.removeItem(CHECKOUT_COUPON_STORAGE_KEY)
        return
      }

      const data = (await response.json()) as {
        discountPercent: number | null
        discountFixed: number | null
        minOrder: number | null
      }
      const normalizedCode = finalCode.toUpperCase()
      setCouponInput(normalizedCode)
      setAppliedCoupon({
        code: normalizedCode,
        discountPercent: data.discountPercent ?? null,
        discountFixed: data.discountFixed ?? null,
        minOrder: data.minOrder ?? null,
      })
      localStorage.setItem(CHECKOUT_COUPON_STORAGE_KEY, JSON.stringify({ code: normalizedCode }))
      if (data.minOrder != null && subtotal < data.minOrder) {
        setCouponMessage(`Coupon saved. Add ${formatCurrency(data.minOrder - subtotal)} more to apply.`)
      } else {
        setCouponMessage('Coupon applied.')
      }
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponMessage('Coupon removed.')
    localStorage.removeItem(CHECKOUT_COUPON_STORAGE_KEY)
  }

  async function claimRewardCoupon() {
    setRewardClaiming(true)
    setRewardMessage(null)
    try {
      const response = await fetch('/api/rewards', { method: 'POST' })
      const data = await response.json().catch(() => ({})) as {
        error?: string
        coupon?: { code: string }
        rewards?: RewardsPayload
      }
      if (!response.ok || !data.coupon?.code) {
        setRewardMessage(data.error ?? 'Unable to claim reward coupon')
        return
      }

      setRewards(data.rewards ?? null)
      setRewardMessage(`Reward coupon ${data.coupon.code} claimed and applied.`)
      await applyCoupon(data.coupon.code)
    } finally {
      setRewardClaiming(false)
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_COUPON_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { code?: string }
      if (parsed?.code) {
        setCouponInput(parsed.code)
        void applyCoupon(parsed.code)
      }
    } catch {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit() {
    if (items.length === 0) {
      setError('Your cart is empty.')
      return
    }

    setSubmitLoading(true)
    setError(null)
    try {
      dispatchFacebookPixelEvent('InitiateCheckout', {
        content_ids: items.map((item) => item.productId),
        contents: items.map((item) => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
        content_type: 'product',
        currency: 'USD',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
        value: Number(total.toFixed(2)),
      })
      dispatchGoogleAnalyticsEvent('begin_checkout', {
        currency: 'USD',
        value: Number(total.toFixed(2)),
        coupon: couponEligible ? appliedCoupon?.code : undefined,
        items: items.map((item) => ({
          item_id: item.productId,
          item_name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      })

      const body =
        status === 'authenticated'
          ? {
            useCart: true,
            couponCode: couponEligible ? appliedCoupon?.code : undefined,
            applyStoreCredit,
            shippingMethodCode,
            shippingCountry: form.getValues('country').slice(0, 2).toUpperCase(),
          }
          : {
            items: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            couponCode: couponEligible ? appliedCoupon?.code : undefined,
            applyStoreCredit,
            shippingMethodCode,
            shippingCountry: form.getValues('country').slice(0, 2).toUpperCase(),
          }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Checkout failed')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Checkout failed')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading checkout...</p>
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <form className="grid gap-6 lg:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-4 lg:col-span-2">
        {storefrontConfig && (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#2563eb_52%,#7c3aed_100%)] px-6 py-6 text-white shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Checkout</p>
                <h2 className="mt-2 text-3xl font-black">Secure order completion</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/80">
                  Shipping, rewards, bundle savings, store credit, and campaign routing stay visible through final checkout.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {checkoutBanners.map((banner, index) => (
                  <Link key={`${banner.title}-${index}`} href={banner.href} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-black text-white">{banner.title}</p>
                    <p className="mt-2 text-sm text-white/75">{banner.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Contact & shipping</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input {...form.register('firstName')} placeholder="First name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input {...form.register('lastName')} placeholder="Last name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input {...form.register('email')} placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <input {...form.register('phone')} placeholder="Phone" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <input {...form.register('address')} placeholder="Address" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            <input {...form.register('city')} placeholder="City" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input {...form.register('zip')} placeholder="ZIP code" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input {...form.register('country')} placeholder="Country" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          </div>
          {Object.values(form.formState.errors).length > 0 && (
            <p className="mt-3 text-sm text-red-600">Please complete all required shipping fields.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Payment method</h2>
          <p className="mt-2 text-sm text-slate-500">You will securely complete payment on Stripe in the next step.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Shipping method</h2>
          <div className="mt-4 space-y-3">
            {shippingMethods.map((method) => {
              const methodPrice = method.freeOver != null && subtotal >= method.freeOver ? 0 : method.price
              return (
                <label key={method.code} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={shippingMethodCode === method.code}
                      onChange={() => setShippingMethodCode(method.code)}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{method.label}</p>
                      {method.etaDays && <p className="text-xs text-slate-500">{method.etaDays}</p>}
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">{methodPrice === 0 ? 'FREE' : formatCurrency(methodPrice)}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Order items</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const unitPricing = formatUnitPricing(item.price, item.unitPricing)
              return (
                <div key={`${item.productId}-${item.variantId ?? 'default'}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                    <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    {unitPricing && (
                      <p className="text-xs text-slate-500">
                        {formatCurrency(unitPricing.unitPrice)} per {unitPricing.label}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Order summary</h2>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Discount code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Enter coupon code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void applyCoupon()}
              disabled={couponLoading}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {couponLoading ? '...' : 'Apply'}
            </button>
          </div>
          {appliedCoupon && (
            <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
              Remove {appliedCoupon.code}
            </button>
          )}
          {couponMessage && <p className="text-xs text-slate-500">{couponMessage}</p>}
        </div>

        {storeCredit && storeCredit.balance > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Store credit</p>
                <p className="text-xs text-slate-500">Available balance {formatCurrency(storeCredit.balance)}</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyStoreCredit((current) => !current)}
                className={`h-7 w-14 rounded-full transition ${applyStoreCredit ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${applyStoreCredit ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        )}

        {rewards && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Reward points</p>
                <p className="text-xs text-slate-500">
                  {rewards.summary.availablePoints} available • {rewards.summary.currentTier} tier
                </p>
              </div>
              <button
                type="button"
                onClick={() => void claimRewardCoupon()}
                disabled={rewardClaiming || rewards.summary.availableRewardClaims < 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                {rewardClaiming ? 'Claiming...' : 'Claim coupon'}
              </button>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-white px-3 py-2 text-slate-600">
                This order can earn <span className="font-semibold text-slate-900">{estimatedEarnedPoints} pts</span>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-slate-600">
                Claim cost <span className="font-semibold text-slate-900">{rewards.rewardCouponCost} pts</span> for ${rewards.rewardCouponDiscount.toFixed(2)} off
              </div>
            </div>
            {rewardMessage ? <p className="text-xs text-slate-600">{rewardMessage}</p> : null}
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          {appliedCoupon && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>
                Discount ({appliedCoupon.code})
              </span>
              <span>-{formatCurrency(couponDiscountAmount)}</span>
            </div>
          )}
          {bundleDiscount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Bundle savings</span>
              <span>-{formatCurrency(bundleDiscount)}</span>
            </div>
          )}
          {storeCreditApplied > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Store credit</span>
              <span>-{formatCurrency(storeCreditApplied)}</span>
            </div>
          )}
          {bundleTitles.length > 0 && (
            <p className="text-xs text-slate-500">Matched bundles: {bundleTitles.join(', ')}</p>
          )}
          {!couponEligible && couponMinOrder != null && (
            <p className="text-xs text-amber-600">
              Coupon requires minimum order {formatCurrency(couponMinOrder)}.
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Shipping</span>
            <span className="font-semibold text-slate-900">{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
          </div>
          {selectedShipping && (
            <p className="text-xs text-slate-500">Method: {selectedShipping.label}</p>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-700">Total</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitLoading}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitLoading ? 'Redirecting...' : 'Proceed to payment'}
        </button>
        <Link href="/cart" className="mt-3 block text-center text-xs font-medium text-slate-500 hover:text-slate-700">
          Back to cart
        </Link>
        {checkoutCampaigns.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Continue exploring</h3>
            <div className="mt-3 space-y-3">
              {checkoutCampaigns.slice(0, 2).map((campaign) => (
                <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{campaign.eyebrow}</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{campaign.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{campaign.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
        {checkoutIntentPresets.length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Buyer intents</h3>
            <div className="mt-3 space-y-3">
              {checkoutIntentPresets.slice(0, 2).map((preset) => (
                <Link key={preset.slug} href={preset.href} className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{preset.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{preset.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </form>
  )
}
