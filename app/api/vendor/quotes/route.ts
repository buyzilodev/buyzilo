import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listVendorQuoteRequests, updateQuoteRequest } from '@/lib/actions/productCommercial'

async function getVendorUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getVendorUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await listVendorQuoteRequests(userId)
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  try {
    const userId = await getVendorUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { store, requests } = await listVendorQuoteRequests(userId)
    const body = (await req.json()) as {
      id?: string
      status?: 'NEW' | 'RESPONDED' | 'CLOSED'
      responseMessage?: string
      responsePrice?: number | null
    }

    if (!store || !body.id || !requests.some((request) => request.id === body.id)) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 })
    }

    const request = await updateQuoteRequest({
      id: body.id,
      actorUserId: userId,
      status: body.status,
      responseMessage: body.responseMessage,
      responsePrice: body.responsePrice,
    })

    return NextResponse.json({ success: true, request })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update quote request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
