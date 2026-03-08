'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import GoogleAnalytics from '@/components/marketing/GoogleAnalytics'
import FacebookPixel from '@/components/marketing/FacebookPixel'
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt'
import PwaRegistration from '@/components/pwa/PwaRegistration'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

const hiddenPrefixes = ['/admin', '/vendor', '/dashboard', '/unauthorized']

export default function FrontendChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showHeader = !hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))

  return (
    <>
      <PwaRegistration />
      {showHeader && (
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>
      )}
      {showHeader && (
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      )}
      {showHeader && <SiteHeader />}
      {showHeader && <PwaInstallPrompt />}
      {children}
      {showHeader && <SiteFooter />}
    </>
  )
}
