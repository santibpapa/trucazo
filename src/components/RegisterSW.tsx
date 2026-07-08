'use client'

import { useEffect } from 'react'

/** Registra el service worker mínimo (necesario para poder instalar la app). */
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
