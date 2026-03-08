import Link from 'next/link'
import { AddonManagedStorefrontPage } from '@/components/store/AddonManagedStorefrontPage'
import { getHelpCenterConfig } from '@/lib/actions/helpCenter'

export default async function HelpCenterPage() {
  const config = await getHelpCenterConfig()
  const featured = config.articles.filter((article) => article.published !== false && article.featured)

  return (
    <AddonManagedStorefrontPage
      pageHref="/help"
      fallback={{
        title: 'Help Center',
        subtitle: 'Get answers before you open a ticket',
        inactiveTitle: 'Help center is unavailable',
        inactiveDescription: 'This knowledge-base route is currently unavailable.',
      }}
    >
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_55%,#0f766e_100%)] px-6 py-10 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Help Center</p>
          <h1 className="mt-2 text-4xl font-black">Get answers before you open a ticket</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80">Browse support articles for orders, returns, account help, payments, and marketplace workflows.</p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {config.categories.map((category) => (
            <article key={category.slug} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-black text-slate-900">{category.title}</p>
              <p className="mt-2 text-sm text-slate-500">{category.description}</p>
              <Link href={`/help/${category.slug}`} className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
                Browse articles
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Featured articles</h2>
              <p className="text-sm text-slate-500">Start with the most common support topics.</p>
            </div>
            <Link href="/dashboard/support" className="text-sm font-semibold text-blue-600 hover:underline">
              Open support desk
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map((article) => (
              <Link key={article.slug} href={`/help/${article.slug}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                <p className="text-lg font-bold text-slate-900">{article.title}</p>
                <p className="mt-2 text-sm text-slate-500">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      </div>
    </AddonManagedStorefrontPage>
  )
}
