import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword?: string
    newPassword?: string
  }
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  if (!user?.password) {
    return NextResponse.json({ error: 'Password login not configured for this account' }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  return NextResponse.json({ success: true })
}
