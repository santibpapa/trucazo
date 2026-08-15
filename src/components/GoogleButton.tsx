'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

/** Logo oficial de Google (multicolor). */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

/** Entrar con la cuenta de Google (OAuth de Supabase). */
export default function GoogleButton({ variant = 'secondary', size = 'lg' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function enterWithGoogle() {
    setLoading(true)
    setError('')
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (authErr) {
      setError('No se pudo entrar con Google, probá de nuevo.')
      setLoading(false)
    }
    // Si sale bien, el navegador ya se fue a Google; no hace falta hacer más.
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {error && <p className="text-sm text-negative text-center">{error}</p>}
      <Button variant={variant} size={size} fullWidth onClick={enterWithGoogle} disabled={loading}>
        <GoogleLogo />
        {loading ? 'Abriendo Google…' : 'Continuar con Google'}
      </Button>
    </div>
  )
}
