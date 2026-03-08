import { prisma } from '@/lib/prisma'
import { createStockAlertsForRestock } from '@/lib/actions/stockAlerts'

export function getWarehouseStockKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? 'default'}`
}

export async function recordInventoryAdjustment(input: {
  actorId?: string | null
  warehouseId: string
  productId: string
  variantId?: string | null
  type: 'SET' | 'ADJUST' | 'RESTOCK' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REMOVE'
  quantity: number
  note?: string | null
}) {
  return prisma.inventoryAdjustment.create({
    data: {
      actorId: input.actorId ?? null,
      warehouseId: input.warehouseId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      type: input.type,
      quantity: input.quantity,
      note: input.note?.trim() || null,
    },
  })
}

export async function ensureDefaultWarehouse(storeId: string) {
  const existingDefault = await prisma.warehouse.findFirst({
    where: { storeId, isDefault: true },
  })
  if (existingDefault) return existingDefault

  const firstWarehouse = await prisma.warehouse.findFirst({
    where: { storeId },
    orderBy: { createdAt: 'asc' },
  })
  if (firstWarehouse) {
    return prisma.warehouse.update({
      where: { id: firstWarehouse.id },
      data: { isDefault: true },
    })
  }

  return prisma.warehouse.create({
    data: {
      storeId,
      name: 'Main Warehouse',
      code: 'MAIN',
      isDefault: true,
      isActive: true,
    },
  })
}

export async function seedWarehouseInventoryFromProduct(productId: string, storeId: string) {
  const [warehouse, product] = await Promise.all([
    ensureDefaultWarehouse(storeId),
    prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    }),
  ])

  if (!product) return

  await prisma.warehouseStock.upsert({
    where: {
      warehouseId_stockKey: {
        warehouseId: warehouse.id,
        stockKey: getWarehouseStockKey(product.id),
      },
    },
    update: {
      productId: product.id,
      variantId: null,
      quantity: product.stock,
    },
    create: {
      warehouseId: warehouse.id,
      productId: product.id,
      variantId: null,
      stockKey: getWarehouseStockKey(product.id),
      quantity: product.stock,
    },
  })

  for (const variant of product.variants) {
    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_stockKey: {
          warehouseId: warehouse.id,
          stockKey: getWarehouseStockKey(product.id, variant.id),
        },
      },
      update: {
        productId: product.id,
        variantId: variant.id,
        quantity: variant.stock,
      },
      create: {
        warehouseId: warehouse.id,
        productId: product.id,
        variantId: variant.id,
        stockKey: getWarehouseStockKey(product.id, variant.id),
        quantity: variant.stock,
      },
    })
  }
}

export async function syncWarehouseBackedStock(productId: string) {
  const [product, stocks] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    }),
    prisma.warehouseStock.findMany({
      where: { productId },
      select: { variantId: true, quantity: true },
    }),
  ])

  if (!product || stocks.length === 0) return

  const baseStock = stocks
    .filter((entry) => !entry.variantId)
    .reduce((sum, entry) => sum + entry.quantity, 0)

  await prisma.product.update({
    where: { id: productId },
    data: { stock: baseStock },
  })

  for (const variant of product.variants) {
    const variantStock = stocks
      .filter((entry) => entry.variantId === variant.id)
      .reduce((sum, entry) => sum + entry.quantity, 0)

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: variantStock },
    })
  }
}

export async function getAvailableSellableStock(productId: string, variantId?: string | null) {
  const warehouseRows = await prisma.warehouseStock.findMany({
    where: {
      productId,
      variantId: variantId ?? null,
    },
    select: { quantity: true },
  })

  if (warehouseRows.length > 0) {
    return warehouseRows.reduce((sum, row) => sum + row.quantity, 0)
  }

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    })
    return variant?.stock ?? 0
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  })
  return product?.stock ?? 0
}

export async function assignShipmentWarehouseForOrder(orderId: string) {
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      product: {
        select: {
          storeId: true,
        },
      },
    },
    take: 1,
  })

  const storeId = orderItems[0]?.product.storeId
  if (!storeId) return null

  const warehouse = await ensureDefaultWarehouse(storeId)
  return warehouse
}

export async function allocateInventory(productId: string, quantity: number, variantId?: string | null) {
  let remaining = quantity
  const rows = await prisma.warehouseStock.findMany({
    where: {
      productId,
      variantId: variantId ?? null,
      quantity: { gt: 0 },
      warehouse: { isActive: true },
    },
    include: { warehouse: true },
  })

  const orderedRows = rows.sort((left, right) => {
    if (left.warehouse.isDefault === right.warehouse.isDefault) {
      return left.createdAt.getTime() - right.createdAt.getTime()
    }
    return left.warehouse.isDefault ? -1 : 1
  })

  for (const row of orderedRows) {
    if (remaining <= 0) break
    const decrementBy = Math.min(remaining, row.quantity)
    await prisma.warehouseStock.update({
      where: { id: row.id },
      data: { quantity: row.quantity - decrementBy },
    })
    remaining -= decrementBy
  }

  if (rows.length > 0) {
    await syncWarehouseBackedStock(productId)
    return
  }

  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    })
    if (variant) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: Math.max(0, variant.stock - quantity) },
      })
    }
  } else {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    })
    if (product) {
      await prisma.product.update({
        where: { id: productId },
        data: { stock: Math.max(0, product.stock - quantity) },
      })
    }
  }
}

export async function upsertWarehouseStockQuantity(input: {
  warehouseId: string
  productId: string
  variantId?: string | null
  quantity: number
}) {
  const stockKey = getWarehouseStockKey(input.productId, input.variantId)

  return prisma.warehouseStock.upsert({
    where: {
      warehouseId_stockKey: {
        warehouseId: input.warehouseId,
        stockKey,
      },
    },
    update: {
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: input.quantity,
    },
    create: {
      warehouseId: input.warehouseId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      stockKey,
      quantity: input.quantity,
    },
  })
}

export async function restockWarehouseInventory(input: {
  actorId?: string | null
  warehouseId: string
  productId: string
  variantId?: string | null
  quantity: number
  note?: string | null
}) {
  const stockKey = getWarehouseStockKey(input.productId, input.variantId)
  const existing = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_stockKey: {
        warehouseId: input.warehouseId,
        stockKey,
      },
    },
  })

  const nextQuantity = Math.max(0, (existing?.quantity ?? 0) + input.quantity)
  const stock = await upsertWarehouseStockQuantity({
    warehouseId: input.warehouseId,
    productId: input.productId,
    variantId: input.variantId,
    quantity: nextQuantity,
  })
  await recordInventoryAdjustment({
    actorId: input.actorId,
    warehouseId: input.warehouseId,
    productId: input.productId,
    variantId: input.variantId,
    type: 'RESTOCK',
    quantity: input.quantity,
    note: input.note,
  })
  await syncWarehouseBackedStock(input.productId)
  if ((existing?.quantity ?? 0) <= 0 && nextQuantity > 0) {
    await createStockAlertsForRestock({
      productId: input.productId,
      variantId: input.variantId,
    })
  }
  return stock
}

export async function transferWarehouseInventory(input: {
  actorId?: string | null
  fromWarehouseId: string
  toWarehouseId: string
  productId: string
  variantId?: string | null
  quantity: number
  note?: string | null
}) {
  const stockKey = getWarehouseStockKey(input.productId, input.variantId)
  const source = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_stockKey: {
        warehouseId: input.fromWarehouseId,
        stockKey,
      },
    },
  })

  if (!source || source.quantity < input.quantity) {
    throw new Error('Source warehouse does not have enough stock')
  }

  const destination = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_stockKey: {
        warehouseId: input.toWarehouseId,
        stockKey,
      },
    },
  })

  await prisma.$transaction([
    prisma.warehouseStock.update({
      where: { id: source.id },
      data: { quantity: source.quantity - input.quantity },
    }),
    destination
      ? prisma.warehouseStock.update({
          where: { id: destination.id },
          data: { quantity: destination.quantity + input.quantity },
        })
      : prisma.warehouseStock.create({
          data: {
            warehouseId: input.toWarehouseId,
            productId: input.productId,
            variantId: input.variantId ?? null,
            stockKey,
            quantity: input.quantity,
          },
        }),
  ])

  await prisma.$transaction([
    prisma.inventoryAdjustment.create({
      data: {
        actorId: input.actorId ?? null,
        warehouseId: input.fromWarehouseId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        type: 'TRANSFER_OUT',
        quantity: -input.quantity,
        note: input.note?.trim() || `Transfer to warehouse ${input.toWarehouseId}`,
      },
    }),
    prisma.inventoryAdjustment.create({
      data: {
        actorId: input.actorId ?? null,
        warehouseId: input.toWarehouseId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        type: 'TRANSFER_IN',
        quantity: input.quantity,
        note: input.note?.trim() || `Transfer from warehouse ${input.fromWarehouseId}`,
      },
    }),
  ])

  await syncWarehouseBackedStock(input.productId)
}
