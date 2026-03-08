import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addWishlistItem, getUserWishlist, removeWishlistItem } from '@/lib/actions/wishlist'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await getUserWishlist(userId)
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      createdAt: item.createdAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.variant?.price ?? item.product.price,
        comparePrice: item.variant?.comparePrice ?? item.product.comparePrice,
        images: item.product.images,
        store: item.product.store,
        category: item.product.category,
      },
      variant: item.variant
        ? {
          id: item.variant.id,
          title: item.variant.title,
          price: item.variant.price,
          comparePrice: item.variant.comparePrice,
          image: item.variant.image,
          stock: item.variant.stock,
        }
        : null,
    })),
  })
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() as { productId?: string; variantId?: string }
    if (!body.productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    await addWishlistItem(userId, body.productId, body.variantId)
    return GET()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add wishlist item'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const variantId = searchParams.get('variantId') ?? undefined
  if (!productId) {
    return NextResponse.json({ error: 'productId query required' }, { status: 400 })
  }

  await removeWishlistItem(userId, productId, variantId)
  return GET()
}
