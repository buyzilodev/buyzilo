'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { StatCard } from '@/components/admin/StatCard'

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user: { name: string | null; email: string }
  product: { name: string; slug: string; store: { name: string } }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/reviews')
      const data = await response.json()
      setReviews(data.reviews ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function removeReview(id: string) {
    if (!window.confirm('Delete this review?')) return
    await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await load()
  }

  useEffect(() => {
    load()
  }, [])

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  return (
    <AdminLayout title="Product Reviews" subtitle="Moderate marketplace reviews and rating quality">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Reviews" value={String(reviews.length)} hint="Current moderation queue" />
        <StatCard label="Average Rating" value={avgRating.toFixed(1)} hint="Across visible reviews" />
        <StatCard label="Low Ratings" value={String(reviews.filter((review) => review.rating <= 2).length)} hint="Needs attention" />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="py-8 text-sm text-slate-500">Loading reviews...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Reviewer</th>
                  <th className="pb-3">Rating</th>
                  <th className="pb-3">Comment</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <Link href={`/products/${review.product.slug}`} className="font-semibold text-blue-600 hover:underline">
                        {review.product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{review.product.store.name}</p>
                    </td>
                    <td className="py-3 text-slate-700">{review.user?.name ?? review.user?.email}</td>
                    <td className="py-3 font-semibold text-slate-900">{review.rating}/5</td>
                    <td className="py-3 text-slate-600">{review.comment ?? '-'}</td>
                    <td className="py-3 text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => removeReview(review.id)}
                        className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reviews.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No reviews found.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
