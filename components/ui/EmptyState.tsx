import Link from 'next/link'

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
