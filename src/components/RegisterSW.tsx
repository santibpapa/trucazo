'use client'

import { useEffect } from 'react'

/** Registra la pantalla de recuperación sin guardar páginas de la cuenta. */
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
    }
  }, [])
  return null
}
