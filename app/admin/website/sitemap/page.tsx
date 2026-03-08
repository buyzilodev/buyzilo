import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminWebsiteSitemapPage() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
  const [productsCount, categoriesCount, storesCount, pagesCount, postsCount] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.store.count({ where: { status: 'APPROVED' } }).catch(() => 0),
    prisma.customPage.count({ where: { isActive: true } }).catch(() => 0),
    prisma.blogPost.count({ where: { published: true } }).catch(() => 0),
  ])

  const rows = [
    { label: 'Products', value: productsCount, example: '/products/[id]' },
    { label: 'Categories', value: categoriesCount, example: '/products?category=slug' },
    { label: 'Stores', value: storesCount, example: '/store/[slug]' },
    { label: 'Custom Pages', value: pagesCount, example: '/pages/[slug]' },
    { label: 'Blog Posts', value: postsCount, example: '/blog/[slug]' },
  ]

  return (
    <AdminLayout title="Sitemap" subtitle="Sitemap coverage and indexed content summary">
      <SubsectionNav items={adminWebsiteSubsections} />

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Sitemap Summary</h3>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Live Endpoints</p>
            <p className="mt-2 text-sm text-slate-700">
              Sitemap: <a href={`${baseUrl}/sitemap.xml`} className="font-mono text-blue-600 hover:underline">{`${baseUrl}/sitemap.xml`}</a>
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Robots: <a href={`${baseUrl}/robots.txt`} className="font-mono text-blue-600 hover:underline">{`${baseUrl}/robots.txt`}</a>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Coverage</p>
            <p className="mt-2 text-sm text-slate-700">
              Public sitemap now indexes storefront roots, approved products, categories, approved stores, active custom pages, and published blog posts.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2">Section</th>
                <th className="pb-2">Entries</th>
                <th className="pb-2">Route Pattern</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{row.label}</td>
                  <td className="py-2 font-semibold text-slate-900">{row.value}</td>
                  <td className="py-2 font-mono text-xs text-slate-500">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </AdminLayout>
  )
}
