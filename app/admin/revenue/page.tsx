'use client'
import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'

type Order = { id: string; total: number; status: string; createdAt: string }

export default function AdminRevenuePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/orders?limit=500')
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const completedRevenue = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'SHIPPED').reduce((s, o) => s + o.total, 0)
  const pendingRevenue = orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING').reduce((s, o) => s + o.total, 0)
  const commissionRate = 0.1
  const platformCommission = totalRevenue * commissionRate

  return (
    <AdminLayout title="Revenue" subtitle="Platform revenue and financial summary">
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-500 text-sm">Completed Orders Revenue</p>
              <p className="text-2xl font-bold text-green-600">${completedRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-500 text-sm">Pending / Processing</p>
              <p className="text-2xl font-bold text-yellow-600">${pendingRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-500 text-sm">Platform Commission (10%)</p>
              <p className="text-2xl font-bold text-purple-600">${platformCommission.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-lg mb-4">Summary</h2>
            <p className="text-gray-600">Total orders: {orders.length}. Revenue is calculated from all orders. Commission is applied at 10% (configurable in vendor plans).</p>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
