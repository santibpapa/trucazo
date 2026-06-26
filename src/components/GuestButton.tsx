'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

interface Props {
  variant?: 'primary' | 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

function randomGuestName() {
  return 'Invitado' + Math.floor(1000 + Math.random() * 9000)
}

/** Entrar sin registrarse: sesión anónima de Supabase + perfil "Invitado####". */
export default function GuestButton({ variant = 'ghost', size = 'lg' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function enterAsGuest() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: authErr } = await supabase.auth.signInAnonymously()
    if (authErr || !data.user) {
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
        setError('No se pudo crear el invitado.')
        setLoading(false)
        return
      }
    }
    if (!created) {
      setError('No se pudo crear el invitado, probá de nuevo.')
      setLoading(false)
      return
    }

    router.push('/lobby')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {error && <p className="text-sm text-negative text-center">{error}</p>}
      <Button variant={variant} size={size} fullWidth onClick={enterAsGuest} disabled={loading}>
        {loading ? 'Entrando…' : 'Entrar como invitado'}
      </Button>
    </div>
  )
}
