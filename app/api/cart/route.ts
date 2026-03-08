import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  addItemToUserCart,
  getUserCartWithItems,
  removeUserCartItem,
  updateUserCartItem,
} from '@/lib/actions/cart'
import { getProductMetaMap } from '@/lib/helpers/productMeta'
import { normalizeUnitPricing } from '@/lib/helpers/unitPricing'
import { cartQuerySchema } from '@/lib/validators/cart'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] })
  }

  const userId = (session.user as { id: string }).id
  const cart = await getUserCartWithItems(userId)
  const productMetaMap = await getProductMetaMap((cart?.items ?? []).map((item) => item.productId))

  const items = (cart?.items ?? []).map((i) => ({
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    quantity: i.quantity,
    product: {
      id: i.product.id,
      name: i.product.name,
      slug: i.product.slug,
      price: i.variant?.price ?? i.product.price,
      images: i.product.images,
      unitPricing: normalizeUnitPricing(productMetaMap.get(i.productId)?.unitPricing),
      store: i.product.store,
    },
    variant: i.variant
      ? {
        id: i.variant.id,
        title: i.variant.title,
        image: i.variant.image,
        price: i.variant.price,
        comparePrice: i.variant.comparePrice,
        stock: i.variant.stock,
      }
      : null,
  }))

  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  try {
    const body = await req.json()
    await addItemToUserCart(userId, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid cart payload'
    const status = message === 'Product not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }

  return GET()
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  try {
    const body = await req.json()
    await updateUserCartItem(userId, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid cart payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return GET()
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const parsed = cartQuerySchema.safeParse({
    productId: searchParams.get('productId') ?? '',
    variantId: searchParams.get('variantId') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'productId query required' },
      { status: 400 }
    )
  }
  await removeUserCartItem(userId, parsed.data.productId, parsed.data.variantId)

  return GET()
}
