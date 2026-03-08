type StatCardProps = {
  label: string
  value: string
  hint?: string
  delta?: string
}

export function StatCard({ label, value, hint, delta }: StatCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">{hint}</p>
        {delta && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{delta}</span>}
      </div>
    </article>
  )
}
