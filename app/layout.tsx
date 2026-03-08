import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import { prisma } from '@/lib/prisma'
import { brandingFromSettingsMap } from '@/lib/branding'
import FrontendChrome from '@/components/FrontendChrome'
import { buildSeoMetadata, getBaseUrl, toKeywords } from '@/lib/helpers/seo'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rows = await prisma.siteSettings.findMany()
    const map: Record<string, string> = {}
    rows.forEach((row) => {
      map[row.key] = row.value
    })

    const branding = brandingFromSettingsMap(map)
    const defaultTitle = map.seoDefaultTitle?.trim() || `${branding.siteName} - ${branding.tagline}`
    const defaultDescription = map.seoDefaultDescription?.trim() || branding.tagline
    const defaultKeywords = toKeywords(map.seoDefaultKeywords)
    const metadata = buildSeoMetadata({
      title: defaultTitle,
      description: defaultDescription,
      path: '/',
      image: branding.logoUrl || branding.faviconUrl || null,
      keywords: defaultKeywords,
    })

    return {
      ...metadata,
      manifest: '/manifest.webmanifest',
      icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
      applicationName: branding.siteName,
      metadataBase: new URL(getBaseUrl()),
    }
  } catch {
    return {
      ...buildSeoMetadata({
        title: 'Buyzilo - Shop Everything You Love',
        description: 'Multi-vendor marketplace',
        path: '/',
      }),
      manifest: '/manifest.webmanifest',
      applicationName: 'Buyzilo',
      metadataBase: new URL(getBaseUrl()),
    }
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <FrontendChrome>{children}</FrontendChrome>
        </SessionProvider>
      </body>
    </html>
  )
}
