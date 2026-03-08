import { prisma } from '@/lib/prisma'

export async function createThreadWithMessage(input: {
  subject: string
  category?: string
  participantIds: string[]
  senderId?: string | null
  body: string
}) {
  const participants = Array.from(new Set(input.participantIds.filter(Boolean)))
  if (participants.length === 0) {
    throw new Error('At least one participant is required')
  }

  return prisma.messageThread.create({
    data: {
      subject: input.subject,
      category: input.category ?? 'GENERAL',
      participants: {
        create: participants.map((userId) => ({
          userId,
        })),
      },
      messages: {
        create: {
          senderId: input.senderId ?? null,
          body: input.body,
        },
      },
    },
  })
}

export async function appendMessageToThread(threadId: string, senderId: string | null | undefined, body: string) {
  await prisma.message.create({
    data: {
      threadId,
      senderId: senderId ?? null,
      body,
    },
  })

  await prisma.messageThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  })
}

export async function ensureThreadParticipant(threadId: string, userId: string) {
  await prisma.threadParticipant.upsert({
    where: {
      threadId_userId: {
        threadId,
        userId,
      },
    },
    update: {},
    create: {
      threadId,
      userId,
    },
  })
}

export async function getThreadsForUser(userId: string) {
  return prisma.messageThread.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
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
  })
}

export async function createModerationNotification(input: {
  vendorUserId: string
  actorId?: string | null
  subject: string
  body: string
  category?: string
}) {
  return createThreadWithMessage({
    subject: input.subject,
    category: input.category ?? 'MODERATION',
    participantIds: [input.vendorUserId, ...(input.actorId ? [input.actorId] : [])],
    senderId: input.actorId ?? null,
    body: input.body,
  })
}

export async function createOrAppendProcurementAlert(input: {
  purchaseOrderId: string
  vendorUserId: string
  actorId?: string | null
  subject?: string
  body: string
}) {
  const subject = input.subject?.trim() || `Procurement alert: PO ${input.purchaseOrderId}`
  const existing = await prisma.messageThread.findFirst({
    where: {
      category: 'PROCUREMENT_ALERT',
      subject,
      participants: {
        some: {
          userId: input.vendorUserId,
        },
      },
    },
  })

  if (existing) {
    await appendMessageToThread(existing.id, input.actorId ?? null, input.body)
    return existing
  }

  return createThreadWithMessage({
    subject,
    category: 'PROCUREMENT_ALERT',
    participantIds: [input.vendorUserId, ...(input.actorId ? [input.actorId] : [])],
    senderId: input.actorId ?? null,
    body: input.body,
  })
}
