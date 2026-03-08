'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/helpers/format'

type RewardsPayload = {
  generatedAt: string
  rewardCouponDiscount: number
  rewardCouponMinOrder: number
  rewardCouponCost: number
  summary: {
    deliveredOrders: number
    lifetimePoints: number
    redeemedPoints: number
    availablePoints: number
    currentTier: string
    nextTier: string | null
    pointsToNextTier: number
    pointsToNextReward: number
    availableRewardClaims: number
  }
  recentQualifyingOrders: Array<{
    id: string
    total: number
    createdAt: string
    earnedPoints: number
    items: Array<{ quantity: number; productName: string; productSlug: string }>
  }>
  rewardCoupons: Array<{
    couponId: string
    code: string
    discount: number
    pointsSpent: number
    claimedAt: string
    expiresAt: string | null
    isActive: boolean
    usedCount: number
    maxUses: number
  }>
}

export default function DashboardRewardsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [rewards, setRewards] = useState<RewardsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/rewards')
      .then((response) => (response.ok ? response.json() : { rewards: null }))
      .then((data) => {
        if (!cancelled) setRewards(data.rewards ?? null)
      })
      .catch(() => {
        if (!cancelled) setRewards(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  async function claimReward() {
    setClaiming(true)
    setMessage(null)
    const response = await fetch('/api/rewards', { method: 'POST' })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error ?? 'Unable to claim reward coupon')
      setClaiming(false)
      return
    }

    const next = await fetch('/api/rewards').then((res) => (res.ok ? res.json() : { rewards: null }))
    setRewards(next.rewards ?? null)
    setMessage(`Reward coupon ${data.code ?? ''} is ready to use.`.trim())
    setClaiming(false)
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading rewards...</div>
  }

  const summary = rewards?.summary

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#052e16_0%,#0f766e_46%,#1d4ed8_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Loyalty workspace</p>
          <h2 className="mt-3 text-4xl font-black">Rewards that stay usable in real buying flows</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Track point performance, tier progress, coupon eligibility, and the delivered orders that fund long-term buyer value.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Available</p>
              <p className="mt-1 text-2xl font-black text-white">{summary?.availablePoints ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Tier</p>
              <p className="mt-1 text-2xl font-black text-white">{summary?.currentTier ?? 'BRONZE'}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Claimable</p>
              <p className="mt-1 text-2xl font-black text-white">{summary?.availableRewardClaims ?? 0}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Delivered</p>
              <p className="mt-1 text-2xl font-black text-white">{summary?.deliveredOrders ?? 0}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-black text-slate-950">Claim next reward</p>
            <p className="mt-2 text-sm text-slate-500">
              Spend {rewards ? rewards.rewardCouponCost : 0} points for {formatCurrency(rewards?.rewardCouponDiscount ?? 0)} off orders above {formatCurrency(rewards?.rewardCouponMinOrder ?? 0)}.
            </p>
            <button
              type="button"
              onClick={() => void claimReward()}
              disabled={claiming || !summary || summary.availableRewardClaims < 1}
              className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {claiming ? 'Claiming...' : 'Claim reward coupon'}
            </button>
          </section>

          <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-black text-slate-950">Keep rewards moving</p>
            <div className="mt-3 space-y-2 text-sm">
              <Link href="/dashboard/store-credit" className="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                Open wallet and certificates
              </Link>
              <Link href="/dashboard/orders" className="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                Review delivered orders
              </Link>
            </div>
          </section>
        </div>
      </section>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Lifetime points</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary?.lifetimePoints ?? 0}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Redeemed points</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary?.redeemedPoints ?? 0}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">To next tier</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary?.pointsToNextTier ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">{summary?.nextTier ? `Working toward ${summary.nextTier}` : 'Top tier reached'}</p>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">To next coupon</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{summary?.pointsToNextReward ?? 0}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Qualifying orders</h3>
              <p className="text-sm text-slate-500">Recent delivered purchases contributing to loyalty progress.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-blue-600 hover:underline">
              View all orders
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading qualifying orders...</p>
            ) : (rewards?.recentQualifyingOrders.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No delivered orders yet.</p>
            ) : (
              rewards?.recentQualifyingOrders.map((order) => (
                <article key={order.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Order {order.id.slice(0, 8)}...</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-950">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-emerald-600">+{order.earnedPoints} points</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <Link key={`${order.id}-${item.productSlug}`} href={`/products/${item.productSlug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        {item.productName} x {item.quantity}
                      </Link>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Reward coupons</h3>
              <p className="text-sm text-slate-500">Claimed coupons stay visible here until they are used or expire.</p>
            </div>
            <p className="text-sm text-slate-400">{rewards?.rewardCoupons.length ?? 0} issued</p>
          </div>
          <div className="mt-4 space-y-3">
            {(rewards?.rewardCoupons.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No reward coupons claimed yet.</p>
            ) : (
              rewards?.rewardCoupons.map((coupon) => (
                <article key={coupon.couponId} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-slate-950">{coupon.code}</p>
                      <p className="mt-1 text-xs text-slate-500">Claimed {new Date(coupon.claimedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {coupon.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Discount: <span className="font-semibold text-slate-900">{formatCurrency(coupon.discount)}</span></p>
                    <p>Points spent: <span className="font-semibold text-slate-900">{coupon.pointsSpent}</span></p>
                    <p>Uses: <span className="font-semibold text-slate-900">{coupon.usedCount}/{coupon.maxUses}</span></p>
                    <p>Expires: <span className="font-semibold text-slate-900">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'No expiry'}</span></p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
