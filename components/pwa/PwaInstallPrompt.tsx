'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  if (!deferredPrompt || dismissed) {
    return null
  }

  return (
    <div className="sticky top-16 z-20 border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="font-medium">Install Buyzilo for a faster app-like shopping experience.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await deferredPrompt.prompt()
              await deferredPrompt.userChoice.catch(() => null)
              setDeferredPrompt(null)
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Install app
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
