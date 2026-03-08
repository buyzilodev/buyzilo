import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { brandingFromSettingsMap } from '@/lib/branding'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  try {
    const rows = await prisma.siteSettings.findMany()
    const map: Record<string, string> = {}
    rows.forEach((row) => {
      map[row.key] = row.value
    })
    const branding = brandingFromSettingsMap(map)

    return {
      name: branding.siteName,
      short_name: branding.siteName,
      description: branding.tagline,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: branding.primaryColor,
      categories: ['shopping', 'lifestyle', 'business'],
      icons: [
        { src: '/icon?size=192', sizes: '192x192', type: 'image/png' },
        { src: '/icon?size=512', sizes: '512x512', type: 'image/png' },
        { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      ],
    }
  } catch {
    return {
      name: 'Buyzilo',
      short_name: 'Buyzilo',
      description: 'Shop Everything You Love',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#2563eb',
      categories: ['shopping'],
      icons: [
        { src: '/icon?size=192', sizes: '192x192', type: 'image/png' },
        { src: '/icon?size=512', sizes: '512x512', type: 'image/png' },
      ],
    }
  }
}
