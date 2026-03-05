import Link from 'next/link'

const categories = [
  { name: 'Electronics', icon: '💻', slug: 'electronics' },
  { name: 'Fashion', icon: '👗', slug: 'fashion' },
  { name: 'Home & Garden', icon: '🏠', slug: 'home-garden' },
  { name: 'Sports', icon: '⚽', slug: 'sports' },
  { name: 'Beauty', icon: '💄', slug: 'beauty' },
  { name: 'Books', icon: '📚', slug: 'books' },
  { name: 'Toys', icon: '🧸', slug: 'toys' },
  { name: 'Automotive', icon: '🚗', slug: 'automotive' },
]

const featuredProducts = [
  { id: '1', name: 'Wireless Headphones', price: 99.99, store: 'TechStore', image: '🎧', rating: 4.5, reviews: 128 },
  { id: '2', name: 'Running Shoes', price: 79.99, store: 'SportZone', image: '👟', rating: 4.8, reviews: 256 },
  { id: '3', name: 'Coffee Maker', price: 49.99, store: 'HomeGoods', image: '☕', rating: 4.3, reviews: 89 },
  { id: '4', name: 'Yoga Mat', price: 29.99, store: 'FitLife', image: '🧘', rating: 4.6, reviews: 412 },
  { id: '5', name: 'Sunglasses', price: 59.99, store: 'FashionHub', image: '🕶️', rating: 4.4, reviews: 167 },
  { id: '6', name: 'Backpack', price: 89.99, store: 'TravelGear', image: '🎒', rating: 4.7, reviews: 203 },
  { id: '7', name: 'Smart Watch', price: 199.99, store: 'TechStore', image: '⌚', rating: 4.9, reviews: 521 },
  { id: '8', name: 'Desk Lamp', price: 39.99, store: 'HomeGoods', image: '🪔', rating: 4.2, reviews: 74 },
]

export default function HomePage() {
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
              placeholder="Search products, stores..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cart" className="text-gray-600 hover:text-blue-600 text-xl">🛒</Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 text-xl">👤</Link>
            <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700 transition">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full mb-4 inline-block">
              🔥 New Arrivals Every Day
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Shop Everything<br />You Love
            </h1>
            <p className="text-blue-200 text-lg mb-8">
              Thousands of products from verified vendors. Best prices guaranteed.
            </p>
            <div className="flex gap-4">
              <Link href="/products" className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition">
                Shop Now
              </Link>
              <Link href="/register" className="border border-white text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition">
                Sell on Buyzilo
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="text-9xl animate-bounce">🛍️</div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">10K+</p>
            <p className="text-gray-500 text-sm">Products</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">500+</p>
            <p className="text-gray-500 text-sm">Vendors</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">50K+</p>
            <p className="text-gray-500 text-sm">Happy Buyers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">4.8★</p>
            <p className="text-gray-500 text-sm">Average Rating</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <Link href="/categories" className="text-blue-600 hover:underline text-sm">View all →</Link>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {categories.map(cat => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="flex flex-col items-center bg-white rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center"
            >
              <span className="text-3xl mb-2">{cat.icon}</span>
              <span className="text-xs font-medium text-gray-600">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link href="/products" className="text-blue-600 hover:underline text-sm">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
            >
              <div className="bg-gray-50 h-40 flex items-center justify-center text-6xl">
                {product.image}
              </div>
              <div className="p-4">
                <p className="text-xs text-blue-600 mb-1">{product.store}</p>
                <h3 className="font-semibold text-gray-800 text-sm mb-2">{product.name}</h3>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-400 text-xs">⭐</span>
                  <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">${product.price}</span>
                  <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 transition">
                    Add to Cart
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Become a Vendor Banner */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-10 text-white text-center">
          <h2 className="text-3xl font-bold mb-3">Start Selling on Buyzilo</h2>
          <p className="text-purple-200 mb-6">Join 500+ vendors and reach thousands of customers today.</p>
          <Link
            href="/register"
            className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-purple-50 transition inline-block"
          >
            Become a Vendor
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-10">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-blue-600 text-xl mb-3">Buyzilo</h3>
            <p className="text-gray-500 text-sm">Your trusted multi-vendor marketplace.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/products" className="hover:text-blue-600">All Products</Link></li>
              <li><Link href="/categories" className="hover:text-blue-600">Categories</Link></li>
              <li><Link href="/stores" className="hover:text-blue-600">Stores</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Sell</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/register" className="hover:text-blue-600">Become a Vendor</Link></li>
              <li><Link href="/vendor" className="hover:text-blue-600">Vendor Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/help" className="hover:text-blue-600">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-400 text-sm py-4 border-t">
          © 2026 Buyzilo. All rights reserved.
        </div>
      </footer>

    </div>
  )
}
