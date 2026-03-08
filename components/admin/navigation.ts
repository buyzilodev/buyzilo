import type { Permission } from '@/lib/permissions'

export type AdminNavItem = {
  label: string
  href: string
  requiredPermission?: Permission
  addonId?: string
}

export type AdminNavSection = {
  label: string
  href: string
  children?: AdminNavItem[]
  placement?: 'main' | 'bottom'
  requiredPermission?: Permission
  addonId?: string
}

export const adminNavSections: AdminNavSection[] = [
  {
    label: 'Home',
    href: '/admin',
    requiredPermission: 'view_dashboard',
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    requiredPermission: 'manage_orders',
    children: [
      { label: 'Orders', href: '/admin/orders', requiredPermission: 'manage_orders' },
      { label: 'Returns', href: '/admin/orders/returns', requiredPermission: 'manage_orders' },
      { label: 'Sales Reports', href: '/admin/reports', requiredPermission: 'view_reports' },
      { label: 'Shipments', href: '/admin/orders/shipments', requiredPermission: 'manage_orders' },
      { label: 'Live Carts', href: '/admin/orders/live-carts', requiredPermission: 'manage_orders' },
      { label: 'Support Desk', href: '/admin/orders/call-requests', requiredPermission: 'manage_orders' },
    ],
  },
  {
    label: 'Products',
    href: '/admin/products/manage',
    requiredPermission: 'manage_products',
    children: [
      { label: 'New Product', href: '/admin/products/new', requiredPermission: 'manage_products' },
      { label: 'Products', href: '/admin/products/manage', requiredPermission: 'manage_products' },
      { label: 'Quote Requests', href: '/admin/products/quotes', requiredPermission: 'manage_products' },
      { label: 'Advanced Import', href: '/admin/products/import', requiredPermission: 'manage_products' },
      { label: 'Categories', href: '/admin/categories', requiredPermission: 'manage_products' },
      { label: 'Features', href: '/admin/features', requiredPermission: 'manage_products' },
      { label: 'Filters', href: '/admin/filters', requiredPermission: 'manage_products' },
      { label: 'Options', href: '/admin/options', requiredPermission: 'manage_products' },
      { label: 'Reviews', href: '/admin/reviews', requiredPermission: 'approve_products', addonId: 'discussion' },
      { label: 'Discussion', href: '/admin/reviews/discussion', requiredPermission: 'approve_products', addonId: 'discussion' },
    ],
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    requiredPermission: 'manage_users',
    children: [
      { label: 'Customers', href: '/admin/customers', requiredPermission: 'manage_users' },
      { label: 'Privacy', href: '/admin/customers/privacy', requiredPermission: 'manage_users' },
      { label: 'Administrators', href: '/admin/managers', requiredPermission: 'manage_admins' },
      { label: 'User Groups', href: '/admin/customers/user-groups', requiredPermission: 'manage_users' },
      { label: 'Message Center', href: '/admin/customers/message-center', requiredPermission: 'manage_users' },
    ],
  },
  {
    label: 'Vendors',
    href: '/admin/vendors',
    requiredPermission: 'manage_vendors',
    children: [
      { label: 'Vendors', href: '/admin/vendors', requiredPermission: 'manage_vendors' },
      { label: 'Vendor Terms', href: '/admin/vendors/terms', requiredPermission: 'manage_vendors' },
      { label: 'Accounting', href: '/admin/vendors/accounting', requiredPermission: 'manage_finance' },
      { label: 'Procurement', href: '/admin/vendors/procurement', requiredPermission: 'manage_vendors' },
      { label: 'Vendor Plans', href: '/admin/plans', requiredPermission: 'manage_vendors' },
      { label: 'Message Center', href: '/admin/vendors/message-center', requiredPermission: 'manage_vendors' },
    ],
  },
  {
    label: 'Marketing',
    href: '/admin/coupons',
    requiredPermission: 'manage_marketing',
    children: [
      { label: 'Promotions', href: '/admin/coupons', requiredPermission: 'manage_marketing' },
      { label: 'Loyalty', href: '/admin/marketing/loyalty', requiredPermission: 'manage_marketing' },
      { label: 'Referrals', href: '/admin/marketing/referrals', requiredPermission: 'manage_marketing' },
      { label: 'Gift Cards', href: '/admin/marketing/gift-cards', requiredPermission: 'manage_marketing' },
      { label: 'Product Bundles', href: '/admin/marketing/bundles', requiredPermission: 'manage_marketing' },
      { label: 'Bestsellers', href: '/admin/marketing/bestsellers', requiredPermission: 'manage_marketing' },
      { label: 'Newsletters', href: '/admin/marketing/newsletters', requiredPermission: 'manage_marketing' },
      { label: 'Facebook Pixel', href: '/admin/marketing/facebook-pixel', requiredPermission: 'manage_marketing' },
      { label: 'Google Analytics', href: '/admin/marketing/google-analytics', requiredPermission: 'manage_marketing' },
      { label: 'Banners', href: '/admin/marketing/banners', requiredPermission: 'manage_marketing', addonId: 'banners' },
      { label: 'Data Feeds', href: '/admin/marketing/data-feeds', requiredPermission: 'manage_marketing' },
    ],
  },
  {
    label: 'Website',
    href: '/admin/website',
    requiredPermission: 'manage_content',
    children: [
      { label: 'Themes', href: '/admin/website', requiredPermission: 'manage_content' },
      { label: 'Access', href: '/admin/website/access-restrictions', requiredPermission: 'manage_content' },
      { label: 'Help Center', href: '/admin/website/help-center', requiredPermission: 'manage_content', addonId: 'help_center' },
      { label: 'Blog', href: '/admin/website/blog', requiredPermission: 'manage_content' },
      { label: 'Pages', href: '/admin/pages', requiredPermission: 'manage_content' },
      { label: 'Menus', href: '/admin/website/menus', requiredPermission: 'manage_content' },
      { label: 'Comments', href: '/admin/website/comments', requiredPermission: 'manage_content' },
      { label: 'Sitemap', href: '/admin/website/sitemap', requiredPermission: 'manage_content' },
    ],
  },
  {
    label: 'Add-ons',
    href: '/admin/addons',
    requiredPermission: 'manage_settings',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    requiredPermission: 'manage_settings',
    children: [
      { label: 'General', href: '/admin/settings', requiredPermission: 'manage_settings' },
      { label: 'Payments', href: '/admin/settings/payments', requiredPermission: 'manage_settings' },
      { label: 'Shipping', href: '/admin/settings/shipping', requiredPermission: 'manage_settings' },
      { label: 'Taxes', href: '/admin/settings/taxes', requiredPermission: 'manage_settings' },
      { label: 'Localization', href: '/admin/settings/localization', requiredPermission: 'manage_settings' },
      { label: 'Email', href: '/admin/settings/email', requiredPermission: 'manage_settings' },
      { label: 'Security', href: '/admin/settings/security', requiredPermission: 'manage_settings' },
    ],
    placement: 'bottom',
  },
]
