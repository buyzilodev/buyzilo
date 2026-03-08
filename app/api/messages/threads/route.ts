import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { appendMessageToThread, getThreadsForUser } from '@/lib/actions/messages'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threads = await getThreadsForUser(userId)
  return NextResponse.json({ threads })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { threadId?: string; body?: string }
  if (!body.threadId || !body.body?.trim()) {
    return NextResponse.json({ error: 'threadId and body are required' }, { status: 400 })
  }

  await appendMessageToThread(body.threadId, userId, body.body.trim())
  const threads = await getThreadsForUser(userId)
  return NextResponse.json({ threads })
}
