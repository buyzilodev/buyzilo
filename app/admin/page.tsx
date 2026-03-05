'use client'
import { useState } from 'react'
import Link from 'next/link'

const stats = [
  { label: 'Total Revenue', value: '$48,250', icon: '💰', change: '+18%' },
  { label: 'Total Orders', value: '1,843', icon: '📦', change: '+12%' },
  { label: 'Total Users', value: '3,291', icon: '👥', change: '+24%' },
  { label: 'Active Vendors', value: '142', icon: '🏪', change: '+8%' },
]

const allUsers = [
  { id: '1', name: 'Ahmed Khan', email: 'ahmed@mail.com', role: 'BUYER', joined: '2026-01-15', status: 'Active' },
  { id: '2', name: 'Sara Malik', email: 'sara@mail.com', role: 'VENDOR', joined: '2026-01-20', status: 'Active' },
  { id: '3', name: 'Ali Raza', email: 'ali@mail.com', role: 'BUYER', joined: '2026-02-01', status: 'Active' },
  { id: '4', name: 'Fatima Zahra', email: 'fatima@mail.com', role: 'VENDOR', joined: '2026-02-10', status: 'Banned' },
  { id: '5', name: 'Omar Hassan', email: 'omar@mail.com', role: 'BUYER', joined: '2026-02-15', status: 'Active' },
  { id: '6', name: 'Test User', email: 'test@buyzilo.com', role: 'BUYER', joined: '2026-03-05', status: 'Active' },
]

const allVendors = [
  { id: '1', name: 'TechStore', owner: 'Sara Malik', products: 24, sales: '$4,285', status: 'APPROVED', joined: '2026-01-20' },
  { id: '2', name: 'SportZone', owner: 'Omar Hassan', products: 18, sales: '$3,120', status: 'APPROVED', joined: '2026-02-01' },
  { id: '3', name: 'FashionHub', owner: 'Ayesha N.', products: 35, sales: '$6,890', status: 'APPROVED', joined: '2026-02-10' },
  { id: '4', name: 'HomeGoods', owner: 'Fatima Zahra', products: 12, sales: '$1,240', status: 'BANNED', joined: '2026-02-15' },
  { id: '5', name: 'BeautyPlus', owner: 'Zara K.', products: 8, sales: '$0', status: 'PENDING', joined: '2026-03-01' },
  { id: '6', name: 'BookWorld', owner: 'Hassan A.', products: 0, sales: '$0', status: 'PENDING', joined: '2026-03-04' },
]

const allOrders = [
  { id: '#ORD-001', buyer: 'Ahmed Khan', vendor: 'TechStore', amount: 99.99, status: 'DELIVERED', date: '2026-03-01' },
  { id: '#ORD-002', buyer: 'Sara Malik', vendor: 'SportZone', amount: 199.99, status: 'SHIPPED', date: '2026-03-02' },
  { id: '#ORD-003', buyer: 'Ali Raza', vendor: 'TechStore', amount: 44.99, status: 'PROCESSING', date: '2026-03-03' },
  { id: '#ORD-004', buyer: 'Fatima Z.', vendor: 'FashionHub', amount: 59.99, status: 'PENDING', date: '2026-03-04' },
  { id: '#ORD-005', buyer: 'Omar Hassan', vendor: 'HomeGoods', amount: 39.99, status: 'CANCELLED', date: '2026-03-05' },
]

