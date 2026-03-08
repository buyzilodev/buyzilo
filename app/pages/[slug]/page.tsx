import type { Metadata } from 'next'
import { buildSeoMetadata, stripHtml } from '@/lib/helpers/seo'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPageAccessDecision, getSessionAccessViewerContext } from '@/lib/actions/accessRestrictions'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await prisma.customPage.findFirst({
    where: { slug, isActive: true },
  })

  if (!page) {
    return buildSeoMetadata({
      title: 'Page Not Found | Buyzilo',
      description: 'The requested page could not be found.',
      path: `/pages/${slug}`,
      noIndex: true,
    })
  }

  return buildSeoMetadata({
    title: `${page.title} | Buyzilo`,
    description: stripHtml(page.content).slice(0, 160) || `${page.title} on Buyzilo.`,
    path: `/pages/${page.slug}`,
    keywords: [page.title, page.slug, 'buyzilo'].filter(Boolean),
  })
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const viewer = await getSessionAccessViewerContext()
  const page = await prisma.customPage.findFirst({
    where: { slug, isActive: true },
  })

  if (!page) notFound()
  const accessDecision = await getPageAccessDecision(viewer, page.slug)
  if (!accessDecision.allowed) {
    redirect(viewer.isAuthenticated ? '/unauthorized' : `/login?next=${encodeURIComponent(`/pages/${page.slug}`)}`)
  }

  const renderContent = (content: string) => {
    return content
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-black text-slate-800 mb-4 mt-8">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-700 mb-3 mt-6">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-700 mb-2 mt-4">$1</h3>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal mb-1">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc mb-1">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p class="text-gray-600 leading-relaxed mb-4">')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 text-sm text-gray-500">
          <Link href="/" className="text-blue-600 hover:underline">Home</Link>
          <span>/</span>
          <span>{page.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          <p className="mb-6 text-sm text-gray-400">
            Last updated: {new Date(page.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: `<p class="text-gray-600 leading-relaxed mb-4">${renderContent(page.content)}</p>` }}
          />
        </div>
      </div>
    </div>
  )
}
