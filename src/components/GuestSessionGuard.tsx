'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// "Latido" de la visita del invitado. Mientras usa la app se renueva cada 30s;
// si al abrir la app hay una sesión de invitado con el latido vencido, es que
// cerró el navegador y volvió → se cierra esa sesión (los invitados no se
// recuerdan; por algo son invitados). Las cuentas reales no se tocan.
const KEY = 'trucazo:guest-alive'
const STALE_MS = 90_000

export default function GuestSessionGuard() {
  useEffect(() => {
    const supabase = createClient()
    let iv: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session?.user?.is_anonymous) return

      let last = 0
      try { last = Number(localStorage.getItem(KEY) ?? 0) } catch {}
      if (last && Date.now() - last > STALE_MS) {
        // Invitado de una visita anterior: acá se despide.
        try { localStorage.removeItem(KEY) } catch {}
        await supabase.auth.signOut()
        window.location.href = '/'
        return
      }

      const beat = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch {} }
      beat()
      iv = setInterval(beat, 30_000)
    })()

    return () => { cancelled = true; if (iv) clearInterval(iv) }
  }, [])

  return null
}