const statusColors: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-600',
  SHIPPED: 'bg-blue-100 text-blue-600',
  PROCESSING: 'bg-yellow-100 text-yellow-600',
  PENDING: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  APPROVED: 'bg-green-100 text-green-600',
  BANNED: 'bg-red-100 text-red-600',
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview')
  const [vendors, setVendors] = useState(allVendors)
  const [users, setUsers] = useState(allUsers)

  const approveVendor = (id: string) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status: 'APPROVED' } : v))
  }

  const banVendor = (id: string) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status: 'BANNED' } : v))
  }

  const banUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Banned' ? 'Active' : 'Banned' } : u))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0 z-40">
        <div className="p-6 border-b">
          <Link href="/" className="text-2xl font-bold text-blue-600">Buyzilo</Link>
          <p className="text-xs text-red-500 mt-1 font-semibold">⚡ Admin Panel</p>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'users', label: 'All Users', icon: '👥' },
            { id: 'vendors', label: 'Vendors', icon: '🏪' },
            { id: 'orders', label: 'All Orders', icon: '📦' },
            { id: 'revenue', label: 'Revenue', icon: '💰' },
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
            <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
              <span>🏠</span> View Site
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Admin Overview</h1>
              <p className="text-gray-500">Buyzilo platform at a glance</p>
            </div>

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

            {/* Pending Vendors */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">⏳ Pending Vendor Approvals</h2>
                <button onClick={() => setActiveTab('vendors')} className="text-blue-600 text-sm hover:underline">View all →</button>
              </div>
              <div className="space-y-3">
                {vendors.filter(v => v.status === 'PENDING').map(vendor => (
                  <div key={vendor.id} className="flex items-center justify-between bg-yellow-50 rounded-xl p-4">
                    <div>
                      <p className="font-semibold">{vendor.name}</p>
                      <p className="text-sm text-gray-500">{vendor.owner} • Joined {vendor.joined}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveVendor(vendor.id)}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => banVendor(vendor.id)}
                        className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
                {vendors.filter(v => v.status === 'PENDING').length === 0 && (
                  <p className="text-gray-400 text-sm">No pending approvals 🎉</p>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">Recent Orders</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-3">Order</th>
                    <th className="text-left py-3">Buyer</th>
                    <th className="text-left py-3">Vendor</th>
                    <th className="text-left py-3">Amount</th>
                    <th className="text-left py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.slice(0, 4).map(order => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 text-blue-600 font-medium">{order.id}</td>
                      <td className="py-3">{order.buyer}</td>
                      <td className="py-3 text-gray-500">{order.vendor}</td>
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
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">All Users</h1>
              <p className="text-gray-500">{users.length} registered users</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500">
                    <th className="text-left px-6 py-4">Name</th>
                    <th className="text-left px-6 py-4">Email</th>
                    <th className="text-left px-6 py-4">Role</th>
                    <th className="text-left px-6 py-4">Joined</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{user.name}</td>
                      <td className="px-6 py-4 text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' :
                          user.role === 'VENDOR' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.joined}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => banUser(user.id)}
                          className={`text-xs px-3 py-1 rounded-lg transition ${
                            user.status === 'Banned'
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {user.status === 'Banned' ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VENDORS */}
        {activeTab === 'vendors' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Vendors</h1>
              <p className="text-gray-500">{vendors.length} registered vendors</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500">
                    <th className="text-left px-6 py-4">Store</th>
                    <th className="text-left px-6 py-4">Owner</th>
                    <th className="text-left px-6 py-4">Products</th>
                    <th className="text-left px-6 py-4">Sales</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(vendor => (
                    <tr key={vendor.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{vendor.name}</td>
                      <td className="px-6 py-4 text-gray-500">{vendor.owner}</td>
                      <td className="px-6 py-4">{vendor.products}</td>
                      <td className="px-6 py-4 font-semibold text-blue-600">{vendor.sales}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                          vendor.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {vendor.status !== 'APPROVED' && (
                            <button
                              onClick={() => approveVendor(vendor.id)}
                              className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-lg hover:bg-green-200 transition"
                            >
                              Approve
                            </button>
                          )}
                          {vendor.status !== 'BANNED' && (
                            <button
                              onClick={() => banVendor(vendor.id)}
                              className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-lg hover:bg-red-200 transition"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">All Orders</h1>
              <p className="text-gray-500">{allOrders.length} total orders</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500">
                    <th className="text-left px-6 py-4">Order</th>
                    <th className="text-left px-6 py-4">Buyer</th>
                    <th className="text-left px-6 py-4">Vendor</th>
                    <th className="text-left px-6 py-4">Amount</th>
                    <th className="text-left px-6 py-4">Date</th>
                    <th className="text-left px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map(order => (
                    <tr key={order.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 text-blue-600 font-medium">{order.id}</td>
                      <td className="px-6 py-4">{order.buyer}</td>
                      <td className="px-6 py-4 text-gray-500">{order.vendor}</td>
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

        {/* REVENUE */}
        {activeTab === 'revenue' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Revenue</h1>
              <p className="text-gray-500">Platform earnings overview</p>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">$48,250</p>
                <p className="text-green-500 text-sm mt-1">+18% this month</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm">Platform Commission</p>
                <p className="text-3xl font-bold text-green-600 mt-1">$4,825</p>
                <p className="text-gray-400 text-sm mt-1">10% of all sales</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-sm">Vendor Payouts</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">$43,425</p>
                <p className="text-gray-400 text-sm mt-1">Paid to vendors</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold mb-4">Top Performing Vendors</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-3">Store</th>
                    <th className="text-left py-3">Sales</th>
                    <th className="text-left py-3">Commission</th>
                    <th className="text-left py-3">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { store: 'FashionHub', sales: '$6,890', commission: '$689', orders: 234 },
                    { store: 'TechStore', sales: '$4,285', commission: '$428', orders: 143 },
                    { store: 'SportZone', sales: '$3,120', commission: '$312', orders: 98 },
                    { store: 'HomeGoods', sales: '$2,450', commission: '$245', orders: 76 },
                  ].map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 font-medium">{row.store}</td>
                      <td className="py-3 text-blue-600 font-semibold">{row.sales}</td>
                      <td className="py-3 text-green-600">{row.commission}</td>
                      <td className="py-3 text-gray-500">{row.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
