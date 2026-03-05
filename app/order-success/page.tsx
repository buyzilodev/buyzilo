import Link from 'next/link'

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm p-12 max-w-md w-full text-center">
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Order Placed!</h1>
        <p className="text-gray-500 mb-2">Thank you for shopping with Buyzilo!</p>
        <p className="text-gray-400 text-sm mb-8">
          Your order has been confirmed. You will receive an email confirmation shortly.
        </p>

        <div className="bg-blue-50 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-500">Order Number</p>
          <p className="text-2xl font-bold text-blue-600">#BUY-{Math.floor(Math.random() * 90000) + 10000}</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            View My Orders
          </Link>
          <Link
            href="/products"
            className="block w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
