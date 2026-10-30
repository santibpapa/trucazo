'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { clearAndroidProbe, isAndroidEntry } from '@/lib/android-entry'
import { createClient } from '@/lib/supabase/client'

export default function AndroidSessionGuard() {
  const pathname = usePathname()

  useEffect(() => {
    // El código de este puente pertenece al APK, no a las cookies de Chrome.
    if (pathname === '/auth/mobile') return
    if (!isAndroidEntry()) return
    const accessPage = ['/login', '/register', '/auth/callback', '/auth/mobile', '/recuperar-cuenta'].includes(pathname)
    const supabase = createClient()
    let cancelled = false
    const requireAccount = (user: { is_anonymous?: boolean } | null) => {
      if (cancelled || (user && !user.is_anonymous)) return
      void clearAndroidProbe().finally(() => {
        if (!cancelled && !accessPage) window.location.replace('/login?android=1')
      })
    }
    // Solo controla navegación/UI. Las rutas y RPCs siguen validando en servidor.
    void supabase.auth.getSession().then(({ data }) => requireAccount(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      requireAccount(session?.user ?? null)
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [pathname])

  return null
}
