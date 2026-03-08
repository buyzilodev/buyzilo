import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.email || !role || !['ADMIN', 'MANAGER'].includes(role)) {
    return null
  }
  return session
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function parseTags(input: unknown) {
  if (!Array.isArray(input)) return []
  return input.map((item) => String(item).trim()).filter(Boolean).slice(0, 15)
}

export async function GET() {
  const session = await requireAdminOrManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const posts = await prisma.blogPost.findMany({
    include: {
      author: { select: { name: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(
    posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      published: post.published,
      publishedAt: post.publishedAt,
      author: post.author,
      commentsCount: post._count.comments,
      tags: post.tags.map((entry) => entry.tag.name),
      createdAt: post.createdAt,
    }))
  )
}

export async function POST(req: Request) {
  const session = await requireAdminOrManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()
  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const tags = parseTags(body.tags)
  const baseSlug = toSlug(String(body.slug ?? title))
  const existing = await prisma.blogPost.findUnique({ where: { slug: baseSlug } })
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug
  const authorId = (session.user as { id?: string }).id
  const published = Boolean(body.published)

  const post = await prisma.blogPost.create({
    data: {
      authorId,
      title,
      slug,
      excerpt: String(body.excerpt ?? '').trim() || null,
      content,
      metaTitle: String(body.metaTitle ?? '').trim() || null,
      metaDescription: String(body.metaDescription ?? '').trim() || null,
      published,
      publishedAt: published ? new Date() : null,
      tags: {
        create: tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { slug: toSlug(name) },
              create: { name, slug: toSlug(name) },
            },
          },
        })),
      },
    },
  })

  return NextResponse.json({ success: true, post })
}

export async function PUT(req: Request) {
  const session = await requireAdminOrManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = String(body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 })

  const current = await prisma.blogPost.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const title = String(body.title ?? current.title).trim()
  const content = String(body.content ?? current.content).trim()
  if (!title || !content) return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })

  let slug = String(body.slug ?? current.slug).trim()
  if (!slug) slug = toSlug(title)
  if (slug !== current.slug) {
    const exists = await prisma.blogPost.findFirst({ where: { slug, id: { not: id } }, select: { id: true } })
    if (exists) slug = `${slug}-${Date.now()}`
  }

  const tags = parseTags(body.tags)
  const published = Boolean(body.published)

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: String(body.excerpt ?? '').trim() || null,
      content,
      metaTitle: String(body.metaTitle ?? '').trim() || null,
      metaDescription: String(body.metaDescription ?? '').trim() || null,
      published,
      publishedAt: published ? current.publishedAt ?? new Date() : null,
      tags: {
        deleteMany: {},
        create: tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { slug: toSlug(name) },
              create: { name, slug: toSlug(name) },
            },
          },
        })),
      },
    },
  })

  return NextResponse.json({ success: true, post })
}

export async function DELETE(req: Request) {
  const session = await requireAdminOrManager()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 })

  await prisma.blogPost.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
