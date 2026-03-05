'use client'
import { useState } from 'react'
import Link from 'next/link'

const allProducts = [
  { id: '1', name: 'Wireless Headphones', price: 99.99, store: 'TechStore', image: '🎧', rating: 4.5, reviews: 128, category: 'electronics' },
  { id: '2', name: 'Running Shoes', price: 79.99, store: 'SportZone', image: '👟', rating: 4.8, reviews: 256, category: 'sports' },
  { id: '3', name: 'Coffee Maker', price: 49.99, store: 'HomeGoods', image: '☕', rating: 4.3, reviews: 89, category: 'home-garden' },
  { id: '4', name: 'Yoga Mat', price: 29.99, store: 'FitLife', image: '🧘', rating: 4.6, reviews: 412, category: 'sports' },
  { id: '5', name: 'Sunglasses', price: 59.99, store: 'FashionHub', image: '🕶️', rating: 4.4, reviews: 167, category: 'fashion' },
  { id: '6', name: 'Backpack', price: 89.99, store: 'TravelGear', image: '🎒', rating: 4.7, reviews: 203, category: 'fashion' },
  { id: '7', name: 'Smart Watch', price: 199.99, store: 'TechStore', image: '⌚', rating: 4.9, reviews: 521, category: 'electronics' },
  { id: '8', name: 'Desk Lamp', price: 39.99, store: 'HomeGoods', image: '🪔', rating: 4.2, reviews: 74, category: 'home-garden' },
  { id: '9', name: 'Lipstick Set', price: 24.99, store: 'BeautyPlus', image: '💄', rating: 4.5, reviews: 310, category: 'beauty' },
  { id: '10', name: 'Novel Book', price: 14.99, store: 'BookWorld', image: '📚', rating: 4.8, reviews: 189, category: 'books' },
  { id: '11', name: 'Toy Car', price: 19.99, store: 'ToyLand', image: '🚗', rating: 4.3, reviews: 95, category: 'toys' },
  { id: '12', name: 'Laptop Stand', price: 44.99, store: 'TechStore', image: '💻', rating: 4.6, reviews: 142, category: 'electronics' },
]

const categories = [
  { label: 'All', value: 'all' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Sports', value: 'sports' },
  { label: 'Home & Garden', value: 'home-garden' },
  { label: 'Beauty', value: 'beauty' },
  { label: 'Books', value: 'books' },
  { label: 'Toys', value: 'toys' },
]

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('default')
  const [cart, setCart] = useState<string[]>([])

  const addToCart = (id: string) => {
    setCart(prev => [...prev, id])
  }

  let filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'all' || p.category === category
    return matchSearch && matchCategory
  })

  if (sort === 'price-low') filtered = [...filtered].sort((a, b) => a.price - b.price)
  if (sort === 'price-high') filtered = [...filtered].sort((a, b) => b.price - a.price)
  if (sort === 'rating') filtered = [...filtered].sort((a, b) => b.rating - a.rating)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
          <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-96">
            <span className="text-gray-400 mr-2">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              className="bg-transparent outline-none text-sm w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cart" className="relative text-gray-600 hover:text-blue-600 text-xl">
              🛒
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 text-xl">👤</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">All Products</h1>
          <p className="text-gray-500 text-sm">{filtered.length} products found</p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  category === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="default">Sort: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-gray-500">No products found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
              >
                <Link href={`/products/${product.id}`}>
                  <div className="bg-gray-50 h-40 flex items-center justify-center text-6xl hover:bg-gray-100 transition">
                    {product.image}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs text-blue-600 mb-1">{product.store}</p>
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-semibold text-gray-800 text-sm mb-2 hover:text-blue-600 transition">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-yellow-400 text-xs">⭐</span>
                    <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600">${product.price}</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      className={`text-xs px-3 py-1.5 rounded-full transition ${
                        cart.includes(product.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {cart.includes(product.id) ? '✓ Added' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-6 text-center text-gray-400 text-sm">
        © 2026 Buyzilo. All rights reserved.
      </footer>
    </div>
  )
}