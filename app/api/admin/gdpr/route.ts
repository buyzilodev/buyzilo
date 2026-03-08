import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminGdprDeletionRequests, processGdprDeletionRequest } from '@/lib/actions/gdpr'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await getAdminGdprDeletionRequests()
  return NextResponse.json({ requests })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const actor = session?.user as { id?: string; role?: string } | undefined
  if (!actor?.id || !isAdminRole(actor.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    userId?: string
    action?: 'APPROVE' | 'REJECT'
    resolutionNote?: string
  }

  if (!body.userId || !body.action) {
    return NextResponse.json({ error: 'userId and action are required' }, { status: 400 })
  }

  const request = await processGdprDeletionRequest({
    userId: body.userId,
    actorId: actor.id,
    action: body.action,
    resolutionNote: body.resolutionNote,
  })

  return NextResponse.json({ success: true, request })
}
