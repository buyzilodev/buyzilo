import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOrAppendProcurementAlert } from '@/lib/actions/messages'
import { prisma } from '@/lib/prisma'
import { restockWarehouseInventory } from '@/lib/helpers/warehouses'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | null
  if (!user?.id || !isAdminRole(user.role)) return null
  return user
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [suppliers, purchaseOrders] = await Promise.all([
    prisma.supplier.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    }),
    prisma.purchaseOrder.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
        supplier: { include: { store: { select: { id: true, name: true } } } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    }),
  ])

  return NextResponse.json({ suppliers, purchaseOrders })
}

export async function PATCH(req: Request) {
  const user = await assertAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as
    | {
        kind?: 'supplier'
        supplierId?: string
        name?: string
        email?: string
        phone?: string
        notes?: string
      }
    | {
        kind?: 'purchaseOrder'
        purchaseOrderId?: string
        action?: 'update' | 'cancel' | 'receive' | 'escalate'
        note?: string
        expectedAt?: string | null
        message?: string
        items?: Array<{
          id?: string
          quantity?: number
          unitCost?: number | null
        }>
      }

  if (body.kind === 'supplier') {
    const payload = body as Extract<typeof body, { kind?: 'supplier' }>
    if (!payload.supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 })
    }
    const supplier = await prisma.supplier.update({
      where: { id: payload.supplierId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.email !== undefined ? { email: payload.email.trim() || null } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone.trim() || null } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes.trim() || null } : {}),
      },
    })
    return NextResponse.json({ success: true, supplier })
  }

  if (body.kind === 'purchaseOrder') {
    const payload = body as Extract<typeof body, { kind?: 'purchaseOrder' }>
    if (!payload.purchaseOrderId || !payload.action) {
      return NextResponse.json({ error: 'purchaseOrderId and action are required' }, { status: 400 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: payload.purchaseOrderId },
      include: { items: true },
    })
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (payload.action === 'escalate') {
      const store = await prisma.store.findUnique({
        where: { id: purchaseOrder.storeId },
        select: { name: true, vendorId: true },
      })
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }

      await createOrAppendProcurementAlert({
        purchaseOrderId: purchaseOrder.id,
        vendorUserId: store.vendorId,
        actorId: user.id,
        body: [
          `Admin procurement escalation for store ${store.name}.`,
          purchaseOrder.expectedAt ? `Expected date: ${purchaseOrder.expectedAt.toISOString().slice(0, 10)}` : null,
          payload.message?.trim() || `Please review overdue or at-risk purchase order ${purchaseOrder.id}.`,
        ].filter(Boolean).join('\n'),
      })

      return NextResponse.json({ success: true })
    }

    if (payload.action === 'cancel') {
      if (purchaseOrder.status === 'RECEIVED' || purchaseOrder.items.some((item) => item.receivedQuantity > 0)) {
        return NextResponse.json({ error: 'Received purchase orders cannot be cancelled' }, { status: 400 })
      }
      const updated = await prisma.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: { status: 'CANCELLED', note: payload.note?.trim() || purchaseOrder.note },
      })
      return NextResponse.json({ success: true, purchaseOrder: updated })
    }

    if (payload.action === 'update') {
      if (purchaseOrder.status === 'CANCELLED' || purchaseOrder.status === 'RECEIVED') {
        return NextResponse.json({ error: 'This purchase order can no longer be edited' }, { status: 400 })
      }

      if (Array.isArray(payload.items) && payload.items.length > 0) {
        for (const item of payload.items) {
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
          payload.items.map((item) => {
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
          note: payload.note !== undefined ? payload.note.trim() || null : purchaseOrder.note,
          expectedAt: payload.expectedAt !== undefined ? (payload.expectedAt ? new Date(payload.expectedAt) : null) : purchaseOrder.expectedAt,
        },
      })
      return NextResponse.json({ success: true, purchaseOrder: updated })
    }

    if (payload.action === 'receive') {
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
          actorId: user.id,
          warehouseId: purchaseOrder.warehouseId,
          productId: poItem.productId,
          variantId: poItem.variantId,
          quantity: qty,
          note: payload.note?.trim() || `Admin received against PO ${purchaseOrder.id}`,
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
  }

  return NextResponse.json({ error: 'Unsupported procurement update' }, { status: 400 })
}
