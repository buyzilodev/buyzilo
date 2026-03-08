import { ReactNode } from 'react'

type SectionProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
