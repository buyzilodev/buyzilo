'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-lg font-semibold text-rose-800">Something went wrong</p>
            <p className="mt-2 text-sm text-rose-700">An unexpected error occurred while rendering this page.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Try again
              </button>
              <Link href="/" className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
