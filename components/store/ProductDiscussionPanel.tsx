'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type ReviewItem = {
  id: string
  rating: number
  comment?: string | null
  createdAt: string | Date
  user: {
    name?: string | null
    email?: string | null
  }
}

type DiscussionReply = {
  id: string
  type: string
  status: string
  body: string
  createdAt: string | Date
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

type DiscussionItem = {
  id: string
  type: string
  status: string
  body: string
  createdAt: string | Date
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  replies: DiscussionReply[]
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString()
}

export function ProductDiscussionPanel({
  productId,
  productSlug,
  storeVendorId,
  initialReviews,
  initialDiscussion,
}: {
  productId: string
  productSlug: string
  storeVendorId: string
  initialReviews: ReviewItem[]
  initialDiscussion: DiscussionItem[]
}) {
  const { data: session, status } = useSession()
  const sessionUser = session?.user as { id?: string; role?: string; email?: string | null; name?: string | null } | undefined
  const [reviews, setReviews] = useState(initialReviews)
  const [discussion, setDiscussion] = useState(initialDiscussion)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState(
    initialReviews.find((item) => item.user.email === sessionUser?.email)?.comment ?? ''
  )
  const [reviewMessage, setReviewMessage] = useState('')
  const [discussionType, setDiscussionType] = useState<'QUESTION' | 'COMMENT'>('QUESTION')
  const [discussionBody, setDiscussionBody] = useState('')
  const [discussionMessage, setDiscussionMessage] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [savingReview, setSavingReview] = useState(false)
  const [savingDiscussion, setSavingDiscussion] = useState(false)
  const [replyingId, setReplyingId] = useState<string | null>(null)

  const myReview = useMemo(
    () => reviews.find((item) => item.user.email === sessionUser?.email),
    [reviews, sessionUser?.email]
  )
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0
  const roundedStars = Math.round(averageRating)
  const canAnswer = sessionUser?.role === 'ADMIN' || (sessionUser?.role === 'VENDOR' && sessionUser.id === storeVendorId)

  async function submitReview() {
    if (status !== 'authenticated') {
      setReviewMessage('Sign in to leave a review.')
      return
    }

    setSavingReview(true)
    setReviewMessage('')
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setReviewMessage(data.error ?? 'Failed to save review.')
        return
      }

      const nextReview = {
        ...data.review,
        user: {
          name: sessionUser?.name ?? null,
          email: sessionUser?.email ?? null,
        },
      } as ReviewItem

      setReviews((prev) => {
        const other = prev.filter((item) => item.id !== nextReview.id)
        return [nextReview, ...other]
      })
      setReviewMessage('Review saved.')
    } finally {
      setSavingReview(false)
    }
  }

  async function submitDiscussion(parentId?: string) {
    if (status !== 'authenticated') {
      setDiscussionMessage('Sign in to join this product discussion.')
      return
    }

    const message = parentId ? replyDrafts[parentId]?.trim() : discussionBody.trim()
    if (!message) return

    if (parentId) {
      setReplyingId(parentId)
    } else {
      setSavingDiscussion(true)
      setDiscussionMessage('')
    }

    try {
      const response = await fetch(`/api/products/${productSlug}/discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: parentId ? 'ANSWER' : discussionType,
          body: message,
          parentId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (parentId) {
          setReplyDrafts((prev) => ({ ...prev, [parentId]: data.error ?? 'Failed to send reply.' }))
        } else {
          setDiscussionMessage(data.error ?? 'Failed to post discussion item.')
        }
        return
      }

      if (parentId) {
        setDiscussion((prev) =>
          prev.map((item) =>
            item.id === parentId
              ? {
                  ...item,
                  replies: [...item.replies, data.item],
                }
              : item
          )
        )
        setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }))
      } else if (data.item.status === 'APPROVED') {
        setDiscussion((prev) => [data.item, ...prev])
        setDiscussionBody('')
      } else {
        setDiscussionBody('')
        setDiscussionMessage('Posted for moderation. It will appear after approval.')
      }
    } finally {
      if (parentId) {
        setReplyingId(null)
      } else {
        setSavingDiscussion(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-200 p-4">
            <p className="text-5xl font-black text-slate-900">{averageRating.toFixed(1)}</p>
            <p className="mt-1 text-amber-500">{'★'.repeat(roundedStars)}{'☆'.repeat(Math.max(0, 5 - roundedStars))}</p>
            <p className="mt-1 text-sm text-slate-500">{reviews.length} reviews</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 lg:col-span-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.filter((review) => review.rating === rating).length
              const ratio = reviews.length ? (count / reviews.length) * 100 : 0
              return (
                <div key={rating} className="mb-2 flex items-center gap-3 text-sm">
                  <span className="w-10 text-slate-600">{rating} star</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="w-12 text-right text-slate-500">{Math.round(ratio)}%</span>
                </div>
              )
            })}
          </article>
        </div>

        <div className="mt-4 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900">Reviews</h2>
            {reviews.length === 0 ? <p className="text-sm text-slate-500">No reviews yet.</p> : null}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{review.user.name ?? review.user.email ?? 'Buyer'}</p>
                  <p className="text-sm text-amber-500">{'★'.repeat(review.rating)}</p>
                </div>
                {review.comment ? <p className="mt-1 text-sm text-slate-600">{review.comment}</p> : null}
                <p className="mt-1 text-xs text-slate-400">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-black text-slate-900">{myReview ? 'Update your review' : 'Write a review'}</h3>
            <p className="mt-1 text-sm text-slate-500">Reviews are limited to buyers who completed an order for this product.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReviewRating(value)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${reviewRating === value ? 'bg-amber-400 text-slate-900' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                  {value}★
                </button>
              ))}
            </div>
            <div className="mt-4">
              <RichTextEditor
                value={reviewComment}
                onChange={setReviewComment}
                output="text"
                placeholder="Share product quality, fit, delivery, or usage feedback."
                minHeightClassName="min-h-[140px]"
              />
            </div>
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={savingReview}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingReview ? 'Saving...' : myReview ? 'Update review' : 'Post review'}
            </button>
            {reviewMessage ? <p className="mt-2 text-xs text-slate-500">{reviewMessage}</p> : null}
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Product discussion</h2>
            <p className="mt-1 text-sm text-slate-500">Ask pre-sale questions, leave product comments, and let vendors answer publicly.</p>
          </div>
          {status !== 'authenticated' ? (
            <Link href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`} className="text-sm font-semibold text-blue-600 hover:underline">
              Sign in to participate
            </Link>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-2">
            {(['QUESTION', 'COMMENT'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDiscussionType(value)}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${discussionType === value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
              >
                {value === 'QUESTION' ? 'Ask a question' : 'Leave a comment'}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <RichTextEditor
              value={discussionBody}
              onChange={setDiscussionBody}
              output="text"
              placeholder={discussionType === 'QUESTION' ? 'Ask about sizing, materials, shipping, compatibility, or warranty.' : 'Share extra buying context or product notes.'}
              minHeightClassName="min-h-[140px]"
            />
          </div>
          <button
            type="button"
            onClick={() => void submitDiscussion()}
            disabled={savingDiscussion}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingDiscussion ? 'Posting...' : discussionType === 'QUESTION' ? 'Post question' : 'Post comment'}
          </button>
          {discussionMessage ? <p className="mt-2 text-xs text-slate-500">{discussionMessage}</p> : null}
        </div>

        <div className="mt-5 space-y-4">
          {discussion.length === 0 ? <p className="text-sm text-slate-500">No discussion yet.</p> : null}
          {discussion.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.type === 'QUESTION' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{item.user.name ?? item.user.email ?? 'Buyer'}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.body}</p>

              {item.replies.length > 0 ? (
                <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
                  {item.replies.map((reply) => (
                    <div key={reply.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{reply.user.role === 'ADMIN' ? 'Admin answer' : 'Vendor answer'}</span>
                        <p className="text-sm font-semibold text-slate-800">{reply.user.name ?? reply.user.email ?? 'Staff'}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{reply.body}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(reply.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {canAnswer ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <RichTextEditor
                    value={replyDrafts[item.id] ?? ''}
                    onChange={(value) => setReplyDrafts((prev) => ({ ...prev, [item.id]: value }))}
                    output="text"
                    placeholder="Reply as store staff"
                    minHeightClassName="min-h-[110px]"
                  />
                  <button
                    type="button"
                    onClick={() => void submitDiscussion(item.id)}
                    disabled={replyingId === item.id}
                    className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {replyingId === item.id ? 'Sending...' : 'Post answer'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
