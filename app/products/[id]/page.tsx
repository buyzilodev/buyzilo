'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const allProducts = [
  { id: '1', name: 'Wireless Headphones', price: 99.99, store: 'TechStore', image: '🎧', rating: 4.5, reviews: 128, category: 'Electronics', description: 'Premium wireless headphones with noise cancellation, 30-hour battery life, and crystal clear sound.' },
  { id: '2', name: 'Running Shoes', price: 79.99, store: 'SportZone', image: '👟', rating: 4.8, reviews: 256, category: 'Sports', description: 'Lightweight running shoes with advanced cushioning technology for maximum comfort.' },
  { id: '3', name: 'Coffee Maker', price: 49.99, store: 'HomeGoods', image: '☕', rating: 4.3, reviews: 89, category: 'Home', description: 'Programmable coffee maker with 12-cup capacity and built-in grinder.' },
  { id: '4', name: 'Yoga Mat', price: 29.99, store: 'FitLife', image: '🧘', rating: 4.6, reviews: 412, category: 'Sports', description: 'Non-slip yoga mat with alignment lines, extra thick for joint support.' },
  { id: '5', name: 'Sunglasses', price: 59.99, store: 'FashionHub', image: '🕶️', rating: 4.4, reviews: 167, category: 'Fashion', description: 'UV400 polarized sunglasses with stylish frame design.' },
  { id: '6', name: 'Backpack', price: 89.99, store: 'TravelGear', image: '🎒', rating: 4.7, reviews: 203, category: 'Fashion', description: 'Water-resistant backpack with laptop compartment and USB charging port.' },
  { id: '7', name: 'Smart Watch', price: 199.99, store: 'TechStore', image: '⌚', rating: 4.9, reviews: 521, category: 'Electronics', description: 'Feature-packed smartwatch with health monitoring, GPS, and 7-day battery.' },
  { id: '8', name: 'Desk Lamp', price: 39.99, store: 'HomeGoods', image: '🪔', rating: 4.2, reviews: 74, category: 'Home', description: 'LED desk lamp with adjustable brightness and color temperature.' },
]

export default function ProductDetailPage() {
  const { id } = useParams()
  const product = allProducts.find(p => p.id === id)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-500">Product not found</p>
          <Link href="/products" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const handleAddToCart = () => {
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
          <div className="flex items-center gap-3">
            <Link href="/cart" className="text-gray-600 hover:text-blue-600 text-xl">🛒</Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 text-xl">👤</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>→</span>
          <Link href="/products" className="hover:text-blue-600">Products</Link>
          <span>→</span>
          <span className="text-gray-800">{product.name}</span>
        </div>

        {/* Product Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 grid md:grid-cols-2 gap-10">
          {/* Image */}
          <div className="bg-gray-50 rounded-xl h-80 flex items-center justify-center text-9xl">
            {product.image}
          </div>

          {/* Info */}
          <div>
            <span className="text-blue-600 text-sm font-medium">{product.store}</span>
            <h1 className="text-3xl font-bold mt-1 mb-3">{product.name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-yellow-400">⭐⭐⭐⭐⭐</div>
              <span className="text-gray-500 text-sm">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="text-3xl font-bold text-blue-600 mb-6">
              ${product.price}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-gray-600 font-medium">Quantity:</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 transition font-bold"
                >
                  -
                </button>
                <span className="px-6 py-2 font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 transition font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {added ? '✓ Added to Cart!' : '🛒 Add to Cart'}
              </button>
              <button className="flex-1 py-3 rounded-xl font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition">
                Buy Now
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex gap-6 mt-6 text-sm text-gray-500">
              <span>✅ Free Returns</span>
              <span>🚚 Fast Delivery</span>
              <span>🔒 Secure Payment</span>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {allProducts.filter(p => p.id !== id).slice(0, 4).map(p => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
              >
                <div className="bg-gray-50 h-32 flex items-center justify-center text-5xl">
                  {p.image}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                  <p className="text-blue-600 font-bold mt-1">${p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
