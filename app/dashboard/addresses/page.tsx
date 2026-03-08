'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function DashboardAddressesPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [router, status])

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading addresses...</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1e293b_0%,#0f766e_48%,#14b8a6_100%)] p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Address workspace</p>
          <h2 className="mt-3 text-4xl font-black">Delivery readiness without hidden address state</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/80">
            Buyzilo still captures shipping details directly in checkout. This workspace makes that behavior explicit so delivery prep is clear instead of implied.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Saved book</p>
              <p className="mt-1 text-2xl font-black text-white">0</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Checkout capture</p>
              <p className="mt-1 text-2xl font-black text-white">Live</p>
            </article>
            <article className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Next step</p>
              <p className="mt-1 text-2xl font-black text-white">Cart</p>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/cart" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Go to cart</p>
            <p className="mt-2 text-sm text-slate-500">Shipping address entry appears in the live checkout path when you are ready to buy.</p>
          </Link>
          <Link href="/dashboard/orders" className="block rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
            <p className="text-lg font-black text-slate-950">Review past orders</p>
            <p className="mt-2 text-sm text-slate-500">Use order history as the current reference for where recent deliveries were sent.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">Current address model</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">Checkout-first capture</p>
            <p className="mt-2 text-sm text-slate-600">Address details are collected when an order is placed, which keeps the buying flow accurate to the current shipment.</p>
          </article>
          <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">No detached book yet</p>
            <p className="mt-2 text-sm text-slate-600">There is not a separate persistent address book at this time, so this page acts as a delivery-readiness checkpoint.</p>
          </article>
          <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">Order-backed reference</p>
            <p className="mt-2 text-sm text-slate-600">Past orders remain the current operational record for where purchases were delivered.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
