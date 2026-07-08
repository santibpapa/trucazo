'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'

// El evento que dispara Chrome/Android cuando la app se puede instalar.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Botón "Instalar app".
 * - Android/Chrome/Edge: dispara el cartel nativo de instalación.
 * - iPhone (Safari): no se puede instalar por código (restricción de Apple),
 *   así que muestra el paso a paso.
 * - Si ya está instalada, o el navegador no permite instalar, no se muestra.
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const installed =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    setStandalone(installed)
    setIsIOS(/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()))

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Ya instalada, o navegador que no ofrece instalar (y no es iPhone): no mostramos nada.
  if (standalone) return null
  if (!deferred && !isIOS) return null

  async function onClick() {
    if (isIOS) {
      setShowHelp(v => !v)
      return
    }
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button variant="ghost" size="lg" fullWidth onClick={onClick}>
        <DownloadIcon />
        Instalar app
      </Button>
      {showHelp && isIOS && (
        <p className="text-xs text-subtle text-center leading-relaxed animate-fade-up">
          En Safari, tocá el botón <b className="text-cream">Compartir</b> (el cuadrado con la
          flecha ↑) y elegí <b className="text-cream">“Agregar a inicio”</b>.
        </p>
      )}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
