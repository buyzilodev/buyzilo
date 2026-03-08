import { getServerSession } from 'next-auth'
import { VendorLayout } from '@/components/vendor/VendorLayout'
import { authOptions } from '@/lib/auth'
import { getVendorRatingSummary } from '@/lib/actions/vendorRatings'
import { prisma } from '@/lib/prisma'

export default async function VendorReviewsPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return (
      <VendorLayout title="Reviews" subtitle="Authentication required">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Please sign in to view reviews.</p>
      </VendorLayout>
    )
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId }, select: { id: true, name: true } })
  if (!store) {
    return (
      <VendorLayout title="Reviews" subtitle="Store setup required">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Create a store to collect reviews.</p>
      </VendorLayout>
    )
  }

  const reviews = await prisma.review.findMany({
    where: { product: { storeId: store.id } },
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
  })
  const discussionCount = await prisma.productDiscussion.count({
    where: { product: { storeId: store.id }, parentId: null },
  })
  const ratingSummary = await getVendorRatingSummary(store.id)

  return (
    <VendorLayout title="Reviews" subtitle={`Product reviews for ${store.name}`}>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Vendor Rating</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{ratingSummary.averageRating != null ? ratingSummary.averageRating.toFixed(1) : '-'}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Review Count</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{ratingSummary.reviewCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Low Ratings</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{ratingSummary.lowRatingCount}</p>
        </article>
      </div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Product discussion</p>
            <p className="text-xs text-slate-500">{discussionCount} public question/comment threads across your catalog.</p>
          </div>
          <a href="/vendor/discussion" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Open discussion queue
          </a>
        </div>
      </div>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-800">{review.product.name}</p>
                <p className="text-amber-500">{'★'.repeat(review.rating)}</p>
              </div>
              <p className="text-xs text-slate-500">{review.user.name ?? review.user.email}</p>
              {review.comment && <p className="mt-1 text-sm text-slate-600">{review.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-slate-500">No reviews yet.</p>}
        </div>
      </article>
    </VendorLayout>
  )
}
