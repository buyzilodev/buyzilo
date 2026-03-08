import CheckoutForm from '@/components/store/CheckoutForm'

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Checkout</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Complete your order</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review shipping, payment, rewards, and store-credit details before placing the order.
          </p>
        </section>
        <CheckoutForm />
      </div>
    </div>
  )
}
