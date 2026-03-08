import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminOrderSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminLiveCartsPage() {
  const carts = await prisma.cart
    .findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    .catch(() => [])

  const activeCarts = carts.filter((cart) => cart._count.items > 0)

  return (
    <AdminLayout title="Live Carts" subtitle="Monitor active customer shopping carts">
      <SubsectionNav items={adminOrderSubsections} />

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Active Carts</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {activeCarts.length} carts with items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2">Customer</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Last Updated</th>
                <th className="pb-2">Profile</th>
              </tr>
            </thead>
            <tbody>
              {activeCarts.map((cart) => (
                <tr key={cart.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{cart.user?.name ?? cart.user?.email ?? 'Unknown user'}</td>
                  <td className="py-2 text-slate-700">{cart._count.items}</td>
                  <td className="py-2 text-slate-600">{new Date(cart.updatedAt).toLocaleString()}</td>
                  <td className="py-2">
                    <Link href={`/admin/customers/${cart.userId}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      Open customer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeCarts.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No active carts at this time.</p>}
        </div>
      </article>
    </AdminLayout>
  )
}
