'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

interface Props {
  variant?: 'primary' | 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
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

    // El perfil "Invitado####" lo crea el servidor solo, al nacer la sesión
    // (trigger handle_new_user). Antes lo creaba acá, y eso chocaba con el
    // trigger: si el trigger estaba puesto, el invitado ni siquiera podía entrar.

    // Latido fresco para el GuestSessionGuard (así no lo confunde con un
    // invitado viejo y no le cierra la sesión recién creada).
    try { localStorage.setItem('trucazo:guest-alive', String(Date.now())) } catch {}

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
