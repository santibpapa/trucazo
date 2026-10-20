'use client'

import { useEffect, useState } from 'react'
import { isAndroidEntry } from '@/lib/android-entry'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { track } from '@vercel/analytics'
import { trackFirstParty } from '@/lib/analytics/client'
import { invitationPath } from '@/lib/table-invites'

interface Props {
  variant?: 'primary' | 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  source?: string
  fullWidth?: boolean
  returnTo?: string
  username?: string
}

/** Entrar sin registrarse: sesión anónima de Supabase + perfil "Invitado####". */
export default function GuestButton({
  variant = 'ghost',
  size = 'lg',
  label = 'Entrar como invitado',
  source = 'unknown',
  fullWidth = true,
  returnTo,
  username,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [android, setAndroid] = useState(false)

  useEffect(() => { setAndroid(isAndroidEntry()) }, [])

  async function enterAsGuest() {
    if (isAndroidEntry()) {
      router.push('/login?android=1')
      return
    }
    if (loading) return
    if (username !== undefined && (username.trim().length < 3 || username.trim().length > 16)) {
      setError('Elegí un nombre de entre 3 y 16 caracteres.')
      return
    }
    track('guest_cta_click', { source })
    setLoading(true)
    setError('')
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error: authErr } = await supabase.auth.signInAnonymously(
      username === undefined ? undefined : { options: { data: { username: username.trim() } } },
    )
    if (authErr || !data.user) {
      track('guest_session_failed', { source, stage: 'auth' })
      setError('El modo invitado no está disponible por ahora.')
      setLoading(false)
      return
    }

    // El perfil "Invitado####" lo crea el servidor solo, al nacer la sesión
    // (trigger handle_new_user). Antes lo creaba acá, y eso chocaba con el
    // trigger: si el trigger estaba puesto, el invitado ni siquiera podía entrar.

    // Latido fresco para el GuestSessionGuard (así no lo confunde con un
    // invitado viejo y no le cierra la sesión recién creada).
    try { localStorage.setItem('trucazo:guest-alive', String(Date.now())) } catch {}

    track('guest_session_started', { source })
    trackFirstParty('guest_session_started', { source })

    router.push(invitationPath(returnTo) ?? '/lobby')
    router.refresh()
  }

  if (android) return null

  return (
    <div className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : ''}`}>
      {error && <p className="text-sm text-negative text-center">{error}</p>}
      <Button variant={variant} size={size} fullWidth={fullWidth} onClick={enterAsGuest} disabled={loading}>
        {loading ? 'Entrando…' : label}
      </Button>
    </div>
  )
}
