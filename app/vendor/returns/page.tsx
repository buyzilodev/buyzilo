import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function VendorReturnsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Returns" subtitle="Authentication required">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Please sign in to view return requests.</p>
      </VendorLayout>
    )
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) {
    return (
      <VendorLayout title="Returns" subtitle="Store setup required">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Create a store to receive return requests.</p>
      </VendorLayout>
    )
  }

  const requests = await prisma.returnRequest.findMany({
    where: { storeId: store.id },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true } },
      orderItem: {
        include: {
          product: { select: { name: true } },
          variant: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <VendorLayout title="Returns" subtitle="Customer return requests for your products">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No return requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{request.reason}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{request.status}</span>
                </div>
                <p className="mt-1 text-slate-500">Order {request.order.id} | Buyer {request.user?.name ?? request.user?.email ?? 'Unknown'}</p>
                {request.orderItem?.product?.name && (
                  <p className="mt-1 text-slate-600">
                    Item: {request.orderItem.product.name}{request.orderItem.variant?.title ? ` (${request.orderItem.variant.title})` : ''} | Qty: {request.quantity}
                  </p>
                )}
                {request.details && <p className="mt-1 text-slate-600">{request.details}</p>}
                <p className="mt-1 text-xs text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </VendorLayout>
  )
}
