'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getMatchingCampaigns, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'

const statusColors: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  SHIPPED: 'bg-sky-50 text-sky-700',
  PROCESSING: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
  REFUNDED: 'bg-slate-100 text-slate-700',
}

type OrderItem = {
  quantity: number
  price: number
  product: { name: string; slug: string; images: string[] }
}

type Order = {
  id: string
  status: string
  total: number
  createdAt: string
  items: OrderItem[]
}

type PublicSettingsResponse = {
  storefrontConfig?: StorefrontConfig | null
}

type OrdersResponse = {
  orders?: Order[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function DashboardOrdersPage() {
  const { status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const accountCampaigns = storefrontConfig ? getMatchingCampaigns(storefrontConfig.campaigns, { page: 'account' }) : []

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    void Promise.all([
      fetch('/api/settings/public').then(async (res): Promise<PublicSettingsResponse> => {
        if (!res.ok) {
          return {}
        }
        return await res.json() as PublicSettingsResponse
      }),
      fetch('/api/orders').then(async (res): Promise<OrdersResponse> => {
        if (!res.ok) {
          return { orders: [] }
        }
        return await res.json() as OrdersResponse
      }),
    ])
      .then(([settingsData, ordersData]) => {
        setStorefrontConfig(settingsData.storefrontConfig ?? null)
        setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : [])
      })
      .catch(() => {
        setStorefrontConfig(null)
        setOrders([])
      })
      .finally(() => setLoading(false))
  }, [status, router])

  const orderStats = useMemo(() => ({
    total: orders.length,
    delivered: orders.filter((order) => order.status === 'DELIVERED').length,
    open: orders.filter((order) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)).length,
    spend: orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
  }), [orders])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <p className="text-sm text-slate-500">Loading your order workspace...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Order workspace</p>
          <h2 className="mt-3 text-4xl font-black">Everything after checkout stays connected</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Track fulfillment, jump into invoices and returns, and move directly from completed purchases into support or repeat-buy actions.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Orders</p>
              <p className="mt-1 text-2xl font-black text-white">{orderStats.total}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Open</p>
              <p className="mt-1 text-2xl font-black text-white">{orderStats.open}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Delivered</p>
              <p className="mt-1 text-2xl font-black text-white">{orderStats.delivered}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Spend</p>
              <p className="mt-1 text-2xl font-black text-white">{formatCurrency(orderStats.spend)}</p>
            </article>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Link href="/dashboard/support" className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Need help with an order?</p>
            <p className="mt-2 text-sm text-slate-500">Open support, ask for a callback, or move directly into the help center.</p>
          </Link>
          <Link href="/dashboard/store-credit" className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Post-refund wallet flow</p>
            <p className="mt-2 text-sm text-slate-500">Keep store credit and gift certificate activity close to your purchase history.</p>
          </Link>
        </div>
      </section>

      {accountCampaigns.length > 0 && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Campaigns for returning buyers</h3>
              <p className="text-sm text-slate-500">Relevant merchandising stays visible after checkout.</p>
            </div>
            <Link href="/products" className="text-sm font-semibold text-blue-600 hover:underline">
              Browse storefront
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {accountCampaigns.slice(0, 3).map((campaign) => (
              <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{campaign.eyebrow}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{campaign.title}</p>
                <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading orders...</div>
      ) : orders.length === 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Orders</p>
          <p className="mt-3 text-4xl font-black text-slate-950">No purchases yet</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            Once you place your first order, this workspace will track shipments, invoices, returns, and post-purchase support.
          </p>
          <Link href="/products" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Browse products
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-black text-slate-950 hover:text-blue-600">
                    Order {order.id.slice(0, 8)}...
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {order.status}
                  </span>
                  <p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(order.total)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  {order.items.slice(0, 4).map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">{item.product?.name} x {item.quantity}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {order.items.length > 4 ? (
                    <p className="text-xs font-semibold text-slate-400">+ {order.items.length - 4} more item(s)</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col">
                  <Link href={`/dashboard/orders/${order.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Open details
                  </Link>
                  <Link href="/dashboard/support" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Get help
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
