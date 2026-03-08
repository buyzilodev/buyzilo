'use client'

import { usePathname } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Command Center',
    subtitle: 'One customer workspace for orders, retention, saved intent, alerts, and service.',
  },
  '/dashboard/orders': {
    title: 'Orders',
    subtitle: 'Track purchases, shipment progress, invoices, and post-purchase actions.',
  },
  '/dashboard/quotes': {
    title: 'Quote Requests',
    subtitle: 'Track quote-only product inquiries, seller responses, and negotiated pricing.',
  },
  '/dashboard/profile': {
    title: 'Profile',
    subtitle: 'Manage buyer identity and the account details tied to your marketplace activity.',
  },
  '/dashboard/wishlist': {
    title: 'Wishlist',
    subtitle: 'Turn saved intent into completed orders with stock and store context.',
  },
  '/dashboard/rewards': {
    title: 'Rewards',
    subtitle: 'See loyalty performance, claim coupons, and use buyer retention value.',
  },
  '/dashboard/referrals': {
    title: 'Referrals',
    subtitle: 'Share referral links, monitor signups, and track bonus point performance.',
  },
  '/dashboard/store-credit': {
    title: 'Store Credit',
    subtitle: 'Manage wallet balance, gift certificates, and redemption activity.',
  },
  '/dashboard/stock-alerts': {
    title: 'Alerts',
    subtitle: 'Stay ahead of back-in-stock updates, price drops, and saved-product monitoring.',
  },
  '/dashboard/saved-searches': {
    title: 'Saved Searches',
    subtitle: 'Reopen high-intent discovery routes and watch for new matching inventory.',
  },
  '/dashboard/notifications': {
    title: 'Notifications',
    subtitle: 'Control buyer alerts, digest cadence, SMS updates, and retention messaging.',
  },
  '/dashboard/digest': {
    title: 'Digest',
    subtitle: 'Review the buyer summary for alerts, saved-search changes, and account activity.',
  },
  '/dashboard/privacy': {
    title: 'Privacy',
    subtitle: 'Control consent, data export, and marketplace privacy requests.',
  },
  '/dashboard/reviews': {
    title: 'Reviews',
    subtitle: 'Manage the product feedback you have already submitted across the marketplace.',
  },
  '/dashboard/support': {
    title: 'Support',
    subtitle: 'Open tickets, request callbacks, and move between help content and live service.',
  },
  '/dashboard/addresses': {
    title: 'Addresses',
    subtitle: 'Review delivery destinations and keep checkout-ready address details current.',
  },
  '/dashboard/security': {
    title: 'Security',
    subtitle: 'Protect account access and keep your login credentials current.',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const meta = routeMeta[pathname] ?? routeMeta['/dashboard']
  return (
    <DashboardLayout title={meta.title} subtitle={meta.subtitle}>
      {children}
    </DashboardLayout>
  )
}
