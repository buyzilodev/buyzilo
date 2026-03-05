'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const initialCartItems = [
  { id: '1', name: 'Wireless Headphones', price: 99.99, image: '🎧', store: 'TechStore', quantity: 1 },
  { id: '2', name: 'Running Shoes', price: 79.99, image: '👟', store: 'SportZone', quantity: 1 },
  { id: '7', name: 'Smart Watch', price: 199.99, image: '⌚', store: 'TechStore', quantity: 1 },
]

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState(initialCartItems)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')

const handleCheckout = async () => {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  })
  const data = await res.json() as { url?: string; error?: string }
  if (data.url) {
    window.location.href = data.url
  }
}

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'BUYZILO10') {
      setDiscount(10)
      setCouponMsg('✅ 10% discount applied!')
    } else if (coupon.toUpperCase() === 'SAVE20') {
      setDiscount(20)
      setCouponMsg('✅ 20% discount applied!')
    } else {
      setDiscount(0)
      setCouponMsg('❌ Invalid coupon code')
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = (subtotal * discount) / 100
  const shipping = subtotal > 100 ? 0 : 9.99
  const total = subtotal - discountAmount + shipping

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm px-6 py-3">
          <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
        </nav>
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-6xl mb-4">🛒</p>
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add some products to get started!</p>
          <Link
            href="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
          <div className="flex items-center gap-3">
            <Link href="/products" className="text-gray-600 hover:text-blue-600 text-sm">← Continue Shopping</Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 text-xl">👤</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart ({items.length} items)</h1>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                {/* Image */}
                <div className="bg-gray-50 rounded-xl w-20 h-20 flex items-center justify-center text-4xl flex-shrink-0">
                  {item.image}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-xs text-blue-600">{item.store}</p>
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-blue-600 font-bold mt-1">${item.price}</p>
                </div>

                {/* Quantity */}
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition font-bold text-sm"
                  >
                    +
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right min-w-16">
                  <p className="font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 hover:text-red-600 transition text-lg ml-2"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Coupon */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold mb-3">Have a coupon?</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter coupon code (try BUYZILO10)"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                />
                <button
                  onClick={applyCoupon}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  Apply
                </button>
              </div>
              {couponMsg && <p className="text-sm mt-2">{couponMsg}</p>}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-400">Add ${(100 - subtotal).toFixed(2)} more for free shipping</p>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-6 hover:bg-blue-700 transition"
                >
                  Pay with Stripe →
                </button>

              <div className="flex justify-center gap-4 mt-4 text-xs text-gray-400">
                <span>🔒 Secure</span>
                <span>💳 All cards</span>
                <span>↩️ Easy returns</span>
              </div>
            </div>

            {/* Trust */}
            <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-500 space-y-2">
              <p>✅ Free returns within 30 days</p>
              <p>🚚 Delivery in 3-5 business days</p>
              <p>🔒 Your payment info is secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
