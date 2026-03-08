import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminCustomerSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminCustomerMessageCenterPage() {
  const threads = await prisma.messageThread
    .findMany({
      include: {
        _count: { select: { participants: true, messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    })
    .catch(() => [])

  return (
    <AdminLayout title="Customer Message Center" subtitle="Customer support and communication thread index">
      <SubsectionNav items={adminCustomerSubsections} />

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Conversation Threads</h3>
        <div className="space-y-2">
          {threads.map((thread) => (
            <div key={thread.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-700">{thread.subject}</p>
                <span className="text-xs text-slate-500">{new Date(thread.updatedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {thread._count.participants} participants, {thread._count.messages} messages, category: {thread.category}
              </p>
            </div>
          ))}
          {threads.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No conversations yet. Messaging schema is ready and waiting for thread creation UI.
            </p>
          )}
        </div>
      </article>
    </AdminLayout>
  )
}
