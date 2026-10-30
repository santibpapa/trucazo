'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoginScreen from '@/components/LoginScreen'
import GuestButton from '@/components/GuestButton'
import GoogleButton from '@/components/GoogleButton'
import InstallButton from '@/components/InstallButton'
import { loginDestination } from '@/lib/android-entry'
import { invitationAuthLink, invitationPath } from '@/lib/table-invites'

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

function LoginForm() {
  const next = invitationPath(useSearchParams().get('next'))
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

      router.push(loginDestination())
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

    router.push(loginDestination())
    router.refresh()
  }

  return (
    <LoginScreen
      identifier={identifier}
      password={password}
      error={error}
      loading={loading}
      onIdentifierChange={setIdentifier}
      onPasswordChange={setPassword}
      onLogin={handleLogin}
      registration={
        <Link href={invitationAuthLink('/register', next)} className="text-gold font-semibold hover:underline">
          Registrate gratis
        </Link>
      }
    >
      <Link href="/recuperar-cuenta" className="text-center text-sm text-gold hover:underline">Olvidé mi contraseña</Link>
      <GoogleButton variant="secondary" size="lg" />
      <GuestButton variant="ghost" size="lg" returnTo={next ?? undefined} />
      <InstallButton />
    </LoginScreen>
  )
}
