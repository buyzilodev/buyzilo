import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOrAppendProcurementAlert } from '@/lib/actions/messages'
import { prisma } from '@/lib/prisma'
import { restockWarehouseInventory } from '@/lib/helpers/warehouses'

async function getVendorContext() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) return null
  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) return null
  return { userId, store }
}

export async function GET() {
  const context = await getVendorContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [suppliers, warehouses, products, purchaseOrders] = await Promise.all([
    prisma.supplier.findMany({
      where: { storeId: context.store.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.warehouse.findMany({
      where: { storeId: context.store.id, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.product.findMany({
      where: { storeId: context.store.id },
      select: {
        id: true,
        name: true,
        variants: {
          select: { id: true, title: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.purchaseOrder.findMany({
      where: { storeId: context.store.id },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  return NextResponse.json({ suppliers, warehouses, products, purchaseOrders })
}

export async function POST(req: Request) {
  const context = await getVendorContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as
    | {
        type?: 'supplier'
        name?: string
        email?: string
        phone?: string
        notes?: string
      }
    | {
        type?: 'purchaseOrder'
        supplierId?: string
        warehouseId?: string
        note?: string
        expectedAt?: string
        items?: Array<{
          productId?: string
          variantId?: string
          quantity?: number
          unitCost?: number
        }>
      }
    | {
        type?: 'receive'
        purchaseOrderId?: string
        note?: string
        items?: Array<{
          id?: string
          quantity?: number
        }>
      }

  if (body.type === 'supplier') {
    const payload = body as Extract<typeof body, { type?: 'supplier' }>
    if (!payload.name?.trim()) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        storeId: context.store.id,
        name: payload.name.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        notes: payload.notes?.trim() || null,
      },
    })
    return NextResponse.json({ success: true, supplier })
  }

  if (body.type === 'purchaseOrder') {
    const payload = body as Extract<typeof body, { type?: 'purchaseOrder' }>
    if (!payload.supplierId || !payload.warehouseId || !Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: 'supplierId, warehouseId, and items are required' }, { status: 400 })
    }

    const [supplier, warehouse] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: payload.supplierId, storeId: context.store.id } }),
      prisma.warehouse.findFirst({ where: { id: payload.warehouseId, storeId: context.store.id } }),
    ])
    if (!supplier || !warehouse) {
      return NextResponse.json({ error: 'Supplier or warehouse not found' }, { status: 404 })
    }

    const requestedProductIds = [...new Set(payload.items.map((item) => item.productId).filter(Boolean))] as string[]
    const products = await prisma.product.findMany({
      where: { storeId: context.store.id, id: { in: requestedProductIds } },
      include: { variants: { select: { id: true } } },
    })
    const productMap = new Map(products.map((product) => [product.id, product]))

    for (const item of payload.items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return NextResponse.json({ error: 'Each item needs a product and quantity' }, { status: 400 })
      }
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json({ error: 'One or more products were not found' }, { status: 404 })
      }
      if (item.variantId && !product.variants.some((variant) => variant.id === item.variantId)) {
        return NextResponse.json({ error: 'Variant does not belong to selected product' }, { status: 400 })
      }
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        storeId: context.store.id,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: 'ORDERED',
        note: payload.note?.trim() || null,
        expectedAt: payload.expectedAt ? new Date(payload.expectedAt) : null,
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId!,
            variantId: item.variantId || null,
            quantity: Number(item.quantity),
            unitCost: item.unitCost != null ? Number(item.unitCost) : null,
          })),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, title: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, purchaseOrder })
  }

  if (body.type === 'receive') {
    const payload = body as Extract<typeof body, { type?: 'receive' }>
    if (!payload.purchaseOrderId) {
      return NextResponse.json({ error: 'purchaseOrderId is required' }, { status: 400 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: payload.purchaseOrderId, storeId: context.store.id },
      include: { items: true, warehouse: true },
    })
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }
    if (purchaseOrder.status === 'RECEIVED' || purchaseOrder.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This purchase order cannot be received' }, { status: 400 })
    }

    const itemReceipts = Array.isArray(payload.items) && payload.items.length > 0
      ? payload.items
      : purchaseOrder.items.map((item) => ({ id: item.id, quantity: item.quantity - item.receivedQuantity }))

    for (const receipt of itemReceipts) {
      const poItem = purchaseOrder.items.find((item) => item.id === receipt.id)
      const qty = Math.max(0, Number(receipt.quantity ?? 0))
      if (!poItem || qty < 0 || poItem.receivedQuantity + qty > poItem.quantity) {
        return NextResponse.json({ error: 'Invalid received quantity' }, { status: 400 })
      }
    }

    for (const receipt of itemReceipts) {
      const poItem = purchaseOrder.items.find((item) => item.id === receipt.id)
      const qty = Math.max(0, Number(receipt.quantity ?? 0))
      if (!poItem || qty === 0) continue

      await restockWarehouseInventory({
        actorId: context.userId,
        warehouseId: purchaseOrder.warehouseId,
        productId: poItem.productId,
        variantId: poItem.variantId,
        quantity: qty,
        note: payload.note?.trim() || `Received against PO ${purchaseOrder.id}`,
      })

      await prisma.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQuantity: poItem.receivedQuantity + qty,
        },
      })
    }

    const refreshed = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrder.id },
      include: { items: true },
    })
    const allReceived = refreshed?.items.every((item) => item.receivedQuantity >= item.quantity)
    const anyReceived = refreshed?.items.some((item) => item.receivedQuantity > 0)

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : purchaseOrder.status,
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unsupported procurement action' }, { status: 400 })
}

