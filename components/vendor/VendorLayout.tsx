import { VendorSidebar } from '@/components/vendor/VendorSidebar'

export function VendorLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <VendorSidebar />
      <main className="ml-64 p-6">
        <header className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  )
}
