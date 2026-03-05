'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Buyzilo</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, {session?.user?.name}! 👋</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-1">Your Dashboard</h2>
          <p className="text-gray-500">Manage your orders, profile and more.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">Total Orders</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">Wishlist Items</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-500 text-sm">Reviews Given</p>
            <p className="text-3xl font-bold mt-1">0</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                🛍️ Browse Products
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
              >
                📦 My Orders
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
              >
                👤 Edit Profile
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-4">Account Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{session?.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{session?.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-sm font-medium">
                  {(session?.user as { role?: string })?.role || 'BUYER'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}