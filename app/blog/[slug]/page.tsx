import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildSeoMetadata, stripHtml } from '@/lib/helpers/seo'
import { parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { prisma } from '@/lib/prisma'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    include: { tags: { include: { tag: true } } },
  })

  if (!post) {
    return buildSeoMetadata({
      title: 'Post Not Found | Buyzilo',
      description: 'The requested blog post could not be found.',
      path: `/blog/${slug}`,
      noIndex: true,
    })
  }

  return buildSeoMetadata({
    title: `${post.title} | Buyzilo Blog`,
    description: post.excerpt?.trim() || stripHtml(post.content).slice(0, 160) || `${post.title} on the Buyzilo blog.`,
    path: `/blog/${post.slug}`,
    keywords: post.tags.map((entry) => entry.tag.name),
  })
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, relatedPosts, storefrontConfig] = await Promise.all([
    prisma.blogPost.findFirst({
      where: { slug, published: true },
      include: {
        author: { select: { name: true, email: true } },
        comments: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } },
        },
        tags: { include: { tag: true } },
      },
    }),
    prisma.blogPost.findMany({
      where: { slug: { not: slug }, published: true },
      select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    }),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
  ])

  if (!post) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
      <div className="mx-auto max-w-[1320px] px-4 py-8">
        <div className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-700">Home</Link> /{' '}
          <Link href="/blog" className="hover:text-slate-700">Blog</Link> /{' '}
          <span className="text-slate-700">{post.title}</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#2563eb_55%,#7c3aed_100%)] px-6 py-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{storefrontConfig.templates.blogHeroTitle}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight lg:text-5xl">{post.title}</h1>
          <p className="mt-3 text-sm text-white/80">
            {post.author?.name ?? post.author?.email ?? 'Buyzilo team'} • {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'}
          </p>
          {post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((entry) => (
                <span key={entry.tagId} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {entry.tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: post.content }} />
          </article>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">More stories</h2>
              <div className="mt-4 space-y-3">
                {relatedPosts.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.excerpt || 'Marketplace editorial story.'}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">Comments</h2>
              <div className="mt-4 space-y-3">
                {post.comments.map((comment) => (
                  <article key={comment.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">{comment.content}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {comment.user?.name ?? comment.user?.email ?? comment.authorName ?? 'Anonymous'} • {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </article>
                ))}
                {post.comments.length === 0 ? <p className="text-sm text-slate-500">No approved comments yet.</p> : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
