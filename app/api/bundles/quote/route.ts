import { NextResponse } from 'next/server'
import { quoteEligibleBundles } from '@/lib/actions/bundles'

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      items?: Array<{ productId: string; variantId?: string; quantity: number; price: number; name?: string }>
    }

    const items = Array.isArray(body.items) ? body.items : []
    const quote = await quoteEligibleBundles(items)
    return NextResponse.json(quote)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to quote bundles'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
