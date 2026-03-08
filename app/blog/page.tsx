import Link from 'next/link'
import { parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'
import { prisma } from '@/lib/prisma'

export default async function BlogListPage() {
  const [posts, storefrontConfig] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true },
      include: {
        author: { select: { name: true, email: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    }),
    prisma.siteSettings.findUnique({ where: { key: 'storefrontConfig' }, select: { value: true } }).then((row) => parseStorefrontConfig(row?.value)),
  ])

  const featured = posts[0] ?? null
  const secondary = posts.slice(1, 4)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_38%,#fffdf8_100%)]">
      <div className="mx-auto max-w-[1320px] px-4 py-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#2563eb_50%,#7c3aed_100%)] px-6 py-8 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Marketplace Journal</p>
              <h1 className="mt-2 text-4xl font-black lg:text-5xl">{storefrontConfig.templates.blogHeroTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80 lg:text-base">{storefrontConfig.templates.blogHeroSubtitle}</p>
            </div>
            <div className="grid gap-3">
              {secondary.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-black text-white">{post.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/75">{post.excerpt || 'Editorial update from the Buyzilo team.'}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {featured ? (
          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Featured story</p>
            <Link href={`/blog/${featured.slug}`} className="mt-2 block text-3xl font-black text-slate-950 hover:text-blue-600">
              {featured.title}
            </Link>
            <p className="mt-2 text-sm text-slate-500">
              {featured.author?.name ?? featured.author?.email ?? 'Buyzilo team'} • {featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString() : '-'} • {featured._count.comments} comments
            </p>
            {featured.excerpt ? <p className="mt-4 max-w-3xl text-sm text-slate-600">{featured.excerpt}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {featured.tags.map((entry) => (
                <span key={entry.tagId} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {entry.tag.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {post.author?.name ?? post.author?.email ?? 'Buyzilo team'}
              </p>
              <Link href={`/blog/${post.slug}`} className="mt-2 block text-2xl font-black text-slate-950 hover:text-blue-600">
                {post.title}
              </Link>
              <p className="mt-2 text-sm text-slate-500">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'} • {post._count.comments} comments
              </p>
              {post.excerpt ? <p className="mt-4 text-sm text-slate-600">{post.excerpt}</p> : null}
              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((entry) => (
                    <span key={entry.tagId} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {entry.tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {posts.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No published blog posts yet.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
