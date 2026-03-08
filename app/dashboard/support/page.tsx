'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getMatchingBannerCards, getMatchingCampaigns, type StorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type SupportRequest = {
  id: string
  subject: string
  message: string
  status: string
  resolutionNote?: string | null
  createdAt: string
  order?: { id: string; status: string } | null
  store?: { id: string; name: string; slug: string } | null
  thread?: {
    messages: Array<{
      id: string
      body: string
      createdAt: string
      sender?: { name?: string | null; email?: string | null; role?: string | null } | null
    }>
  } | null
  meta?: {
    type?: 'TICKET' | 'CALL_REQUEST'
    callbackPhone?: string | null
    callbackWindow?: string | null
  } | null
}

type HelpArticle = {
  slug: string
  title: string
  excerpt: string
}

type PublicSettingsResponse = {
  storefrontConfig?: StorefrontConfig | null
}

type HelpCenterResponse = {
  featured?: HelpArticle[]
}

export default function DashboardSupportPage() {
  const { status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null)
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([])
  const [form, setForm] = useState({
    type: 'TICKET' as 'TICKET' | 'CALL_REQUEST',
    subject: '',
    message: '',
    orderId: '',
    storeId: '',
    callbackPhone: '',
    callbackWindow: '',
  })
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const accountBanners = storefrontConfig ? getMatchingBannerCards(storefrontConfig.bannerCards, { page: 'account' }).slice(0, 2) : []
  const accountCampaigns = storefrontConfig ? getMatchingCampaigns(storefrontConfig.campaigns, { page: 'account' }).slice(0, 3) : []

  async function loadRequests() {
    const response = await fetch('/api/support')
    const data = await response.json().catch(() => ({ requests: [] }))
    setRequests(Array.isArray(data.requests) ? data.requests : [])
    setLoading(false)
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetch('/api/settings/public')
      .then(async (response): Promise<PublicSettingsResponse> => {
        if (!response.ok) {
          return {}
        }
        return await response.json() as PublicSettingsResponse
      })
      .then((data) => setStorefrontConfig(data.storefrontConfig ?? null))
      .catch(() => setStorefrontConfig(null))

    fetch('/api/help-center')
      .then(async (response): Promise<HelpCenterResponse> => {
        if (!response.ok) {
          return { featured: [] }
        }
        return await response.json() as HelpCenterResponse
      })
      .then((data) => setHelpArticles(Array.isArray(data.featured) ? data.featured : []))
      .catch(() => setHelpArticles([]))

    void loadRequests().catch(() => setLoading(false))
  }, [router, status])

  async function createRequest() {
    if (!form.subject.trim() || !form.message.trim()) {
      setMessage('Subject and request details are required.')
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        setMessage(data.error ?? 'Failed to create support request')
        return
      }

      setForm({
        type: 'TICKET',
        subject: '',
        message: '',
        orderId: '',
        storeId: '',
        callbackPhone: '',
        callbackWindow: '',
      })
      await loadRequests()
      setMessage('Support request created.')
    } finally {
      setSaving(false)
    }
  }

  async function reply(id: string) {
    const body = replyDrafts[id]?.trim()
    if (!body) return

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        setMessage(data.error ?? 'Failed to send reply')
        return
      }
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }))
      await loadRequests()
      setMessage('Reply sent.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading support desk...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_52%,#0f766e_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Support workspace</p>
          <h2 className="mt-3 text-4xl font-black">Service requests without leaving the customer workspace</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Open tickets, request callbacks, reply to active threads, and move between service and self-help without dropping out of the buyer dashboard.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Requests</p>
              <p className="mt-1 text-2xl font-black text-white">{requests.length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Open</p>
              <p className="mt-1 text-2xl font-black text-white">{requests.filter((item) => item.status !== 'RESOLVED' && item.status !== 'CLOSED').length}</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Callbacks</p>
              <p className="mt-1 text-2xl font-black text-white">{requests.filter((item) => item.meta?.type === 'CALL_REQUEST').length}</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          {accountBanners.map((banner, index) => (
            <Link key={`${banner.title}-${index}`} href={banner.href} className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
              <p className="text-lg font-black text-slate-950">{banner.title}</p>
              <p className="mt-2 text-sm text-slate-500">{banner.subtitle}</p>
            </Link>
          ))}
          <Link href="/help" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Open help center</p>
            <p className="mt-2 text-sm text-slate-500">Try self-service articles first for common order, return, and account questions.</p>
          </Link>
        </div>
      </section>

      {accountCampaigns.length > 0 && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Helpful buyer campaigns</h3>
              <p className="text-sm text-slate-500">Relevant marketplace actions stay close while you resolve service issues.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {accountCampaigns.map((campaign) => (
              <Link key={campaign.slug} href={`/campaigns/${campaign.slug}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{campaign.eyebrow}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{campaign.title}</p>
                <p className="mt-2 text-sm text-slate-500">{campaign.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">New request</h3>
              <p className="text-sm text-slate-500">Use the editor below for a clearer ticket or callback brief.</p>
            </div>
          </div>

          {helpArticles.length > 0 && (
            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Try these articles first</p>
                  <p className="text-xs text-slate-500">Fast answers for common buyer issues.</p>
                </div>
                <Link href="/help" className="text-sm font-semibold text-blue-600 hover:underline">All help</Link>
              </div>
              <div className="mt-3 space-y-2">
                {helpArticles.slice(0, 3).map((article) => (
                  <Link key={article.slug} href={`/help/${article.slug}`} className="block rounded-xl border border-slate-200 bg-white px-3 py-3 hover:bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{article.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: 'TICKET' }))}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${form.type === 'TICKET' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                Support ticket
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: 'CALL_REQUEST' }))}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${form.type === 'CALL_REQUEST' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                Call request
              </button>
            </div>

            <input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Subject" />
            <input value={form.orderId} onChange={(event) => setForm((prev) => ({ ...prev, orderId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Order ID (optional)" />
            <input value={form.storeId} onChange={(event) => setForm((prev) => ({ ...prev, storeId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Store ID (optional)" />

            {form.type === 'CALL_REQUEST' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.callbackPhone} onChange={(event) => setForm((prev) => ({ ...prev, callbackPhone: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Callback phone" />
                <input value={form.callbackWindow} onChange={(event) => setForm((prev) => ({ ...prev, callbackWindow: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Preferred time window" />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">{form.type === 'CALL_REQUEST' ? 'Callback brief' : 'Issue details'}</p>
              <RichTextEditor
                value={form.message}
                onChange={(value) => setForm((prev) => ({ ...prev, message: value }))}
                output="text"
                placeholder={form.type === 'CALL_REQUEST' ? 'Explain what you need help with before the callback.' : 'Describe the issue clearly so support can act faster.'}
                minHeightClassName="min-h-[180px]"
              />
            </div>

            <button onClick={() => void createRequest()} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : form.type === 'CALL_REQUEST' ? 'Request call' : 'Open ticket'}
            </button>
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">My requests</h3>
              <p className="text-sm text-slate-500">All buyer tickets and callback requests stay in one tracked queue.</p>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading support requests...</p>
          ) : requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No support requests yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-black text-slate-950">{request.subject}</h4>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                          {request.meta?.type === 'CALL_REQUEST' ? 'Call request' : 'Ticket'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.order ? `Order ${request.order.id}` : 'General support'}
                        {request.store ? ` | ${request.store.name}` : ''}
                      </p>
                      {request.meta?.type === 'CALL_REQUEST' && (
                        <p className="mt-1 text-xs text-blue-700">
                          Callback: {request.meta.callbackPhone || 'Not provided'}
                          {request.meta.callbackWindow ? ` | ${request.meta.callbackWindow}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{request.status}</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {request.thread?.messages?.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500">{entry.sender?.name || entry.sender?.email || entry.sender?.role || 'Support'}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.body}</p>
                      </div>
                    ))}
                  </div>

                  {request.resolutionNote ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Resolution: {request.resolutionNote}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <RichTextEditor
                      value={replyDrafts[request.id] ?? ''}
                      onChange={(value) => setReplyDrafts((prev) => ({ ...prev, [request.id]: value }))}
                      output="text"
                      placeholder="Add a reply"
                      minHeightClassName="min-h-[110px]"
                    />
                    <button onClick={() => void reply(request.id)} disabled={saving} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">
                      Reply
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
