import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminVendorSubsections } from '@/components/admin/subsections'
import { VendorStatusControl } from '@/components/admin/VendorStatusControl'
import { requireAdminPermission } from '@/lib/admin/guards'
import { getAdminVendors } from '@/lib/queries/admin/management'

type AdminVendorsPageProps = {
  searchParams?: {
    status?: string
  }
}

export default async function AdminVendorsPage({ searchParams }: AdminVendorsPageProps) {
  await requireAdminPermission('manage_vendors')
  const status = searchParams?.status
  const stores = await getAdminVendors(status)

  const pending = stores.filter((store) => store.status === 'PENDING').length
  const approved = stores.filter((store) => store.status === 'APPROVED').length
  const payoutAttention = stores.filter((store) => store.requestedPayoutAmount > 0).length

  return (
    <AdminLayout title="Vendors" subtitle="Manage seller stores and approval state">
      <SubsectionNav items={adminVendorSubsections} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Visible Vendors" value={String(stores.length)} hint="Filtered store list" />
        <StatCard label="Pending Approval" value={String(pending)} hint="Require review" />
        <StatCard label="Approved" value={String(approved)} hint="Active storefronts" />
        <StatCard label="Payout Attention" value={String(payoutAttention)} hint="Stores with requested payout volume" />
      </div>

      <div className="mt-4">
        <Section title="Vendor Operations" subtitle="Quick entry points for onboarding, settlement, and communication">
          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/admin/vendors/accounting" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              Accounting
            </Link>
            <Link href="/admin/vendors/procurement" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Procurement
            </Link>
            <Link href="/admin/vendors/message-center" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Message center
            </Link>
            <Link href="/admin/plans" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Vendor plans
            </Link>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Vendor Stores" subtitle="Approve, ban, and monitor store status">
          <form method="GET" className="mb-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Status
              <select name="status" defaultValue={status ?? ''} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="BANNED">BANNED</option>
              </select>
              <button type="submit" className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                Apply
              </button>
              {status && (
                <Link href="/admin/vendors" className="text-xs text-blue-600 hover:underline">
                  Clear
                </Link>
              )}
            </label>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Store</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Rating</th>
                  <th className="pb-3">Store Health</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <Link href={`/admin/vendors/${store.id}`} className="font-semibold text-blue-600 hover:underline">
                        {store.name}
                      </Link>
                      <p className="text-xs text-slate-500">/{store.slug}</p>
                    </td>
                    <td className="py-3 text-slate-700">{store.vendor?.name ?? store.vendor?.email}</td>
                    <td className="py-3 text-slate-700">
                      {store.rating.averageRating != null ? `${store.rating.averageRating}/5` : 'No rating'}
                      <p className="text-xs text-slate-500">{store.rating.reviewCount} reviews</p>
                    </td>
                    <td className="py-3">
                      <div className="flex max-w-72 flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          Products {store.productCount}
                        </span>
                        {store.pendingProducts > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Pending {store.pendingProducts}
                          </span>
                        ) : null}
                        {store.lowStockProducts > 0 ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Low stock {store.lowStockProducts}
                          </span>
                        ) : null}
                        {store.requestedPayoutAmount > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Payout ${store.requestedPayoutAmount.toFixed(0)}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${store.stripeReady ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {store.stripeReady ? 'Stripe ready' : 'Stripe missing'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500">{new Date(store.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <StatusBadge status={store.status} />
                      {store.moderationNote && <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{store.moderationNote}</p>}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <VendorStatusControl storeId={store.id} currentStatus={store.status} />
                        <Link href={`/admin/vendors/${store.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Open
                        </Link>
                        {store.requestedPayoutAmount > 0 ? (
                          <Link href="/admin/vendors/accounting" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                            Accounting
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stores.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No vendors found.</p>}
          </div>
        </Section>
      </div>
    </AdminLayout>
  )
}
