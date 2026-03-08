import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createQuoteRequest, listBuyerQuoteRequests } from '@/lib/actions/productCommercial'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await listBuyerQuoteRequests(userId)
  return NextResponse.json({ requests })
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | null)?.id ?? null
    const body = (await req.json()) as {
      productId?: string
      variantId?: string | null
      buyerName?: string
      buyerEmail?: string
      buyerPhone?: string
      message?: string
    }

    if (!body.productId || !body.message?.trim()) {
      return NextResponse.json({ error: 'Product and message are required' }, { status: 400 })
    }

    const request = await createQuoteRequest({
      productId: body.productId,
      variantId: body.variantId,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      buyerPhone: body.buyerPhone,
      message: body.message,
      userId,
    })

    return NextResponse.json({ success: true, request })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create quote request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
