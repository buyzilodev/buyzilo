'use client'

import { useEffect } from 'react'
import { dispatchFacebookPixelEvent } from '@/lib/helpers/facebookPixel'
import { dispatchGoogleAnalyticsEvent } from '@/lib/helpers/googleAnalytics'

type FacebookPixelViewContentProps = {
  productId: string
  productName: string
  categoryName?: string
  price: number
}

export default function FacebookPixelViewContent({
  productId,
  productName,
  categoryName,
  price,
}: FacebookPixelViewContentProps) {
  useEffect(() => {
    dispatchFacebookPixelEvent('ViewContent', {
      content_ids: [productId],
      content_name: productName,
      content_type: 'product',
      content_category: categoryName,
      currency: 'USD',
      value: Number(price.toFixed(2)),
    })
    dispatchGoogleAnalyticsEvent('view_item', {
      currency: 'USD',
      value: Number(price.toFixed(2)),
      items: [
        {
          item_id: productId,
          item_name: productName,
          item_category: categoryName,
          price: Number(price.toFixed(2)),
          quantity: 1,
        },
      ],
    })
  }, [categoryName, price, productId, productName])

  return null
}
