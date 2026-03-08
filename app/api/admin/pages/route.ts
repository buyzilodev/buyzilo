import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pages = await prisma.customPage.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(pages)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, slug, content, isActive } = await req.json()
    const safeSlug = String(slug ?? title ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    if (!title || !safeSlug || !content) {
      return NextResponse.json({ error: 'Title, slug and content are required' }, { status: 400 })
    }

    const exists = await prisma.customPage.findUnique({ where: { slug: safeSlug } })
    if (exists) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    const page = await prisma.customPage.create({
      data: { title, slug: safeSlug, content, isActive: isActive !== false }
    })

    return NextResponse.json({ success: true, page, url: `/pages/${safeSlug}` })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, title, slug, content, isActive } = await req.json()
    const safeSlug = String(slug ?? title ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    if (!id || !title || !safeSlug || !content) {
      return NextResponse.json({ error: 'Id, title, slug and content are required' }, { status: 400 })
    }

    const conflict = await prisma.customPage.findFirst({
      where: { slug: safeSlug, NOT: { id } },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    const page = await prisma.customPage.update({
      where: { id },
      data: { title, slug: safeSlug, content, isActive }
    })

    return NextResponse.json({ success: true, page, url: `/pages/${safeSlug}` })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await req.json()
    await prisma.customPage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
