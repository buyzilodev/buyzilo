import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getWarehouseStockKey,
  recordInventoryAdjustment,
  restockWarehouseInventory,
  syncWarehouseBackedStock,
  transferWarehouseInventory,
  upsertWarehouseStockQuantity,
} from '@/lib/helpers/warehouses'

async function getVendorStore() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) return null
  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  return store ? { store, userId } : null
}

export async function GET() {
  const auth = await getVendorStore()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { store } = auth

  const [warehouses, products, adjustments] = await Promise.all([
    prisma.warehouse.findMany({
      where: { storeId: store.id },
      include: {
        stocks: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, title: true } },
          },
          orderBy: [{ productId: 'asc' }, { variantId: 'asc' }],
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.product.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        name: true,
        stock: true,
        variants: {
          select: { id: true, title: true, stock: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.inventoryAdjustment.findMany({
      where: { warehouse: { storeId: store.id } },
      include: {
        warehouse: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, title: true } },
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ])

  return NextResponse.json({ warehouses, products, adjustments })
}

export async function POST(req: Request) {
  const auth = await getVendorStore()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { store, userId } = auth

  const body = await req.json() as {
    type?: 'warehouse' | 'stock' | 'restock' | 'transfer' | 'adjust'
    name?: string
    code?: string
    city?: string
    country?: string
    isDefault?: boolean
    warehouseId?: string
    fromWarehouseId?: string
    toWarehouseId?: string
    productId?: string
    variantId?: string
    quantity?: number
    note?: string
  }

  if (body.type === 'stock' || body.type === 'restock' || body.type === 'transfer' || body.type === 'adjust') {
    if (!body.warehouseId || !body.productId) {
      if (body.type !== 'transfer') {
        return NextResponse.json({ error: 'warehouseId and productId are required' }, { status: 400 })
      }
    }

    if (body.type === 'transfer') {
      if (!body.fromWarehouseId || !body.toWarehouseId || !body.productId) {
        return NextResponse.json({ error: 'fromWarehouseId, toWarehouseId, and productId are required' }, { status: 400 })
      }
      const warehouses = await prisma.warehouse.findMany({
        where: {
          storeId: store.id,
          id: { in: [body.fromWarehouseId, body.toWarehouseId] },
        },
      })
      if (warehouses.length !== 2) {
        return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
      }
      if (body.fromWarehouseId === body.toWarehouseId) {
        return NextResponse.json({ error: 'Choose two different warehouses' }, { status: 400 })
      }
    } else {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: body.warehouseId, storeId: store.id },
      })
      if (!warehouse) {
        return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
      }
    }

    const product = await prisma.product.findFirst({
      where: { id: body.productId, storeId: store.id },
      include: { variants: { select: { id: true } } },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (body.variantId && !product.variants.some((variant) => variant.id === body.variantId)) {
      return NextResponse.json({ error: 'Variant does not belong to product' }, { status: 400 })
    }

    const quantity = Math.max(0, Number(body.quantity ?? 0))
    if (body.type === 'transfer') {
      if (quantity < 1) {
        return NextResponse.json({ error: 'Transfer quantity must be at least 1' }, { status: 400 })
      }
      try {
        await transferWarehouseInventory({
          actorId: userId,
          fromWarehouseId: body.fromWarehouseId!,
          toWarehouseId: body.toWarehouseId!,
          productId: product.id,
          variantId: body.variantId ?? null,
          quantity,
          note: body.note,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Transfer failed'
        return NextResponse.json({ error: message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    if (body.type === 'restock') {
      if (quantity < 1) {
        return NextResponse.json({ error: 'Restock quantity must be at least 1' }, { status: 400 })
      }
      const stock = await restockWarehouseInventory({
        actorId: userId,
        warehouseId: body.warehouseId!,
        productId: product.id,
        variantId: body.variantId ?? null,
        quantity,
        note: body.note,
      })
      return NextResponse.json({ success: true, stock })
    }

    if (body.type === 'adjust') {
      const delta = Number(body.quantity ?? 0)
      if (!Number.isInteger(delta) || delta === 0) {
        return NextResponse.json({ error: 'Adjustment quantity must be a non-zero integer' }, { status: 400 })
      }
      const stockKey = getWarehouseStockKey(product.id, body.variantId)
      const existing = await prisma.warehouseStock.findUnique({
        where: {
          warehouseId_stockKey: {
            warehouseId: body.warehouseId!,
            stockKey,
          },
        },
      })
      const nextQuantity = Math.max(0, (existing?.quantity ?? 0) + delta)
      const stock = await upsertWarehouseStockQuantity({
        warehouseId: body.warehouseId!,
        productId: product.id,
        variantId: body.variantId ?? null,
        quantity: nextQuantity,
      })
      await recordInventoryAdjustment({
        actorId: userId,
        warehouseId: body.warehouseId!,
        productId: product.id,
        variantId: body.variantId ?? null,
        type: 'ADJUST',
        quantity: delta,
        note: body.note,
      })
      await syncWarehouseBackedStock(product.id)
      return NextResponse.json({ success: true, stock })
    }

    const stockKey = getWarehouseStockKey(product.id, body.variantId)
    const existing = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_stockKey: {
          warehouseId: body.warehouseId!,
          stockKey,
        },
      },
    })
    const stock = await upsertWarehouseStockQuantity({
      warehouseId: body.warehouseId!,
      productId: product.id,
      variantId: body.variantId ?? null,
      quantity,
    })

    await recordInventoryAdjustment({
      actorId: userId,
      warehouseId: body.warehouseId!,
      productId: product.id,
      variantId: body.variantId ?? null,
      type: 'SET',
      quantity: quantity - (existing?.quantity ?? 0),
      note: body.note,
    })
    await syncWarehouseBackedStock(product.id)
    return NextResponse.json({ success: true, stock, stockKey })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Warehouse name is required' }, { status: 400 })
  }

  if (body.isDefault) {
    await prisma.warehouse.updateMany({
      where: { storeId: store.id },
      data: { isDefault: false },
    })
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      storeId: store.id,
      name: body.name.trim(),
      code: body.code?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      isDefault: Boolean(body.isDefault),
      isActive: true,
    },
  })

  return NextResponse.json({ success: true, warehouse })
}

export async function PATCH(req: Request) {
  const auth = await getVendorStore()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { store } = auth

  const body = await req.json() as {
    warehouseId?: string
    name?: string
    code?: string
    city?: string
    country?: string
    isDefault?: boolean
    isActive?: boolean
  }

  if (!body.warehouseId) {
    return NextResponse.json({ error: 'warehouseId is required' }, { status: 400 })
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: body.warehouseId, storeId: store.id },
  })
  if (!warehouse) {
    return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
  }

  if (body.isDefault) {
    await prisma.warehouse.updateMany({
      where: { storeId: store.id },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.warehouse.update({
    where: { id: warehouse.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.code !== undefined ? { code: body.code.trim() || null } : {}),
      ...(body.city !== undefined ? { city: body.city.trim() || null } : {}),
      ...(body.country !== undefined ? { country: body.country.trim() || null } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  })

  return NextResponse.json({ success: true, warehouse: updated })
}

export async function DELETE(req: Request) {
  const auth = await getVendorStore()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { store, userId } = auth

  const { searchParams } = new URL(req.url)
  const warehouseId = searchParams.get('warehouseId')
  const stockId = searchParams.get('stockId')

  if (stockId) {
    const stock = await prisma.warehouseStock.findUnique({
      where: { id: stockId },
      include: { warehouse: true },
    })
    if (!stock || stock.warehouse.storeId !== store.id) {
      return NextResponse.json({ error: 'Stock row not found' }, { status: 404 })
    }
    await prisma.warehouseStock.delete({ where: { id: stock.id } })
    await recordInventoryAdjustment({
      actorId: userId,
      warehouseId: stock.warehouseId,
      productId: stock.productId,
      variantId: stock.variantId,
      type: 'REMOVE',
      quantity: -stock.quantity,
      note: 'Stock row removed',
    })
    await syncWarehouseBackedStock(stock.productId)
    return NextResponse.json({ success: true })
  }

  if (!warehouseId) {
    return NextResponse.json({ error: 'warehouseId is required' }, { status: 400 })
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, storeId: store.id },
  })
  if (!warehouse) {
    return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
  }

  const affectedProducts = await prisma.warehouseStock.findMany({
    where: { warehouseId: warehouse.id },
    select: { productId: true },
  })

  await prisma.warehouse.delete({ where: { id: warehouse.id } })

  for (const row of affectedProducts) {
    await syncWarehouseBackedStock(row.productId)
  }

  return NextResponse.json({ success: true })
}
