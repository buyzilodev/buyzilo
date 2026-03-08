'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getMatchingCampaigns, getMatchingIntentPresets, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'

type Order = {
  id: string
  status: string
  total: number
  createdAt: string
  items: { quantity: number; product: { name: string } }[]
}

type DigestPreview = {
  summary: {
    unreadAlerts: number
    savedSearchesWithNewResults: number
    cartValue: number
  }
  preferences: {
    digestFrequency: 'off' | 'daily' | 'weekly'
  }
}

type RewardsPreview = {
  summary: {
    availablePoints: number
    currentTier: string
    pointsToNextReward: number
    availableRewardClaims: number
  }
}

type StoreCreditPreview = {
  balance: number
  expiringSoonBalance: number
}

type PublicSettingsResponse = {
  storefrontConfig?: StorefrontConfig | null
}

type OrdersResponse = {
  orders?: Order[]
}

type CartResponse = {
  items?: Array<{ quantity?: number }>
}

type WishlistResponse = {
  items?: unknown[]
}

type SavedSearchResponse = {
  searches?: Array<{ id: string; hasNewResults: boolean }>
}

type DigestResponse = {
  digest?: DigestPreview | null
}

type RewardsResponse = {
  rewards?: RewardsPreview | null
}

type StoreCreditResponse = {
  storeCredit?: StoreCreditPreview | null
}

