const colorByStatus: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  VENDOR: 'bg-emerald-100 text-emerald-700',
  BUYER: 'bg-slate-100 text-slate-700',
  SUPPORT: 'bg-amber-100 text-amber-700',
  FINANCE: 'bg-orange-100 text-orange-700',
  MODERATOR: 'bg-pink-100 text-pink-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REQUESTED: 'bg-amber-100 text-amber-700',
  PAID: 'bg-blue-100 text-blue-700',
  BANNED: 'bg-rose-100 text-rose-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  OPEN: 'bg-amber-100 text-amber-700',
  NEW: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-slate-100 text-slate-700',
  RESPONDED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-1 text-[11px] font-semibold ${colorByStatus[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}
