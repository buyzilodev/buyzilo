import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { isAdminRole, isVendorPanelRole } from '@/lib/auth/guards'
import { hasPermission, type Permission } from '@/lib/permissions'

type AdminRouteRule = {
  prefix: string
  anyOf: Permission[]
}

const adminRouteRules: AdminRouteRule[] = [
  { prefix: '/admin/orders', anyOf: ['manage_orders'] },
  { prefix: '/admin/reports', anyOf: ['view_reports'] },
  { prefix: '/admin/products', anyOf: ['manage_products', 'approve_products'] },
  { prefix: '/admin/categories', anyOf: ['manage_products'] },
  { prefix: '/admin/features', anyOf: ['manage_products'] },
  { prefix: '/admin/filters', anyOf: ['manage_products'] },
  { prefix: '/admin/options', anyOf: ['manage_products'] },
  { prefix: '/admin/reviews', anyOf: ['approve_products'] },
  { prefix: '/admin/customers', anyOf: ['manage_users'] },
  { prefix: '/admin/managers', anyOf: ['manage_admins'] },
  { prefix: '/admin/vendors/accounting', anyOf: ['manage_finance'] },
  { prefix: '/admin/vendors', anyOf: ['manage_vendors'] },
  { prefix: '/admin/plans', anyOf: ['manage_vendors'] },
  { prefix: '/admin/coupons', anyOf: ['manage_marketing'] },
  { prefix: '/admin/marketing', anyOf: ['manage_marketing'] },
  { prefix: '/admin/frontend', anyOf: ['manage_content'] },
  { prefix: '/admin/website', anyOf: ['manage_content'] },
  { prefix: '/admin/pages', anyOf: ['manage_content'] },
  { prefix: '/admin/settings', anyOf: ['manage_settings'] },
  { prefix: '/admin/addons', anyOf: ['manage_settings'] },
  { prefix: '/admin', anyOf: ['view_dashboard'] },
]

function canAccessAdminPath(pathname: string, role: string | undefined, permissions: string[]) {
  if (!isAdminRole(role)) {
    return false
  }

  const rule = adminRouteRules
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((item) => pathname.startsWith(item.prefix))

  if (!rule || !role) {
    return true
  }

  return rule.anyOf.some((permission) => hasPermission(role, permissions, permission))
}

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const role = token?.role as string | undefined
    const permissions = (token?.permissions as string[] | undefined) ?? []

    if (pathname.startsWith('/admin') && !canAccessAdminPath(pathname, role, permissions)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/vendor') && !isVendorPanelRole(role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/dashboard') && !token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        if (
          pathname === '/' ||
          pathname.startsWith('/products') ||
          pathname.startsWith('/cart') ||
          pathname.startsWith('/checkout') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/forgot-password') ||
          pathname.startsWith('/reset-password') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/unauthorized') ||
          pathname.startsWith('/_next')
        ) {
          return true
        }

        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/vendor/:path*',
    '/dashboard/:path*',
    '/checkout/:path*',
    '/cart',
  ],
}
