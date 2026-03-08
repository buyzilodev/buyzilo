'use client'

import { useState } from 'react'
import { dispatchFacebookPixelEvent } from '@/lib/helpers/facebookPixel'
import { dispatchGoogleAnalyticsEvent } from '@/lib/helpers/googleAnalytics'

const GUEST_CART_KEY = 'buyzilo_guest_cart'

type AddToCartButtonProps = {
  productId: string
  productName: string
  productPrice: number
  variantId?: string
  variantLabel?: string
  productImage?: string
  storeName?: string
  unitPricing?: { quantity: number; unit: string } | null
  productCategory?: string
  quantity?: number
  className?: string
  disabled?: boolean
}

export default function AddToCartButton({
  productId,
  productName,
  productPrice,
  variantId,
  variantLabel,
  productImage,
  storeName,
  unitPricing,
  productCategory,
  quantity = 1,
  className,
  disabled = false,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function onAdd() {
    if (disabled) return
    setLoading(true)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity }),
      })

      if (response.status === 401) {
        const raw = localStorage.getItem(GUEST_CART_KEY)
        const cart: { productId: string; variantId?: string; variantLabel?: string; quantity: number; name: string; price: number; image?: string; store?: string; unitPricing?: { quantity: number; unit: string } | null }[] = raw ? JSON.parse(raw) : []
        const existing = cart.find((item) => item.productId === productId && item.variantId === variantId)
        if (existing) {
          existing.quantity += quantity
        } else {
          cart.push({
            productId,
            variantId,
            variantLabel,
            quantity,
            name: variantLabel ? `${productName} (${variantLabel})` : productName,
            price: productPrice,
            image: productImage,
            store: storeName,
            unitPricing,
          })
        }
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart))
      } else if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        alert(data.error ?? 'Failed to add to cart')
        return
      }

      dispatchFacebookPixelEvent('AddToCart', {
        content_ids: [productId],
        content_name: variantLabel ? `${productName} (${variantLabel})` : productName,
        content_type: 'product',
        content_category: productCategory,
        currency: 'USD',
        value: Number((productPrice * quantity).toFixed(2)),
      })
      dispatchGoogleAnalyticsEvent('add_to_cart', {
        currency: 'USD',
        value: Number((productPrice * quantity).toFixed(2)),
        items: [
          {
            item_id: productId,
            item_name: variantLabel ? `${productName} (${variantLabel})` : productName,
            item_category: productCategory,
            quantity,
            price: productPrice,
          },
        ],
      })

      setAdded(true)
      setTimeout(() => setAdded(false), 1200)
    } catch {
      alert('Failed to add to cart')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={loading || disabled}
      className={className ?? 'rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60'}
    >
      {loading ? 'Adding...' : added ? 'Added' : 'Add to cart'}
    </button>
  )
}
