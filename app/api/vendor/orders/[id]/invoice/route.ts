import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildInvoiceDocument, createInvoiceHtmlResponse } from '@/lib/helpers/pdfDocuments'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({
    where: { vendorId: userId },
    select: { id: true, name: true },
  })

  if (!store) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      items: {
        some: {
          product: { storeId: store.id },
        },
      },
    },
    include: {
      buyer: { select: { name: true, email: true } },
      items: {
        where: {
          product: { storeId: store.id },
        },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              store: { select: { name: true } },
            },
          },
          variant: { select: { title: true } },
        },
      },
      shipments: {
        select: {
          status: true,
          carrier: true,
          trackingNumber: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const vendorSubtotal = Number(order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
  const html = buildInvoiceDocument({
    title: 'Vendor Invoice Copy',
    subtitle: `${store.name} order lines`,
    totalOverride: vendorSubtotal,
    includeShipping: false,
    note: 'This vendor invoice includes only the line items fulfilled by your store. Marketplace shipping and other store items are excluded.',
    order: {
      id: order.id,
      status: order.status,
      total: vendorSubtotal,
      shippingAmount: 0,
      shippingMethodLabel: order.shippingMethodLabel,
      buyerName: order.buyer?.name,
      buyerEmail: order.buyer?.email ?? order.buyerEmail,
      createdAt: order.createdAt,
      shippingAddress: order.shippingAddress,
      shipments: order.shipments,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantTitle: item.variant?.title ?? item.variantLabel,
        storeName: item.product.store.name,
      })),
    },
  })

  return createInvoiceHtmlResponse(`buyzilo-vendor-order-${order.id}.html`, html)
}
