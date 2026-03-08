import { getServerSession } from 'next-auth'
import type { DashboardData, DashboardTaskItem } from '@/lib/admin/types'
import { authOptions } from '@/lib/auth'
import type { Permission } from '@/lib/permissions'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getAdminDashboardData } from '@/lib/queries/admin/dashboard'

export type AdminWorkspaceIdentity = {
  id?: string
  role: string
  permissions: string[]
}

type WorkspaceSummary = {
  totalAttention: number
  sectionBadges: Record<string, number>
  pageBadges: Record<string, number>
  urgentItems: DashboardTaskItem[]
}

const taskPermissionMap: Record<string, Permission> = {
  '/admin/products/manage': 'approve_products',
  '/admin/vendors': 'manage_vendors',
  '/admin/orders/returns': 'manage_orders',
  '/admin/orders/call-requests': 'manage_orders',
  '/admin/products/quotes': 'manage_products',
  '/admin/vendors/accounting': 'manage_finance',
  '/admin/coupons': 'manage_marketing',
  '/admin/vendors/procurement': 'manage_vendors',
  '/admin/vendors/message-center': 'manage_vendors',
  '/admin/orders/shipments': 'manage_orders',
  '/admin/reviews/discussion': 'approve_products',
  '/admin/reviews': 'approve_products',
  '/admin/pages': 'manage_content',
  '/admin/website/blog': 'manage_content',
  '/admin/website/comments': 'manage_content',
}

function canAccessTask(identity: AdminWorkspaceIdentity, href: string) {
  const requiredPermission = taskPermissionMap[href]
  if (!requiredPermission) return true
  return hasPermission(identity.role, identity.permissions, requiredPermission)
}

function filterTaskItems(items: DashboardTaskItem[], identity?: AdminWorkspaceIdentity) {
  if (!identity) return items
  return items.filter((item) => canAccessTask(identity, item.href))
}

function countForHref(items: DashboardTaskItem[], href: string) {
  return items.find((item) => item.href === href)?.count ?? 0
}

export function canViewAdminWorkspace(identity: AdminWorkspaceIdentity | null | undefined) {
  if (!identity?.role) return false
  return hasPermission(identity.role, identity.permissions, 'view_dashboard')
}

export async function getCurrentAdminWorkspaceIdentity(): Promise<AdminWorkspaceIdentity | null> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  const role = (session?.user as { role?: string } | null)?.role
  if (!userId || !role) return null

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

export function filterDashboardData(data: DashboardData, identity?: AdminWorkspaceIdentity): DashboardData {
  if (!identity) return data

  const canManageOrders = hasPermission(identity.role, identity.permissions, 'manage_orders')
  const canManageProducts = hasPermission(identity.role, identity.permissions, 'manage_products')
  const canApproveProducts = hasPermission(identity.role, identity.permissions, 'approve_products')
  const canManageUsers = hasPermission(identity.role, identity.permissions, 'manage_users')
  const canManageVendors = hasPermission(identity.role, identity.permissions, 'manage_vendors')
  const canViewReports = hasPermission(identity.role, identity.permissions, 'view_reports')
  const canManageFinance = hasPermission(identity.role, identity.permissions, 'manage_finance')
  const canManageMarketing = hasPermission(identity.role, identity.permissions, 'manage_marketing')

  return {
    ...data,
    totalSales: canViewReports || canManageFinance ? data.totalSales : 0,
    totalOrders: canManageOrders ? data.totalOrders : 0,
    totalVendors: canManageVendors ? data.totalVendors : 0,
    activeProducts: canManageProducts || canApproveProducts ? data.activeProducts : 0,
    registeredCustomers: canManageUsers ? data.registeredCustomers : 0,
    completeOrders: canManageOrders ? data.completeOrders : 0,
    openOrders: canManageOrders ? data.openOrders : 0,
    vendorSalesTotal: canManageFinance || canViewReports ? data.vendorSalesTotal : 0,
    overdueProcurement: canManageVendors ? data.overdueProcurement : 0,
    procurementAlertThreads: canManageVendors ? data.procurementAlertThreads : 0,
    loyaltyCoupons: canManageMarketing ? data.loyaltyCoupons : 0,
    referredSignups: canManageMarketing ? data.referredSignups : 0,
    outstandingStoreCredit: canManageFinance ? data.outstandingStoreCredit : 0,
    recentOrders: canManageOrders ? data.recentOrders : [],
    salesTrend: canViewReports || canManageFinance ? data.salesTrend : [],
    operationsQueue: filterTaskItems(data.operationsQueue, identity),
    merchandisingQueue: filterTaskItems(data.merchandisingQueue, identity),
    contentQueue: filterTaskItems(data.contentQueue, identity),
  }
}

