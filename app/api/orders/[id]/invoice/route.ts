import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildInvoiceDocument, createInvoiceHtmlResponse } from '@/lib/helpers/pdfDocuments'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const requestUrl = new URL(request.url)
  const sessionId = requestUrl.searchParams.get('session_id')
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId && !sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      OR: [
        ...(userId ? [{ buyerId: userId }] : []),
        ...(sessionId ? [{ stripeSessionId: sessionId }] : []),
      ],
    },
    include: {
      buyer: { select: { name: true, email: true } },
      items: {
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

  const html = buildInvoiceDocument({
    title: 'Order Invoice',
    subtitle: 'Printable order invoice',
    order: {
      id: order.id,
      status: order.status,
      total: order.total,
      shippingAmount: order.shippingAmount,
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

  return createInvoiceHtmlResponse(`buyzilo-order-${order.id}.html`, html)
}
