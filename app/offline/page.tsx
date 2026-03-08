import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Offline</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">You are viewing the storefront without a live connection</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/80">
            Buyzilo cached a lightweight storefront shell, but fresh catalog, pricing, cart, and account data still need an active network connection.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Available right now</p>
              <p className="mt-2 text-sm text-white/75">You can still navigate basic cached storefront surfaces that were loaded earlier.</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-black">Needs connection</p>
              <p className="mt-2 text-sm text-white/75">Live product data, checkout, account syncing, and new marketplace content require a reconnect.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Offline Mode</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Reconnect to continue with live marketplace data</h2>
          <p className="mt-2 text-sm text-slate-500">
            Once your connection returns, reload the page to restore current catalog, pricing, cart, and account state.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go home
            </Link>
            <Link
              href="/products"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open catalog
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