export async function PATCH(req: Request) {
  const context = await getVendorContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    purchaseOrderId?: string
    action?: 'update' | 'cancel' | 'escalate'
    note?: string
    expectedAt?: string | null
    message?: string
    items?: Array<{
      id?: string
      quantity?: number
      unitCost?: number | null
    }>
  }

  if (!body.purchaseOrderId || !body.action) {
    return NextResponse.json({ error: 'purchaseOrderId and action are required' }, { status: 400 })
  }

  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { id: body.purchaseOrderId, storeId: context.store.id },
    include: { items: true },
  })
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
  }

  if (body.action === 'escalate') {
    const message = body.message?.trim() || `Vendor follow-up requested for purchase order ${purchaseOrder.id}.`
    await createOrAppendProcurementAlert({
      purchaseOrderId: purchaseOrder.id,
      vendorUserId: context.store.vendorId,
      actorId: context.userId,
      body: [
        `Store: ${context.store.name}`,
        `Supplier ID: ${purchaseOrder.supplierId}`,
        `Warehouse ID: ${purchaseOrder.warehouseId}`,
        purchaseOrder.expectedAt ? `Expected date: ${purchaseOrder.expectedAt.toISOString().slice(0, 10)}` : null,
        message,
      ].filter(Boolean).join('\n'),
    })

    return NextResponse.json({ success: true })
  }

  if (body.action === 'cancel') {
    if (purchaseOrder.status === 'RECEIVED' || purchaseOrder.items.some((item) => item.receivedQuantity > 0)) {
      return NextResponse.json({ error: 'Received purchase orders cannot be cancelled' }, { status: 400 })
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: 'CANCELLED', note: body.note?.trim() || purchaseOrder.note },
    })
    return NextResponse.json({ success: true, purchaseOrder: updated })
  }

  if (purchaseOrder.status === 'CANCELLED' || purchaseOrder.status === 'RECEIVED') {
    return NextResponse.json({ error: 'This purchase order can no longer be edited' }, { status: 400 })
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    for (const item of body.items) {
      const existing = purchaseOrder.items.find((entry) => entry.id === item.id)
      if (!existing) {
        return NextResponse.json({ error: 'Purchase order line not found' }, { status: 404 })
      }
      const nextQuantity = Math.max(1, Number(item.quantity ?? existing.quantity))
      if (nextQuantity < existing.receivedQuantity) {
        return NextResponse.json({ error: 'Line quantity cannot be less than received quantity' }, { status: 400 })
      }
    }

    await prisma.$transaction(
      body.items.map((item) => {
        const existing = purchaseOrder.items.find((entry) => entry.id === item.id)!
        return prisma.purchaseOrderItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.max(1, Number(item.quantity ?? existing.quantity)),
            unitCost: item.unitCost != null ? Number(item.unitCost) : existing.unitCost,
          },
        })
      })
    )
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: {
      note: body.note !== undefined ? body.note.trim() || null : purchaseOrder.note,
      expectedAt: body.expectedAt !== undefined ? (body.expectedAt ? new Date(body.expectedAt) : null) : purchaseOrder.expectedAt,
    },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, title: true } },
        },
      },
    },
  })

  return NextResponse.json({ success: true, purchaseOrder: updated })
}
