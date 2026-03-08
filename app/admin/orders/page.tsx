import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { OrderStatusControl } from '@/components/admin/OrderStatusControl'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminOrderSubsections } from '@/components/admin/subsections'
import { requireAdminPermission } from '@/lib/admin/guards'
import { ORDER_STATUSES } from '@/lib/constants/statuses'
import { getAdminOrders } from '@/lib/queries/admin/management'

const statuses = ORDER_STATUSES

type AdminOrdersPageProps = {
  searchParams?: {
    status?: string
  }
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdminPermission('manage_orders')
  const status = searchParams?.status
  const data = await getAdminOrders(status)

  const openCount = data.orders.filter((order) => ['PENDING', 'PROCESSING'].includes(order.status)).length
  const completeCount = data.orders.filter((order) => ['SHIPPED', 'DELIVERED'].includes(order.status)).length
  const totalValue = data.orders.reduce((sum, order) => sum + order.total, 0)
  const returnAttention = data.orders.filter((order) => order.openReturnCount > 0).length

  return (
    <AdminLayout title="Orders" subtitle="Manage and update order lifecycle">
      <SubsectionNav items={adminOrderSubsections} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Visible Orders" value={String(data.orders.length)} hint="Current filtered results" />
        <StatCard label="Open Orders" value={String(openCount)} hint="Pending and processing" />
        <StatCard label="Complete Orders" value={String(completeCount)} hint="Delivered and shipped" />
        <StatCard label="Return Attention" value={String(returnAttention)} hint="Orders with active return handling" />
      </div>

      <div className="mt-4">
        <StatCard label="Order Value" value={`$${totalValue.toFixed(2)}`} hint="Sum of visible orders" />
      </div>

      <div className="mt-4">
        <Section title="Order Operations" subtitle="Fast entry points for the main fulfillment and support queues">
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/admin/orders/shipments" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Shipment queue
            </Link>
            <Link href="/admin/orders/returns" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              Returns queue
            </Link>
            <Link href="/admin/orders/call-requests" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Support desk
            </Link>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="All Orders" subtitle={`Total in dataset: ${data.total}`}>
          <form method="GET" className="mb-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Status
              <select name="status" defaultValue={status ?? ''} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
                <option value="">All</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                Apply
              </button>
              {status && (
                <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">
                  Clear
                </Link>
              )}
            </label>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Buyer</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Operations</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="py-3 font-mono text-xs text-blue-700">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        {order.id.slice(0, 12)}...
                      </Link>
                    </td>
                    <td className="py-3 text-slate-700">{order.buyer?.name ?? order.buyer?.email ?? order.buyerEmail ?? 'Guest'}</td>
                    <td className="py-3 text-slate-500">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-slate-600">{order.itemCount}</td>
                    <td className="py-3">
                      <div className="flex max-w-72 flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {order.storeCount} {order.storeCount === 1 ? 'store' : 'stores'}
                        </span>
                        {order.shipmentCount > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            Shipments {order.shipmentCount}
                          </span>
                        ) : null}
                        {order.openReturnCount > 0 ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Returns {order.openReturnCount}
                          </span>
                        ) : null}
                        {order.isMultiVendor ? (
                          <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">
                            Multi-vendor
                          </span>
                        ) : null}
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                          Payment {order.paymentStatus}
                        </span>
                      </div>
                      {order.stores.length > 0 ? (
                        <p className="mt-2 max-w-72 text-xs text-slate-500">
                          {order.stores.slice(0, 2).join(', ')}
                          {order.stores.length > 2 ? ` +${order.stores.length - 2} more` : ''}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 font-semibold text-slate-900">${order.total.toFixed(2)}</td>
                    <td className="py-3"><StatusBadge status={order.status} /></td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusControl orderId={order.id} currentStatus={order.status} />
                        <Link href={`/admin/orders/${order.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Open
                        </Link>
                        {order.needsFulfillment ? (
                          <Link href="/admin/orders/shipments" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                            Shipments
                          </Link>
                        ) : null}
                        {order.openReturnCount > 0 ? (
                          <Link href="/admin/orders/returns" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            Returns
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.orders.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No orders found.</p>}
          </div>
        </Section>
      </div>
    </AdminLayout>
  )
}
