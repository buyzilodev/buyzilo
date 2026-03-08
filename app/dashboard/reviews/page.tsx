'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Review = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  product: { id: string; name: string; slug: string }
}

export default function DashboardReviewsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/reviews')
      .then((response) => (response.ok ? response.json() : { reviews: [] }))
      .then((data) => {
        if (!cancelled) setReviews(Array.isArray(data.reviews) ? data.reviews : [])
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, status])

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading reviews...</div>
  }

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#78350f_0%,#f59e0b_45%,#f97316_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Review workspace</p>
          <h2 className="mt-3 text-4xl font-black">Your product feedback, kept accountable</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Review what you have already posted, jump back to product pages, and keep your public buyer feedback connected to real purchase history.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Reviews</p>
              <p className="mt-1 text-2xl font-black text-white">{reviews.length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Average rating</p>
              <p className="mt-1 text-2xl font-black text-white">{averageRating.toFixed(1)}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Five-star reviews</p>
              <p className="mt-1 text-2xl font-black text-white">{reviews.filter((item) => item.rating === 5).length}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/dashboard/orders" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Review delivered orders</p>
            <p className="mt-2 text-sm text-slate-500">Open your order history and move back into products you have already purchased.</p>
          </Link>
          <Link href="/products" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Browse catalog</p>
            <p className="mt-2 text-sm text-slate-500">Return to discovery and compare products against feedback you have already left.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Published reviews</h3>
            <p className="text-sm text-slate-500">Only reviews tied to your past buyer activity appear here.</p>
          </div>
          <p className="text-sm text-slate-400">{reviews.length} total</p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">You have not written any reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${review.product.slug}`} className="text-lg font-black text-slate-950 hover:text-blue-600">
                      {review.product.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold text-amber-500">{'★'.repeat(review.rating)}</p>
                </div>
                <p className="mt-3 text-sm text-slate-600">{review.comment?.trim() || 'You left a rating without extra written feedback.'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
