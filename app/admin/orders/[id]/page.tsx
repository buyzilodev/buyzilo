import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { OrderStatusControl } from '@/components/admin/OrderStatusControl'
import { Section } from '@/components/admin/Section'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { prisma } from '@/lib/prisma'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              store: { select: { id: true, name: true } },
            },
          },
        },
      },
      payment: true,
      shipments: {
        include: {
          warehouse: { select: { name: true } },
        },
      },
      returnRequests: true,
      supportRequests: true,
    },
  })

  if (!order) notFound()

  return (
    <AdminLayout title="Order Details" subtitle={`Order ${order.id}`}>
      <div className="mb-4 grid gap-4 xl:grid-cols-4">
        <Section title="Order Operations" subtitle="Direct admin follow-up actions for this order">
          <div className="space-y-3 text-sm">
            <Link
              href={`/api/admin/orders/${order.id}/invoice`}
              target="_blank"
              className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print invoice
            </Link>
            <Link href="/admin/orders/shipments" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
              Open shipment queue
            </Link>
            <Link href="/admin/orders/returns" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50">
              Open returns queue
            </Link>
            <Link href="/admin/orders/call-requests" className="block rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
              Open support desk
            </Link>
          </div>
        </Section>

        <Section title="Order Signals" subtitle="Operational posture across fulfillment, support, and returns">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {order.items.length} items
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {order.shipments.length} shipments
            </span>
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
              {order.returnRequests.length} returns
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              {order.supportRequests.length} support threads
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              Payment {order.payment?.status ?? 'UNPAID'}
            </span>
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Buyer: {order.buyer?.name ?? order.buyer?.email ?? order.buyerEmail ?? 'Guest'}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Items</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <Link href={`/products/${item.product.slug}`} className="font-semibold text-blue-600 hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.product.store.name}</p>
                </div>
                <p className="text-slate-600">x {item.quantity}</p>
                <p className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-slate-900">${order.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Shipping</span>
              <span className="font-semibold text-slate-900">
                {order.shippingMethodLabel ?? 'Not set'} (${order.shippingAmount.toFixed(2)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Buyer</span>
              <span className="font-semibold text-slate-900">{order.buyer?.name ?? order.buyer?.email ?? order.buyerEmail ?? 'Guest'}</span>
            </div>
            {order.shipments.length > 0 ? (
              <div className="space-y-2">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Shipment: {shipment.status}</span>
                      {shipment.warehouse?.name ? <span>{shipment.warehouse.name}</span> : null}
                    </div>
                    {shipment.trackingNumber ? <div className="mt-1">Tracking: {shipment.trackingNumber}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="pt-2">
              <OrderStatusControl orderId={order.id} currentStatus={order.status} />
            </div>
          </div>
        </article>
      </div>
    </AdminLayout>
  )
}
