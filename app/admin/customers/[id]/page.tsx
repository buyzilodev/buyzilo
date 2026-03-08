import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { getGdprDeletionRequest } from '@/lib/actions/gdpr'
import { prisma } from '@/lib/prisma'

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      supportRequests: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      returnRequests: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      addresses: true,
      userGroupMemberships: {
        include: { group: true },
      },
    },
  })
  if (!user) notFound()
  const gdprRequest = await getGdprDeletionRequest(user.id)
  const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0)

  return (
    <AdminLayout title="Customer Details" subtitle={user.email}>
      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <Section title="Account Actions" subtitle="Direct admin routes for this customer">
          <div className="space-y-3 text-sm">
            <Link href="/admin/orders" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
              Open orders
            </Link>
            <Link href="/admin/customers/message-center" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
              Open message center
            </Link>
            <Link href="/admin/customers/privacy" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50">
              Open privacy queue
            </Link>
          </div>
        </Section>

        <Section title="Account Signals" subtitle="Order, support, and privacy posture">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Orders {user.orders.length}
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Support {user.supportRequests.length}
            </span>
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
              Returns {user.returnRequests.length}
            </span>
            {gdprRequest ? (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${gdprRequest.status === 'REQUESTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                GDPR {gdprRequest.status}
              </span>
            ) : null}
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Lifetime spend: ${totalSpent.toFixed(2)}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Profile</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Name:</span> {user.name ?? 'Unnamed user'}</p>
            <p><span className="text-slate-500">Email:</span> {user.email}</p>
            <p><span className="text-slate-500">Role:</span> <StatusBadge status={user.role} /></p>
            <p><span className="text-slate-500">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
            <p><span className="text-slate-500">Addresses:</span> {user.addresses.length}</p>
            <p><span className="text-slate-500">User Groups:</span> {user.userGroupMemberships.length}</p>
            {gdprRequest ? <p><span className="text-slate-500">GDPR Request:</span> {gdprRequest.status}</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Order History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">Order</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {order.id.slice(0, 10)}...
                      </Link>
                    </td>
                    <td className="py-2 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 text-slate-600">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="py-2 font-semibold text-slate-900">${order.total.toFixed(2)}</td>
                    <td className="py-2"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {user.orders.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No orders found for this customer.</p>}
          </div>
        </article>
      </div>
    </AdminLayout>
  )
}
