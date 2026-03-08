'use client'

import { useEffect } from 'react'
import { dispatchFacebookPixelEvent } from '@/lib/helpers/facebookPixel'
import { dispatchGoogleAnalyticsEvent } from '@/lib/helpers/googleAnalytics'

type FacebookPixelPurchaseProps = {
  orderId: string
  total: number
  itemCount: number
  productIds: string[]
  items?: Array<{
    productId: string
    name: string
    quantity: number
    price: number
  }>
}

export default function FacebookPixelPurchase({
  orderId,
  total,
  itemCount,
  productIds,
  items = [],
}: FacebookPixelPurchaseProps) {
  useEffect(() => {
    dispatchFacebookPixelEvent('Purchase', {
      content_ids: productIds,
      content_type: 'product',
      currency: 'USD',
      num_items: itemCount,
      order_id: orderId,
      value: Number(total.toFixed(2)),
    })
    dispatchGoogleAnalyticsEvent('purchase', {
      transaction_id: orderId,
      currency: 'USD',
      value: Number(total.toFixed(2)),
      items: items.map((item) => ({
        item_id: item.productId,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    })
  }, [itemCount, items, orderId, productIds, total])

  return null
}
