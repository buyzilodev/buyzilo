import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { getVendorOrdersData } from '@/lib/queries/vendor/dashboard'
import { StatusBadge } from '@/components/admin/StatusBadge'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function VendorOrdersPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Orders" subtitle="Authentication required">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Please sign in to view vendor orders.</p>
      </VendorLayout>
    )
  }

  const data = await getVendorOrdersData(userId)
  if (!data) {
    return (
      <VendorLayout title="Orders" subtitle="Store setup required">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Create a store to receive orders.</p>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout title="Orders" subtitle={`Orders for ${data.store.name}`}>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-3">Order</th>
                <th className="pb-3">Buyer</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Document</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-3 font-mono text-xs text-slate-700">{order.id.slice(0, 12)}...</td>
                  <td className="py-3 text-slate-700">{order.buyer?.name ?? order.buyer?.email ?? 'Guest'}</td>
                  <td className="py-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-slate-600">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="py-3 font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                  <td className="py-3"><StatusBadge status={order.status} /></td>
                  <td className="py-3">
                    <a
                      href={`/api/vendor/orders/${order.id}/invoice`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Invoice
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.orders.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No orders yet.</p>}
        </div>
      </article>
    </VendorLayout>
  )
}
