import Link from 'next/link'
import FacebookPixelPurchase from '@/components/marketing/FacebookPixelPurchase'
import { getMatchingCampaigns, getMatchingIntentPresets, parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { getOrderDigitalDelivery } from '@/lib/actions/digitalDownloads'
import { prisma } from '@/lib/prisma'

type OrderSuccessPageProps = {
  searchParams?: {
    session_id?: string
    order_id?: string
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function OrderSuccessPage({ searchParams }: OrderSuccessPageProps) {
  const sessionId = searchParams?.session_id
  const orderId = searchParams?.order_id
  const [order, storefrontConfig] = await Promise.all([
    sessionId
      ? prisma.order.findUnique({
          where: { stripeSessionId: sessionId },
          include: {
            items: {
              include: {
                product: { select: { name: true, slug: true } },
              },
            },
          },
        })
      : orderId
        ? prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: {
                include: {
                  product: { select: { name: true, slug: true } },
                },
              },
            },
          })
        : Promise.resolve(null),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
  ])
  const successCampaigns = getMatchingCampaigns(storefrontConfig.campaigns, { page: 'order-success' })
  const successIntentPresets = getMatchingIntentPresets(storefrontConfig.intentPresets, 'order-success')
  const digitalDelivery = order ? await getOrderDigitalDelivery(order.id) : []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {order && (
            <FacebookPixelPurchase
              orderId={order.id}
              total={order.total}
              itemCount={order.items.reduce((sum, item) => sum + item.quantity, 0)}
              productIds={order.items.map((item) => item.productId)}
              items={order.items.map((item) => ({
                productId: item.productId,
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
              }))}
            />
          )}

          <div className="mb-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] px-6 py-6 text-left text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Purchase complete</p>
            <h1 className="mt-2 text-3xl font-black">Order Confirmed</h1>
            <p className="mt-2 text-sm text-white/80">Your payment was successful and your order is now being processed.</p>
            {successCampaigns.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {successCampaigns.slice(0, 2).map((campaign) => (
                  <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
                    {campaign.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {successCampaigns.length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Campaigns</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {successCampaigns.slice(0, 2).map((campaign) => (
                  <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{campaign.eyebrow}</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{campaign.title}</p>
                    <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {successIntentPresets.length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Buyer Intent Presets</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {successIntentPresets.slice(0, 2).map((preset) => (
                  <Link key={preset.slug} href={preset.href} className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-100">
                    <p className="text-lg font-bold text-slate-900">{preset.title}</p>
                    <p className="mt-2 text-sm text-slate-500">{preset.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {order ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Order ID</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{order.id}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(order.total)}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Shipping</p>
              <p className="mt-1 text-sm text-slate-700">
                {order.shippingMethodLabel ?? 'Method not available'}{order.shippingAmount ? ` | ${formatCurrency(order.shippingAmount)}` : ' | FREE'}
              </p>

              {order.items.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Items</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product.name} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {digitalDelivery.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Downloads Ready</p>
                  <div className="space-y-2">
                    {digitalDelivery.flatMap((delivery) => delivery.files.map((file, index) => (
                      <a
                        key={`${delivery.orderItemId}-${index}`}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <span>{file.name}</span>
                        <span className="font-semibold text-blue-600">Download</span>
                      </a>
                    )))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              We could not load the payment session details, but your checkout flow completed.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {order && (
              <a
                href={`/api/orders/${order.id}/invoice${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Print Invoice
              </a>
            )}
            <Link href="/dashboard/orders" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              View My Orders
            </Link>
            <Link href="/products" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
