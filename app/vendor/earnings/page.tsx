import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { getVendorOverviewData } from '@/lib/queries/vendor/dashboard'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function VendorEarningsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Earnings" subtitle="Authentication required">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Please sign in to view earnings.</p>
      </VendorLayout>
    )
  }

  const data = await getVendorOverviewData(userId)
  if (!data) {
    return (
      <VendorLayout title="Earnings" subtitle="Store setup required">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Create a store to start earning.</p>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout title="Earnings" subtitle="Revenue and payout snapshot">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Total Sales</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(data.totalSales)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Pending Payout</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(data.store.pendingPayout)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Total Earned</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(data.store.totalEarned)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Category Fee Exposure</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(data.categoryFeeExposure ?? 0)}</p>
        </article>
      </div>

      <article className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Latest Order Earnings</h2>
        <div className="mt-3 space-y-2">
          {data.orders.slice(0, 8).map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700">{order.id.slice(0, 8)}...</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.total)}</span>
            </div>
          ))}
          {data.orders.length === 0 && <p className="text-sm text-slate-500">No earning events yet.</p>}
        </div>
      </article>
    </VendorLayout>
  )
}
