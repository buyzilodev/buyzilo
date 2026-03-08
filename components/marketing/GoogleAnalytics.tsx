'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { parseGoogleAnalyticsConfig, type GoogleAnalyticsConfig } from '@/lib/helpers/marketing'

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [config, setConfig] = useState<GoogleAnalyticsConfig | null>(null)
  const initializedRef = useRef(false)
  const lastTrackedPathRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/public')
      .then((response) => response.json())
      .then((data) => setConfig(parseGoogleAnalyticsConfig(JSON.stringify(data?.googleAnalytics ?? null))))
      .catch(() => setConfig(parseGoogleAnalyticsConfig(null)))
  }, [])

  useEffect(() => {
    if (!config?.enabled || !config.measurementId || initializedRef.current || typeof window === 'undefined') {
      return
    }

    window.dataLayer = window.dataLayer || []
    window.gtag =
      window.gtag ||
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args)
      }

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`
    document.head.appendChild(script)

    window.gtag('js', new Date())
    window.gtag('config', config.measurementId, { send_page_view: false })
    initializedRef.current = true
  }, [config])

  useEffect(() => {
    if (!config?.enabled || !config.trackPageViews || !initializedRef.current) {
      return
    }

    const currentPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
    if (lastTrackedPathRef.current === currentPath) {
      return
    }

    window.gtag?.('event', 'page_view', {
      page_path: currentPath,
      page_location: typeof window !== 'undefined' ? window.location.href : currentPath,
    })
    lastTrackedPathRef.current = currentPath
  }, [config, pathname, searchParams])

  useEffect(() => {
    if (!config?.enabled) {
      return
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ event: string; payload?: Record<string, unknown> }>
      if (!customEvent.detail?.event) return
      window.gtag?.('event', customEvent.detail.event, customEvent.detail.payload ?? {})
    }

    window.addEventListener('buyzilo:google-analytics', handler)
    return () => window.removeEventListener('buyzilo:google-analytics', handler)
  }, [config])

  return null
}
