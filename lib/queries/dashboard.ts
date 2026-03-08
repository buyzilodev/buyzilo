import { prisma } from '@/lib/prisma'

export async function getGlobalCounts() {
  const [users, vendors, products, orders] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.product.count(),
    prisma.order.count(),
  ])

  return { users, vendors, products, orders }
}
