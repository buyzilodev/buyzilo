import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddonManagedStorefrontPage } from '@/components/store/AddonManagedStorefrontPage'
import { getHelpCenterConfig } from '@/lib/actions/helpCenter'

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await getHelpCenterConfig()
  const category = config.categories.find((item) => item.slug === slug)

  if (category) {
    const articles = config.articles.filter((article) => article.published !== false && article.categorySlug === category.slug)
    return (
      <AddonManagedStorefrontPage
        pageHref="/help/[slug]"
        fallback={{
          title: 'Help Center',
          subtitle: 'Knowledge-base article and category route',
          inactiveTitle: 'Help article is unavailable',
          inactiveDescription: 'This help-center article route is currently unavailable.',
        }}
      >
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 py-8">
            <Link href="/help" className="text-sm font-semibold text-blue-600 hover:underline">Back to help center</Link>
            <h1 className="mt-3 text-4xl font-black text-slate-900">{category.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{category.description}</p>
            <div className="mt-6 grid gap-4">
              {articles.map((article) => (
                <article key={article.slug} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Link href={`/help/${article.slug}`} className="text-xl font-bold text-slate-900 hover:text-blue-600">{article.title}</Link>
                  <p className="mt-2 text-sm text-slate-500">{article.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </AddonManagedStorefrontPage>
    )
  }

  const article = config.articles.find((item) => item.slug === slug && item.published !== false)
  if (!article) notFound()
  const articleCategory = config.categories.find((item) => item.slug === article.categorySlug)

  return (
    <AddonManagedStorefrontPage
      pageHref="/help/[slug]"
      fallback={{
        title: 'Help Center',
        subtitle: 'Knowledge-base article and category route',
        inactiveTitle: 'Help article is unavailable',
        inactiveDescription: 'This help-center article route is currently unavailable.',
      }}
    >
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Link href="/help" className="hover:text-slate-700">Help center</Link>
              {articleCategory ? (
                <>
                  <span>/</span>
                  <Link href={`/help/${articleCategory.slug}`} className="hover:text-slate-700">{articleCategory.title}</Link>
                </>
              ) : null}
            </div>
            <h1 className="mt-4 text-4xl font-black text-slate-900">{article.title}</h1>
            <p className="mt-3 text-base text-slate-500">{article.excerpt}</p>
            <div className="prose mt-6 max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: article.content }} />
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Need more help?</p>
              <p className="mt-1 text-sm text-slate-500">Open the support desk if this article does not resolve the issue.</p>
              <Link href="/dashboard/support" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline">
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AddonManagedStorefrontPage>
  )
}
