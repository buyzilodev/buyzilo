import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserProductSubscriptions,
  getUserStockAlerts,
  markUserStockAlertsRead,
  subscribeUserToStockAlert,
  unsubscribeUserFromStockAlert,
} from '@/lib/actions/stockAlerts'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [alerts, subscriptions] = await Promise.all([
    getUserStockAlerts(userId),
    getUserProductSubscriptions(userId),
  ])

  return NextResponse.json({ alerts, subscriptions })
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { productId?: string; variantId?: string }
  if (!body.productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  try {
    const subscription = await subscribeUserToStockAlert(userId, body.productId, body.variantId)
    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to subscribe'
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
  const variantId = searchParams.get('variantId') || undefined
  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  await unsubscribeUserFromStockAlert(userId, productId, variantId)
  return NextResponse.json({ success: true })
}

export async function PATCH() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await markUserStockAlertsRead(userId)
  return NextResponse.json({ success: true })
}
