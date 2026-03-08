import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatStoreLocatorLine, getStoreLocatorMeta } from '@/lib/actions/storeLocator'
import { getVendorRatingSummary } from '@/lib/actions/vendorRatings'
import { getVendorTermsAcceptance, getVendorTermsConfig } from '@/lib/actions/vendorTerms'
import { prisma } from '@/lib/prisma'

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, email: true } },
      products: {
        select: { id: true, name: true, slug: true, price: true, stock: true, approvalStatus: true },
        orderBy: { createdAt: 'desc' },
        take: 80,
      },
      payouts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      returnRequests: {
        where: { status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED'] } },
        select: { id: true },
      },
      supportRequests: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        select: { id: true },
      },
    },
  })
  if (!store) notFound()

  const productIds = store.products.map((product) => product.id)
  const orderItems = productIds.length
    ? await prisma.orderItem.findMany({ where: { productId: { in: productIds } }, select: { quantity: true, price: true } })
    : []
  const salesTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const [vendorTermsConfig, vendorTermsAcceptance] = await Promise.all([
    getVendorTermsConfig(),
    getVendorTermsAcceptance(store.vendor.id),
  ])
  const vendorRating = await getVendorRatingSummary(store.id)
  const locator = await getStoreLocatorMeta(store.id)
  const pendingPayoutAmount = store.payouts
    .filter((payout) => payout.status === 'REQUESTED')
    .reduce((sum, payout) => sum + payout.amount, 0)
  const lowStockProducts = store.products.filter((product) => product.stock <= 5).length
  const pendingProducts = store.products.filter((product) => product.approvalStatus === 'PENDING').length

  return (
    <AdminLayout title="Vendor Details" subtitle={store.name}>
      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <Section title="Intervention Shortcuts" subtitle="Direct admin routes for this vendor">
          <div className="space-y-3 text-sm">
            <Link href="/admin/vendors/accounting" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50">
              Open accounting
            </Link>
            <Link href="/admin/vendors/message-center" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
              Open vendor messages
            </Link>
            <Link href="/admin/vendors/procurement" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
              Open procurement
            </Link>
            <Link href={`/store/${store.slug}`} className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
              Preview storefront
            </Link>
          </div>
        </Section>

        <Section title="Store Health" subtitle="Risk and operational posture">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {store.products.length} products
            </span>
            {pendingProducts > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Pending products {pendingProducts}
              </span>
            ) : null}
            {lowStockProducts > 0 ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                Low stock {lowStockProducts}
              </span>
            ) : null}
            {store.supportRequests.length > 0 ? (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                Support {store.supportRequests.length}
              </span>
            ) : null}
            {store.returnRequests.length > 0 ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                Returns {store.returnRequests.length}
              </span>
            ) : null}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Store Profile</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Owner:</span> {store.vendor.name ?? store.vendor.email}</p>
            <p><span className="text-slate-500">Slug:</span> /{store.slug}</p>
            <p><span className="text-slate-500">Status:</span> <StatusBadge status={store.status} /></p>
            {store.moderationNote && <p><span className="text-slate-500">Review Note:</span> {store.moderationNote}</p>}
            <p><span className="text-slate-500">Commission:</span> {store.commissionRate}%</p>
            <p><span className="text-slate-500">Sales:</span> ${salesTotal.toFixed(2)}</p>
            <p><span className="text-slate-500">Pending Payout:</span> ${store.pendingPayout.toFixed(2)}</p>
            <p><span className="text-slate-500">Requested Payouts:</span> ${pendingPayoutAmount.toFixed(2)}</p>
            <p><span className="text-slate-500">Stripe:</span> {store.stripeAccountId ? 'Connected' : 'Missing connection'}</p>
            <p>
              <span className="text-slate-500">Vendor Rating:</span>{' '}
              {vendorRating.averageRating != null ? `${vendorRating.averageRating}/5` : 'No rating yet'} ({vendorRating.reviewCount} reviews)
            </p>
            {formatStoreLocatorLine(locator) && <p><span className="text-slate-500">Location:</span> {formatStoreLocatorLine(locator)}</p>}
            {vendorTermsConfig.enabled ? (
              <p>
                <span className="text-slate-500">Vendor Terms:</span>{' '}
                {vendorTermsAcceptance
                  ? `Accepted ${vendorTermsAcceptance.version} on ${new Date(vendorTermsAcceptance.acceptedAt).toLocaleDateString()}`
                  : 'No acceptance recorded'}
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Stock</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {store.products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link href={`/products/${product.slug}`} className="font-medium text-blue-600 hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-700">${product.price.toFixed(2)}</td>
                    <td className="py-2 text-slate-700">{product.stock}</td>
                    <td className="py-2"><StatusBadge status={product.approvalStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {store.products.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No products for this vendor.</p>}
          </div>
        </article>
      </div>
    </AdminLayout>
  )
}
