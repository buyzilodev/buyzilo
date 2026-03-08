import { ADMIN_ROLES, VENDOR_PANEL_ROLES, type PlatformRole } from '@/lib/constants/roles'

export function isRoleAllowed(role: string | undefined, allowed: readonly PlatformRole[]) {
  if (!role) return false
  return allowed.includes(role as PlatformRole)
}

export function isAdminRole(role: string | undefined) {
  return isRoleAllowed(role, ADMIN_ROLES)
}

export function isVendorPanelRole(role: string | undefined) {
  return isRoleAllowed(role, VENDOR_PANEL_ROLES)
}
