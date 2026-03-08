import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildInvoiceDocument, createInvoiceHtmlResponse } from '@/lib/helpers/pdfDocuments'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id },
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
    title: 'Admin Invoice Copy',
    subtitle: 'Marketplace order invoice',
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

  return createInvoiceHtmlResponse(`buyzilo-admin-order-${order.id}.html`, html)
}
