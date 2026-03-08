import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or was moved."
        actionHref="/"
        actionLabel="Back to homepage"
      />
      <div className="mt-4 text-center text-xs text-slate-500">
        or <Link href="/products" className="text-blue-600 hover:underline">browse products</Link>
      </div>
    </div>
  )
}
