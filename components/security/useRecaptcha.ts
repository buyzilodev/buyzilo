'use client'

import { useCallback, useEffect, useState } from 'react'

type PublicRecaptchaConfig = {
  enabled: boolean
  siteKey: string
  version: 'v3'
}

type PublicSettingsResponse = {
  recaptcha?: PublicRecaptchaConfig
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

function loadRecaptchaScript(siteKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA is not available on the server.'))
      return
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha-script="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA.')), { once: true })
      if (window.grecaptcha) {
        resolve()
      }
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.dataset.recaptchaScript = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA.'))
    document.head.appendChild(script)
  })
}

export function useRecaptcha() {
  const [config, setConfig] = useState<PublicRecaptchaConfig>({
    enabled: false,
    siteKey: '',
    version: 'v3',
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetch('/api/settings/public')
      .then((response) => response.json())
      .then((data: PublicSettingsResponse) => {
        if (!active) {
          return
        }

        const publicConfig = data.recaptcha
        if (!publicConfig?.enabled || !publicConfig.siteKey) {
          setConfig({ enabled: false, siteKey: '', version: 'v3' })
          setReady(true)
          return
        }

        setConfig(publicConfig)
        return loadRecaptchaScript(publicConfig.siteKey).then(() => {
          if (!active) {
            return
          }

          window.grecaptcha?.ready(() => {
            if (active) {
              setReady(true)
            }
          })
        })
      })
      .catch(() => {
        if (active) {
          setError('Captcha could not be initialized.')
          setReady(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const getToken = useCallback(
    async (action: string) => {
      if (!config.enabled) {
        return null
      }

      if (!window.grecaptcha || !ready) {
        throw new Error(error || 'Captcha is still loading.')
      }

      return window.grecaptcha.execute(config.siteKey, { action })
    },
    [config.enabled, config.siteKey, error, ready]
  )

  return {
    enabled: config.enabled,
    ready,
    error,
    getToken,
  }
}
