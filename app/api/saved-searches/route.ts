import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createSavedSearch,
  getSavedSearches,
  markSavedSearchSeen,
  removeSavedSearch,
} from '@/lib/actions/savedSearches'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searches = await getSavedSearches(userId)
  return NextResponse.json({ searches })
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    label?: string
    search?: string
    category?: string
    tag?: string
    sort?: 'default' | 'price-low' | 'price-high' | 'newest'
    minPrice?: number
    maxPrice?: number
    inStock?: boolean
    minRating?: number
  }

  const item = await createSavedSearch(userId, body)
  return NextResponse.json({ success: true, item })
}

export async function DELETE(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await removeSavedSearch(userId, id)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { id?: string }
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await markSavedSearchSeen(userId, body.id)
  return NextResponse.json({ success: true })
}
