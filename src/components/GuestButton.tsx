'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { track } from '@vercel/analytics'

interface Props {
  variant?: 'primary' | 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  source?: string
  fullWidth?: boolean
}

function randomGuestName() {
  return 'Invitado' + Math.floor(1000 + Math.random() * 9000)
}

/** Entrar sin registrarse: sesión anónima de Supabase + perfil "Invitado####". */
export default function GuestButton({
  variant = 'ghost',
  size = 'lg',
  label = 'Entrar como invitado',
  source = 'unknown',
  fullWidth = true,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function enterAsGuest() {
    track('guest_cta_click', { source })
    setLoading(true)
    setError('')
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error: authErr } = await supabase.auth.signInAnonymously()
    if (authErr || !data.user) {
      track('guest_session_failed', { source, stage: 'auth' })
      setError('El modo invitado no está disponible por ahora.')
      setLoading(false)
      return
    }

    // Crear el perfil con un nombre único (reintenta si el azar choca)
    let created = false
    for (let i = 0; i < 6 && !created; i++) {
      const { error: pErr } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username: randomGuestName(), coins: 1000 })
      if (!pErr) created = true
      else if (pErr.code !== '23505') {
        track('guest_session_failed', { source, stage: 'profile' })
        setError('No se pudo crear el invitado.')
        setLoading(false)
        return
      }
    }
    if (!created) {
      track('guest_session_failed', { source, stage: 'username' })
      setError('No se pudo crear el invitado, probá de nuevo.')
      setLoading(false)
      return
    }

    // Latido fresco para el GuestSessionGuard (así no lo confunde con un
    // invitado viejo y no le cierra la sesión recién creada).
    try { localStorage.setItem('trucazo:guest-alive', String(Date.now())) } catch {}

    track('guest_session_started', { source })

    router.push('/lobby')
    router.refresh()
  }

  return (
    <div className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : ''}`}>
      {error && <p className="text-sm text-negative text-center">{error}</p>}
      <Button variant={variant} size={size} fullWidth={fullWidth} onClick={enterAsGuest} disabled={loading}>
        {loading ? 'Entrando…' : label}
      </Button>
    </div>
  )
}
