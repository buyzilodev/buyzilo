'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { parseFacebookPixelConfig, type FacebookPixelConfig } from '@/lib/helpers/marketing'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[][]
      loaded?: boolean
      version?: string
    }
    _fbq?: (...args: unknown[]) => void
  }
}

export default function FacebookPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [config, setConfig] = useState<FacebookPixelConfig | null>(null)
  const initializedRef = useRef(false)
  const lastTrackedPathRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/public')
      .then((response) => response.json())
      .then((data) => setConfig(parseFacebookPixelConfig(JSON.stringify(data?.facebookPixel ?? null))))
      .catch(() => setConfig(parseFacebookPixelConfig(null)))
  }, [])

  useEffect(() => {
    if (!config?.enabled || !config.pixelId || initializedRef.current || typeof window === 'undefined') {
      return
    }

    if (!window.fbq) {
      const queuedCalls: unknown[][] = []
      const fbq = ((...args: unknown[]) => {
        queuedCalls.push(args)
      }) as Window['fbq']

      if (fbq) {
        fbq.queue = queuedCalls
        fbq.loaded = true
        fbq.version = '2.0'
      }

      window.fbq = fbq
      window._fbq = fbq ?? undefined

      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript?.parentNode?.insertBefore(script, firstScript)
    }

    window.fbq?.('init', config.pixelId)
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

    window.fbq?.('track', 'PageView')
    lastTrackedPathRef.current = currentPath
  }, [config, pathname, searchParams])

  useEffect(() => {
    if (!config?.enabled) {
      return
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ event: string; payload?: Record<string, unknown> }>
      if (!customEvent.detail?.event) return
      window.fbq?.('track', customEvent.detail.event, customEvent.detail.payload ?? {})
    }

    window.addEventListener('buyzilo:facebook-pixel', handler)
    return () => window.removeEventListener('buyzilo:facebook-pixel', handler)
  }, [config])

  if (!config?.enabled) {
    return null
  }

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(config.pixelId)}&ev=PageView&noscript=1`}
      />
    </noscript>
  )
}
