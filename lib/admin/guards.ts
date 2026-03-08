import { redirect } from 'next/navigation'
import type { AdminWorkspaceIdentity } from '@/lib/admin/dashboard'
import { canViewAdminWorkspace, getCurrentAdminWorkspaceIdentity } from '@/lib/admin/dashboard'
import type { Permission } from '@/lib/permissions'
import { hasPermission } from '@/lib/permissions'

function hasAnyPermission(identity: AdminWorkspaceIdentity, permissions: Permission[]) {
  return permissions.some((permission) => hasPermission(identity.role, identity.permissions, permission))
}

export async function requireAdminWorkspace(): Promise<AdminWorkspaceIdentity> {
  const identity = await getCurrentAdminWorkspaceIdentity()
  if (!identity || !canViewAdminWorkspace(identity)) {
    redirect('/unauthorized')
  }
  return identity
}

export async function requireAdminPermission(permission: Permission): Promise<AdminWorkspaceIdentity> {
  const identity = await requireAdminWorkspace()
  if (!hasPermission(identity.role, identity.permissions, permission)) {
    redirect('/unauthorized')
  }
  return identity
}

export async function requireAnyAdminPermission(permissions: Permission[]): Promise<AdminWorkspaceIdentity> {
  const identity = await requireAdminWorkspace()
  if (!hasAnyPermission(identity, permissions)) {
    redirect('/unauthorized')
  }
  return identity
}
