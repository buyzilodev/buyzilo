export function TableShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </article>
  )
}