const statusColors: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  SHIPPED: 'bg-sky-50 text-sky-700',
  PROCESSING: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
  REFUNDED: 'bg-slate-100 text-slate-700',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; hasNewResults: boolean }>>([])
  const [digest, setDigest] = useState<DigestPreview | null>(null)
  const [rewards, setRewards] = useState<RewardsPreview | null>(null)
  const [storeCredit, setStoreCredit] = useState<StoreCreditPreview | null>(null)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [router, status])

  useEffect(() => {
    if (status !== 'authenticated') return

    void Promise.all([
      fetch('/api/settings/public').then(async (response): Promise<PublicSettingsResponse> => {
        if (!response.ok) {
          return {}
        }
        return await response.json() as PublicSettingsResponse
      }),
      fetch('/api/orders').then(async (response): Promise<OrdersResponse> => {
        if (!response.ok) {
          return { orders: [] }
        }
        return await response.json() as OrdersResponse
      }),
      fetch('/api/cart').then(async (response): Promise<CartResponse> => {
        if (!response.ok) {
          return { items: [] }
        }
        return await response.json() as CartResponse
      }),
      fetch('/api/wishlist').then(async (response): Promise<WishlistResponse> => {
        if (!response.ok) {
          return { items: [] }
        }
        return await response.json() as WishlistResponse
      }),
      fetch('/api/saved-searches').then(async (response): Promise<SavedSearchResponse> => {
        if (!response.ok) {
          return { searches: [] }
        }
        return await response.json() as SavedSearchResponse
      }),
      fetch('/api/buyer-digest').then(async (response): Promise<DigestResponse> => {
        if (!response.ok) {
          return { digest: null }
        }
        return await response.json() as DigestResponse
      }),
      fetch('/api/rewards').then(async (response): Promise<RewardsResponse> => {
        if (!response.ok) {
          return { rewards: null }
        }
        return await response.json() as RewardsResponse
      }),
      fetch('/api/store-credit').then(async (response): Promise<StoreCreditResponse> => {
        if (!response.ok) {
          return { storeCredit: null }
        }
        return await response.json() as StoreCreditResponse
      }),
    ])
      .then(([settingsData, ordersData, cartData, wishlistData, savedSearchData, digestData, rewardsData, creditData]) => {
        setStorefrontConfig(settingsData.storefrontConfig ?? null)
        setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : [])
        setCartCount(Array.isArray(cartData.items) ? cartData.items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity ?? 0), 0) : 0)
        setWishlistCount(Array.isArray(wishlistData.items) ? wishlistData.items.length : 0)
        setSavedSearches(Array.isArray(savedSearchData.searches) ? savedSearchData.searches : [])
        setDigest(digestData.digest ?? null)
        setRewards(rewardsData.rewards ?? null)
        setStoreCredit(creditData.storeCredit ?? null)
      })
      .catch(() => {
        setOrders([])
        setCartCount(0)
        setWishlistCount(0)
        setSavedSearches([])
        setDigest(null)
        setRewards(null)
        setStoreCredit(null)
      })
  }, [status])

  const repeatBuyerScore = useMemo(() => {
    return orders.length * 12 + cartCount * 4 + wishlistCount * 2 + (savedSearches.filter((item) => item.hasNewResults).length * 5)
  }, [orders.length, cartCount, wishlistCount, savedSearches])

  const accountCampaigns = storefrontConfig ? getMatchingCampaigns(storefrontConfig.campaigns, { page: 'account' }) : []
  const accountIntentPresets = storefrontConfig ? getMatchingIntentPresets(storefrontConfig.intentPresets, 'account') : []

  if (status === 'loading') {
    return (
      <div className="flex min-h-[45vh] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your customer workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_48%,#0f766e_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Customer command center</p>
          <h2 className="mt-3 text-4xl font-black text-white">Welcome back, {session?.user?.name ?? 'Buyer'}</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            This workspace keeps orders, saved intent, rewards, alerts, support, and account controls in one professional buyer flow.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Orders', value: orders.length, hint: 'tracked purchases' },
              { label: 'Wishlist', value: wishlistCount, hint: 'saved products' },
              { label: 'Rewards', value: rewards?.summary.availablePoints ?? 0, hint: `${rewards?.summary.currentTier ?? 'BRONZE'} tier` },
              { label: 'Wallet', value: formatCurrency(storeCredit?.balance ?? 0), hint: 'available credit' },
            ].map((item) => (
              <article key={item.label} className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-xs text-white/60">{item.hint}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Buyer health</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{repeatBuyerScore}</p>
            <p className="mt-2 text-sm text-slate-500">Combined signal from orders, cart momentum, wishlist intent, and saved-search activity.</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Action queue</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>Unread alerts</span>
                <span className="font-bold text-slate-900">{digest?.summary.unreadAlerts ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>Search updates</span>
                <span className="font-bold text-slate-900">{savedSearches.filter((item) => item.hasNewResults).length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>Expiring credit</span>
                <span className="font-bold text-slate-900">{formatCurrency(storeCredit?.expiringSoonBalance ?? 0)}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { href: '/products', label: 'Browse products', note: 'Continue storefront discovery', tone: 'from-sky-500 to-blue-600' },
          { href: '/dashboard/orders', label: 'Manage orders', note: 'Track shipments and invoices', tone: 'from-cyan-500 to-sky-600' },
          { href: '/dashboard/rewards', label: 'Claim rewards', note: 'Redeem loyalty value', tone: 'from-emerald-500 to-teal-600' },
          { href: '/dashboard/support', label: 'Open support', note: 'Help center and service desk', tone: 'from-indigo-500 to-violet-600' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br ${action.tone} text-sm font-black text-white`}>
              {action.label.charAt(0)}
            </div>
            <p className="mt-4 text-lg font-black text-slate-950">{action.label}</p>
            <p className="mt-2 text-sm text-slate-500">{action.note}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.9rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="text-xl font-black text-slate-950">Recent orders</h3>
              <p className="text-sm text-slate-500">Keep the next post-purchase actions close.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-blue-600 hover:underline">
              View all orders
            </Link>
          </div>
          <div className="p-4">
            {orders.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No orders yet. <Link href="/products" className="font-semibold text-blue-600 hover:underline">Browse the catalog</Link>.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 4).map((order) => (
                  <article key={order.id} className="rounded-[1.35rem] border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-bold text-slate-950 hover:text-blue-600">
                          Order {order.id.slice(0, 8)}...
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {order.status}
                        </span>
                        <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(order.total)}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {order.items?.[0]?.product?.name ?? 'Order'}{order.items.length > 1 ? ` and ${order.items.length - 1} more item(s)` : ''}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-950">Retention overview</h3>
                <p className="text-sm text-slate-500">Loyalty, discovery, and wallet signals in one block.</p>
              </div>
              <Link href="/dashboard/digest" className="text-sm font-semibold text-blue-600 hover:underline">Open digest</Link>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-slate-500">Saved-search changes</p>
                <p className="mt-1 text-lg font-black text-slate-950">{digest?.summary.savedSearchesWithNewResults ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-slate-500">Claimable reward coupons</p>
                <p className="mt-1 text-lg font-black text-slate-950">{rewards?.summary.availableRewardClaims ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-slate-500">Current cart value</p>
                <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(digest?.summary.cartValue ?? 0)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black text-slate-950">Account lanes</h3>
            <div className="mt-4 grid gap-3">
              {[
                { href: '/dashboard/profile', title: 'Profile and identity', desc: 'Keep account details and preferences current.' },
                { href: '/dashboard/store-credit', title: 'Wallet and gift certificates', desc: 'Manage balance, redemptions, and gift sends.' },
                { href: '/dashboard/notifications', title: 'Notifications and digest', desc: 'Control buyer alert cadence and channels.' },
                { href: '/dashboard/privacy', title: 'Privacy and security', desc: 'Review consent, export, and sensitive account controls.' },
              ].map((lane) => (
                <Link key={lane.href} href={lane.href} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100">
                  <p className="text-sm font-bold text-slate-950">{lane.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{lane.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      {accountIntentPresets.length > 0 && (
        <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Buyer modes</h3>
              <p className="text-sm text-slate-500">Shortcuts for the most common repeat-buyer journeys.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {accountIntentPresets.slice(0, 3).map((preset) => (
              <Link key={preset.slug} href={preset.href} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                <p className="text-lg font-black text-slate-950">{preset.title}</p>
                <p className="mt-2 text-sm text-slate-500">{preset.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {accountCampaigns.length > 0 && (
        <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Live campaigns in your account flow</h3>
              <p className="text-sm text-slate-500">Marketplace merchandising stays connected even after checkout.</p>
            </div>
            <Link href="/products" className="text-sm font-semibold text-blue-600 hover:underline">
              Return to storefront
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {accountCampaigns.slice(0, 3).map((campaign) => (
              <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{campaign.eyebrow}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{campaign.title}</p>
                <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
