import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { getVendorOverviewData } from '@/lib/queries/vendor/dashboard'
import { StatusBadge } from '@/components/admin/StatusBadge'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function VendorDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Vendor Dashboard" subtitle="Authentication required">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Please sign in to access your vendor dashboard.
        </div>
      </VendorLayout>
    )
  }

  const data = await getVendorOverviewData(userId)
  if (!data) {
    return (
      <VendorLayout title="Vendor Dashboard" subtitle="Store setup required">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">You do not have a store yet.</p>
          <Link href="/vendor/settings" className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Create Store
          </Link>
        </div>
      </VendorLayout>
    )
  }

  const recentOrders = data.orders.slice(0, 8)

  return (
    <VendorLayout title="Overview" subtitle={`Store: ${data.store.name}`}>
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Sales</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(data.totalSales)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Orders</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{data.orderCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Products</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{data.productCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending Products</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{data.pendingProductCount}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Recent Orders</h2>
            <Link href="/vendor/orders" className="text-xs font-semibold text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">Order</th>
                  <th className="pb-2">Buyer</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-700">{order.id.slice(0, 8)}...</td>
                    <td className="py-2 text-slate-700">{order.buyer?.name ?? order.buyer?.email ?? 'Guest'}</td>
                    <td className="py-2 font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                    <td className="py-2"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-500">No orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Store Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Approval</span>
              <StatusBadge status={data.store.status} />
            </div>
            {data.store.moderationNote && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {data.store.moderationNote}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Approved Products</span>
              <span className="font-semibold text-slate-900">{data.approvedProductCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-slate-600">Pending Payout</span>
              <span className="font-semibold text-slate-900">{formatCurrency(data.store.pendingPayout)}</span>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Procurement Alerts</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <span className="text-rose-700">Overdue purchase orders</span>
              <span className="font-semibold text-rose-800">{data.overdueProcurement}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-amber-700">Procurement message threads</span>
              <span className="font-semibold text-amber-800">{data.procurementAlertThreads}</span>
            </div>
            <Link href="/vendor/procurement" className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Open procurement
            </Link>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Admin Follow-Up</h2>
          <div className="space-y-2 text-sm">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              Escalated procurement issues appear in your vendor messages inbox so you can reply without leaving the dashboard workflow.
            </p>
            <Link href="/vendor/messages" className="inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
              Open messages
            </Link>
          </div>
        </article>
      </div>
    </VendorLayout>
  )
}
