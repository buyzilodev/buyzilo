import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { appendMessageToThread, createThreadWithMessage } from '@/lib/actions/messages'
import { prisma } from '@/lib/prisma'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [threads, vendors] = await Promise.all([
    prisma.messageThread.findMany({
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        messages: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.store.findMany({
      include: {
        vendor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    threads: threads.filter((thread) => thread.participants.some((participant) => participant.user.role === 'VENDOR')),
    vendors,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const actorId = (session?.user as { id?: string; role?: string } | null)?.id
  const role = (session?.user as { role?: string } | null)?.role
  if (!actorId || !isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    threadId?: string
    vendorUserId?: string
    subject?: string
    message?: string
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (body.threadId) {
    await appendMessageToThread(body.threadId, actorId, body.message.trim())
  } else {
    if (!body.vendorUserId || !body.subject?.trim()) {
      return NextResponse.json({ error: 'vendorUserId and subject are required' }, { status: 400 })
    }
    await createThreadWithMessage({
      subject: body.subject.trim(),
      category: 'VENDOR_COMMUNICATION',
      participantIds: [actorId, body.vendorUserId],
      senderId: actorId,
      body: body.message.trim(),
    })
  }

  return GET()
}
