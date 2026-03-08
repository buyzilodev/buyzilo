import { prisma } from '@/lib/prisma'

export type AdminInventoryReportData = {
  stats: {
    totalWarehouses: number
    totalWarehouseUnits: number
    lowStockProducts: number
    outOfStockProducts: number
    recentAdjustments: number
  }
  lowStockProducts: Array<{
    id: string
    name: string
    stock: number
    storeName: string
    categoryName: string
  }>
  warehouseBalances: Array<{
    id: string
    name: string
    code?: string | null
    storeName: string
    skuCount: number
    totalUnits: number
  }>
  recentAdjustments: Array<{
    id: string
    type: string
    quantity: number
    note?: string | null
    createdAt: Date
    warehouseName: string
    productName: string
    variantTitle?: string | null
    actorName?: string | null
    actorEmail?: string | null
  }>
}

export async function getAdminInventoryReportData(): Promise<AdminInventoryReportData> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [warehouses, products, adjustments] = await Promise.all([
    prisma.warehouse.findMany({
      include: {
        store: { select: { name: true } },
        stocks: { select: { id: true, quantity: true } },
      },
      orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
      take: 200,
    }),
    prisma.product.findMany({
      include: {
        store: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
    }),
    prisma.inventoryAdjustment.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        warehouse: { select: { name: true } },
        product: { select: { name: true } },
        variant: { select: { title: true } },
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
  ])

  const totalWarehouseUnits = warehouses.reduce(
    (sum, warehouse) => sum + warehouse.stocks.reduce((stockSum, stock) => stockSum + stock.quantity, 0),
    0
  )
  const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 5)
  const outOfStockProducts = products.filter((product) => product.stock <= 0)

  return {
    stats: {
      totalWarehouses: warehouses.length,
      totalWarehouseUnits,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      recentAdjustments: adjustments.length,
    },
    lowStockProducts: lowStockProducts.slice(0, 12).map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      storeName: product.store.name,
      categoryName: product.category.name,
    })),
    warehouseBalances: warehouses.slice(0, 12).map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      storeName: warehouse.store.name,
      skuCount: warehouse.stocks.length,
      totalUnits: warehouse.stocks.reduce((sum, stock) => sum + stock.quantity, 0),
    })),
    recentAdjustments: adjustments.map((entry) => ({
      id: entry.id,
      type: entry.type,
      quantity: entry.quantity,
      note: entry.note,
      createdAt: entry.createdAt,
      warehouseName: entry.warehouse.name,
      productName: entry.product.name,
      variantTitle: entry.variant?.title,
      actorName: entry.actor?.name,
      actorEmail: entry.actor?.email,
    })),
  }
}
