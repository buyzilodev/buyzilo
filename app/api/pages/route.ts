import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const pages = await prisma.customPage.findMany({
      where: { isActive: true },
      select: { title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(pages)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
