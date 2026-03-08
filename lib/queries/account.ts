import { prisma } from '@/lib/prisma'

export async function getAccountOverview(userId: string) {
  const [orderCount, cartItems, latestOrders] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.cartItem.count({ where: { cart: { userId } } }),
    prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, images: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    orderCount,
    cartItems,
    latestOrders,
  }
}
