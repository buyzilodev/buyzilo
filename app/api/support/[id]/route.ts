import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appendMessageToThread, ensureThreadParticipant } from '@/lib/actions/messages'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'SUPPORT'
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | null
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await req.json() as {
    status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
    resolutionNote?: string
    message?: string
  }

  const requestRecord = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      store: { select: { vendorId: true } },
    },
  })
  if (!requestRecord) {
    return NextResponse.json({ error: 'Support request not found' }, { status: 404 })
  }

  const isOwner = requestRecord.userId === user.id
  const isVendor = requestRecord.store?.vendorId === user.id
  const isAdmin = isAdminRole(user.role)

  if (!isOwner && !isVendor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (body.message?.trim() && requestRecord.threadId) {
    await ensureThreadParticipant(requestRecord.threadId, user.id)
    await appendMessageToThread(requestRecord.threadId, user.id, body.message.trim())
  }

  const nextStatus = body.status ?? (body.message?.trim() && (isVendor || isAdmin) ? 'IN_PROGRESS' : undefined)

  const updated = await prisma.supportRequest.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(body.resolutionNote !== undefined ? { resolutionNote: body.resolutionNote?.trim() || null } : {}),
    },
  })

  return NextResponse.json({ success: true, request: updated })
}
