import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listAdminQuoteRequests, updateQuoteRequest } from '@/lib/actions/productCommercial'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

async function getAdminActor() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.role || !isAdminRole(user.role)) {
    return null
  }
  return user
}

export async function GET() {
  const actor = await getAdminActor()
  if (!actor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await listAdminQuoteRequests()
  return NextResponse.json({ requests })
}

export async function PATCH(req: Request) {
  try {
    const actor = await getAdminActor()
    if (!actor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as {
      id?: string
      status?: 'NEW' | 'RESPONDED' | 'CLOSED'
      responseMessage?: string
      responsePrice?: number | null
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Quote request ID is required' }, { status: 400 })
    }

    const request = await updateQuoteRequest({
      id: body.id,
      actorUserId: actor.id ?? null,
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