export function buildWorkspaceSummary(data: DashboardData): WorkspaceSummary {
  const pageBadges: Record<string, number> = {
    '/admin/products/manage': countForHref(data.operationsQueue, '/admin/products/manage'),
    '/admin/vendors': countForHref(data.operationsQueue, '/admin/vendors'),
    '/admin/orders/returns': countForHref(data.operationsQueue, '/admin/orders/returns'),
    '/admin/orders/call-requests': countForHref(data.operationsQueue, '/admin/orders/call-requests'),
    '/admin/products/quotes': countForHref(data.operationsQueue, '/admin/products/quotes'),
    '/admin/vendors/accounting': countForHref(data.operationsQueue, '/admin/vendors/accounting'),
    '/admin/orders/shipments': countForHref(data.merchandisingQueue, '/admin/orders/shipments'),
    '/admin/reviews/discussion': countForHref(data.merchandisingQueue, '/admin/reviews/discussion'),
    '/admin/reviews': countForHref(data.merchandisingQueue, '/admin/reviews'),
    '/admin/vendors/procurement': countForHref(data.merchandisingQueue, '/admin/vendors/procurement'),
    '/admin/vendors/message-center': countForHref(data.merchandisingQueue, '/admin/vendors/message-center'),
    '/admin/website/blog': countForHref(data.contentQueue, '/admin/website/blog'),
    '/admin/website/comments': countForHref(data.contentQueue, '/admin/website/comments'),
  }

  const sectionBadges: Record<string, number> = {
    Home: [...data.operationsQueue, ...data.merchandisingQueue, ...data.contentQueue].reduce((sum, item) => sum + item.count, 0),
    Orders:
      (pageBadges['/admin/orders/returns'] ?? 0) +
      (pageBadges['/admin/orders/call-requests'] ?? 0) +
      (pageBadges['/admin/orders/shipments'] ?? 0),
    Products:
      (pageBadges['/admin/products/manage'] ?? 0) +
      (pageBadges['/admin/products/quotes'] ?? 0) +
      (pageBadges['/admin/reviews/discussion'] ?? 0) +
      (pageBadges['/admin/reviews'] ?? 0),
    Vendors:
      (pageBadges['/admin/vendors'] ?? 0) +
      (pageBadges['/admin/vendors/accounting'] ?? 0) +
      (pageBadges['/admin/vendors/procurement'] ?? 0) +
      (pageBadges['/admin/vendors/message-center'] ?? 0),
    Website:
      (pageBadges['/admin/website/blog'] ?? 0) +
      (pageBadges['/admin/website/comments'] ?? 0),
  }

  const urgentItems = [...data.operationsQueue, ...data.merchandisingQueue, ...data.contentQueue]
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)

  return {
    totalAttention: urgentItems.reduce((sum, item) => sum + item.count, 0),
    sectionBadges,
    pageBadges,
    urgentItems,
  }
}

export async function getDashboardData(identity?: AdminWorkspaceIdentity): Promise<DashboardData> {
  const data = await getAdminDashboardData()
  return filterDashboardData(data, identity)
}

export async function getWorkspaceSummary(identity?: AdminWorkspaceIdentity): Promise<WorkspaceSummary> {
  const data = await getDashboardData(identity)
  return buildWorkspaceSummary(data)
}
