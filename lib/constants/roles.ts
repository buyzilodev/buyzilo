export const PLATFORM_ROLES = [
  'BUYER',
  'VENDOR',
  'ADMIN',
  'MANAGER',
  'SUPPORT',
  'FINANCE',
  'MODERATOR',
] as const

export type PlatformRole = (typeof PLATFORM_ROLES)[number]

export const ADMIN_ROLES: PlatformRole[] = ['ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR']
export const VENDOR_PANEL_ROLES: PlatformRole[] = ['VENDOR', 'ADMIN']
