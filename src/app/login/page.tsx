'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel, Logo, Input, Button, Alert } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import GoogleButton from '@/components/GoogleButton'
import InstallButton from '@/components/InstallButton'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!identifier || !password) {
      setError('Completá todos los campos')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const entrada = identifier.trim()

    // Con NOMBRE DE USUARIO: lo resuelve el servidor. El navegador nunca ve el
    // email de nadie (antes lo preguntaba acá, y eso dejaba sacar el email de
    // cualquier jugador sabiendo su usuario).
    if (!entrada.includes('@')) {
      const res = await fetch('/api/login-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: entrada, password }),
      }).catch(() => null)

      if (!res?.ok) {
        const data = await res?.json().catch(() => null)
        setError(
          data?.reason === 'sin-config'
            ? 'Por ahora entrá con tu email'
            : res?.status === 429
              ? 'Demasiados intentos. Esperá un minuto.'
              : 'Email/usuario o contraseña incorrectos',
        )
        setLoading(false)
        return
      }

      router.push('/lobby')
      router.refresh()
      return
    }

    // Con EMAIL: como siempre, directo contra Supabase.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: entrada,
      password,
    })

    if (signInError) {
      setError('Email/usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/lobby')
    router.refresh()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 animate-fade-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">Entrá a jugar</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col gap-4">
          <Input
            label="Email o usuario"
            name="identifier"
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="tu@email.com o tu usuario"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <Button fullWidth size="lg" onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </Button>

        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex flex-col gap-3">
          <GoogleButton variant="secondary" size="lg" />
          <GuestButton variant="ghost" size="lg" />
          <InstallButton />
        </div>

        <p className="text-center text-sm text-muted">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-gold font-semibold hover:underline">
            Registrate gratis
          </Link>
        </p>
      </Panel>
    </main>
  )
}
