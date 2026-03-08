import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { PayoutActions } from '@/components/vendor/PayoutActions'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function VendorPayoutsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Payouts" subtitle="Authentication required">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Please sign in to manage payouts.</p>
      </VendorLayout>
    )
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) {
    return (
      <VendorLayout title="Payouts" subtitle="Store setup required">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Create your store first to enable payouts.</p>
      </VendorLayout>
    )
  }

  const payouts = await prisma.payout.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const totalPaid = payouts
    .filter((item) => item.status === 'PAID')
    .reduce((sum, item) => sum + item.amount, 0)
  const openRequest = payouts.find((item) => ['REQUESTED', 'APPROVED'].includes(item.status))

  return (
    <VendorLayout title="Payouts" subtitle="Manage withdrawals and payout history">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Earned</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(store.totalEarned)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Pending Payout</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(store.pendingPayout)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Paid Out</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totalPaid)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Stripe</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{store.stripeAccountId ? 'Connected' : 'Not Connected'}</p>
        </article>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Payout Actions</p>
            <p className="text-xs text-slate-500">Connect Stripe first, then submit a payout request for admin review.</p>
          </div>
          <PayoutActions stripeConnected={Boolean(store.stripeAccountId)} pendingPayout={store.pendingPayout} hasOpenRequest={Boolean(openRequest)} />
        </div>
        {openRequest && (
          <p className="mt-3 text-sm text-amber-700">
            Current request: {openRequest.status} for {formatCurrency(openRequest.amount)}
            {openRequest.note ? ` - ${openRequest.note}` : ''}
          </p>
        )}
      </div>

      <article className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Payout History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-3">ID</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-slate-100">
                  <td className="py-3 font-mono text-xs text-slate-700">{payout.id.slice(0, 10)}...</td>
                  <td className="py-3 text-slate-600">{new Date(payout.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 font-semibold text-slate-900">{formatCurrency(payout.amount)}</td>
                  <td className="py-3"><StatusBadge status={payout.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {payouts.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No payouts yet.</p>}
        </div>
      </article>
    </VendorLayout>
  )
}
