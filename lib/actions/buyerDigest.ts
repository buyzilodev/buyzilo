import { prisma } from '@/lib/prisma'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'
import { getSavedSearches } from '@/lib/actions/savedSearches'
import { getUserStockAlerts } from '@/lib/actions/stockAlerts'
import { getRetentionNotifications } from '@/lib/actions/retentionNotifications'
import { getUserWishlist } from '@/lib/actions/wishlist'
import { getUserCartWithItems } from '@/lib/actions/cart'

export async function getBuyerDigest(userId: string) {
  const [preferences, alerts, searches, retentionNotifications, wishlist, cart, orders] = await Promise.all([
    getNotificationPreferences(userId),
    getUserStockAlerts(userId),
    getSavedSearches(userId),
    getRetentionNotifications(userId),
    getUserWishlist(userId),
    getUserCartWithItems(userId),
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

  const unreadAlerts = alerts.filter((item) => !item.isRead)
  const priceDropAlerts = alerts.filter((item) => item.kind === 'PRICE_DROP')
  const stockAlerts = alerts.filter((item) => item.kind !== 'PRICE_DROP')
  const unreadRetentionNotifications = retentionNotifications.filter((item) => !item.isRead)
  const savedSearchesWithNewResults = searches.filter((item) => item.hasNewResults)
  const cartItems = cart?.items ?? []
  const cartValue = cartItems.reduce(
    (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
    0
  )

  return {
    generatedAt: new Date().toISOString(),
    preferences,
    summary: {
      unreadAlerts: unreadAlerts.length,
      unreadRetentionNotifications: unreadRetentionNotifications.length,
      priceDropAlerts: priceDropAlerts.length,
      stockAlerts: stockAlerts.length,
      savedSearchesWithNewResults: savedSearchesWithNewResults.length,
      wishlistItems: wishlist.length,
      cartItems: cartItems.length,
      cartValue: Number(cartValue.toFixed(2)),
      recentOrders: orders.length,
    },
    highlights: {
      alerts: unreadAlerts.slice(0, 5),
      retentionNotifications: unreadRetentionNotifications.slice(0, 5),
      searches: savedSearchesWithNewResults.slice(0, 5),
      wishlist: wishlist.slice(0, 4),
      cart: cartItems.slice(0, 4),
      orders: orders.slice(0, 3),
    },
  }
}
