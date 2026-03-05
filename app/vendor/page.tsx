'use client'
import { useState } from 'react'
import Link from 'next/link'

const stats = [
  { label: 'Total Sales', value: '$4,285', icon: '💰', change: '+12%' },
  { label: 'Orders', value: '143', icon: '📦', change: '+8%' },
  { label: 'Products', value: '24', icon: '🛍️', change: '+3%' },
  { label: 'Rating', value: '4.8★', icon: '⭐', change: '+0.2' },
]

const recentOrders = [
  { id: '#ORD-001', product: 'Wireless Headphones', buyer: 'Ahmed K.', amount: 99.99, status: 'DELIVERED', date: '2026-03-01' },
  { id: '#ORD-002', product: 'Smart Watch', buyer: 'Sara M.', amount: 199.99, status: 'SHIPPED', date: '2026-03-02' },
  { id: '#ORD-003', product: 'Laptop Stand', buyer: 'Ali R.', amount: 44.99, status: 'PROCESSING', date: '2026-03-03' },
  { id: '#ORD-004', product: 'Wireless Headphones', buyer: 'Fatima Z.', amount: 99.99, status: 'PENDING', date: '2026-03-04' },
  { id: '#ORD-005', product: 'Smart Watch', buyer: 'Omar H.', amount: 199.99, status: 'DELIVERED', date: '2026-03-05' },
]

const myProducts = [
  { id: '1', name: 'Wireless Headphones', price: 99.99, stock: 45, image: '🎧', sales: 128, status: 'Active' },
  { id: '7', name: 'Smart Watch', price: 199.99, stock: 12, image: '⌚', sales: 521, status: 'Active' },
  { id: '12', name: 'Laptop Stand', price: 44.99, stock: 0, image: '💻', sales: 142, status: 'Out of Stock' },
]

const statusColors: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-600',
  SHIPPED: 'bg-blue-100 text-blue-600',
  PROCESSING: 'bg-yellow-100 text-yellow-600',
  PENDING: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [products, setProducts] = useState(myProducts)
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', stock: '', image: '📦'
  })

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return
    const product = {
      id: String(products.length + 1),
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock) || 0,
      image: newProduct.image,
      sales: 0,
      status: parseInt(newProduct.stock) > 0 ? 'Active' : 'Out of Stock'
    }
    setProducts([...products, product])
    setNewProduct({ name: '', price: '', stock: '', image: '📦' })
    setShowAddProduct(false)
  }

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar + Main Layout */}
      <div className="flex">

        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0 z-40">
          <div className="p-6 border-b">
            <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
            <p className="text-xs text-gray-500 mt-1">Vendor Dashboard</p>
          </div>
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'products', label: 'My Products', icon: '🛍️' },
              { id: 'orders', label: 'Orders', icon: '📦' },
              { id: 'earnings', label: 'Earnings', icon: '💰' },
              { id: 'settings', label: 'Store Settings', icon: '⚙️' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t mt-4">
              <Link
                href="/dashboard"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <span>👤</span> Buyer Account
              </Link>
              <Link
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <span>🏠</span> View Store
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Welcome back! 👋</h1>
                <p className="text-gray-500">Here's what's happening with your store today.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {stats.map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-3xl">{stat.icon}</span>
                      <span className="text-green-500 text-xs font-medium">{stat.change}</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">Recent Orders</h2>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b">
                        <th className="text-left py-3">Order ID</th>
                        <th className="text-left py-3">Product</th>
                        <th className="text-left py-3">Buyer</th>
                        <th className="text-left py-3">Amount</th>
                        <th className="text-left py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.slice(0, 3).map(order => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="py-3 font-medium text-blue-600">{order.id}</td>
                          <td className="py-3">{order.product}</td>
                          <td className="py-3 text-gray-500">{order.buyer}</td>
                          <td className="py-3 font-semibold">${order.amount}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold">My Products</h1>
                  <p className="text-gray-500">{products.length} products in your store</p>
                </div>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  + Add Product
                </button>
              </div>

              {/* Add Product Form */}
              {showAddProduct && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h3 className="font-bold mb-4">Add New Product</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input
                        value={newProduct.name}
                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Bluetooth Speaker"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                      <input
                        value={newProduct.price}
                        onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 49.99"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                      <input
                        value={newProduct.stock}
                        onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 100"
                        type="number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon</label>
                      <input
                        value={newProduct.image}
                        onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 🔊"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleAddProduct}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Save Product
                    </button>
                    <button
                      onClick={() => setShowAddProduct(false)}
                      className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500">
                      <th className="text-left px-6 py-4">Product</th>
                      <th className="text-left px-6 py-4">Price</th>
                      <th className="text-left px-6 py-4">Stock</th>
                      <th className="text-left px-6 py-4">Sales</th>
                      <th className="text-left px-6 py-4">Status</th>
                      <th className="text-left px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{product.image}</span>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-blue-600">${product.price}</td>
                        <td className="px-6 py-4">
                          <span className={product.stock === 0 ? 'text-red-500' : 'text-gray-700'}>
                            {product.stock === 0 ? 'Out of stock' : product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{product.sales}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button className="text-blue-600 hover:underline text-xs">Edit</button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="text-red-500 hover:underline text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Orders</h1>
                <p className="text-gray-500">Manage your incoming orders</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500">
                      <th className="text-left px-6 py-4">Order ID</th>
                      <th className="text-left px-6 py-4">Product</th>
                      <th className="text-left px-6 py-4">Buyer</th>
                      <th className="text-left px-6 py-4">Amount</th>
                      <th className="text-left px-6 py-4">Date</th>
                      <th className="text-left px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-blue-600">{order.id}</td>
                        <td className="px-6 py-4">{order.product}</td>
                        <td className="px-6 py-4 text-gray-500">{order.buyer}</td>
                        <td className="px-6 py-4 font-semibold">${order.amount}</td>
                        <td className="px-6 py-4 text-gray-500">{order.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EARNINGS TAB */}
          {activeTab === 'earnings' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Earnings</h1>
                <p className="text-gray-500">Track your revenue and payouts</p>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-gray-500 text-sm">Total Earnings</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">$4,285.00</p>
                  <p className="text-green-500 text-sm mt-1">+12% this month</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-gray-500 text-sm">Pending Payout</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-1">$385.00</p>
                  <p className="text-gray-400 text-sm mt-1">Processing in 3 days</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-gray-500 text-sm">Commission Paid</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">$428.50</p>
                  <p className="text-gray-400 text-sm mt-1">10% platform fee</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="font-bold mb-4">Payout History</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Amount</th>
                      <th className="text-left py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '2026-02-01', amount: '$1,200.00', status: 'Paid' },
                      { date: '2026-02-15', amount: '$980.00', status: 'Paid' },
                      { date: '2026-03-01', amount: '$1,720.00', status: 'Paid' },
                      { date: '2026-03-15', amount: '$385.00', status: 'Pending' },
                    ].map((payout, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 text-gray-500">{payout.date}</td>
                        <td className="py-3 font-semibold">{payout.amount}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payout.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {payout.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Store Settings</h1>
                <p className="text-gray-500">Manage your store profile</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                    <input defaultValue="TechStore" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
                    <input defaultValue="Premium tech products at great prices" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input defaultValue="techstore@buyzilo.com" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input defaultValue="+92 300 1234567" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
