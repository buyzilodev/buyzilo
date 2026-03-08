import { PLATFORM_ROLES } from '@/lib/constants/roles'

export type Permission =
  | 'view_dashboard'
  | 'manage_orders'
  | 'manage_products'
  | 'approve_products'
  | 'manage_users'
  | 'manage_vendors'
  | 'view_reports'
  | 'manage_finance'
  | 'manage_marketing'
  | 'manage_content'
  | 'manage_settings'
  | 'manage_admins'

export const RolePermissions: Record<string, Permission[]> = {
  ADMIN: [
    'view_dashboard',
    'manage_orders',
    'manage_products',
    'approve_products',
    'manage_users',
    'manage_vendors',
    'view_reports',
    'manage_finance',
    'manage_marketing',
    'manage_content',
    'manage_settings',
    'manage_admins',
  ],
  MANAGER: [
    'view_dashboard',
    'manage_orders',
    'manage_products',
    'approve_products',
    'manage_vendors',
    'view_reports',
    'manage_marketing',
    'manage_content',
  ],
  SUPPORT: [
    'view_dashboard',
    'manage_orders',
    'manage_users',
  ],
  FINANCE: [
    'view_dashboard',
    'view_reports',
    'manage_finance',
  ],
  MODERATOR: [
    'view_dashboard',
    'manage_products',
    'approve_products',
    'manage_content',
  ],
}

export function hasPermission(
  userRole: string,
  userPermissions: string[],
  permission: Permission
): boolean {
  if (!PLATFORM_ROLES.includes(userRole as (typeof PLATFORM_ROLES)[number])) {
    return userPermissions.includes(permission)
  }
  const rolePerms = RolePermissions[userRole] || []
  return rolePerms.includes(permission) || userPermissions.includes(permission)
}
