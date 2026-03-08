import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import type { Permission } from '@/lib/permissions'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export type AdminApiIdentity = {
  id: string
  role: string
  permissions: string[]
}

async function getAdminApiIdentity(): Promise<AdminApiIdentity | null> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, permissions: true },
  })

  if (!user) return null
  return {
    id: user.id,
    role: user.role,
    permissions: user.permissions ?? [],
  }
}

export async function requireAdminApiPermission(permission: Permission) {
  const identity = await getAdminApiIdentity()
  if (!identity || !hasPermission(identity.role, identity.permissions, permission)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok: true as const,
    identity,
  }
}

export async function requireAnyAdminApiPermission(permissions: Permission[]) {
  const identity = await getAdminApiIdentity()
  if (!identity || !permissions.some((permission) => hasPermission(identity.role, identity.permissions, permission))) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok: true as const,
    identity,
  }
}
