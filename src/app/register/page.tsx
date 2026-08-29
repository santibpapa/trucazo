'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel, Logo, Input, Button, Alert, CoinIcon } from '@/components/ui'
import { track } from '@vercel/analytics'
import { trackFirstParty } from '@/lib/analytics/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Cuando el proyecto pide confirmar el email, signUp no devuelve sesión: en
  // vez de mandarlo al lobby (donde no podría entrar), le avisamos.
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  async function handleRegister() {
    if (!email || !password || !username) {
      setError('Completá todos los campos')
      return
    }
    if (username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // Chequeo case-insensitive (ilike sin comodines matchea la cadena completa).
    // El índice único sobre lower(username) es la garantía real ante carreras.
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle()

    if (existing) {
      setError('Ese nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // El perfil lo crea el servidor solo (trigger handle_new_user) con el nombre
    // que mandamos acá arriba. Antes esta pantalla lo creaba de nuevo, y ese
    // segundo intento chocaba con el primero: la cuenta quedaba creada pero se
    // mostraba "Ese nombre de usuario ya está en uso" y parecía que había fallado.

    // La cuenta ya fue creada aunque Supabase requiera confirmar el email antes
    // de iniciar sesión. Medimos ambos casos y distinguimos esa condición.
    track('register_completed', {
      method: 'email',
      confirmation_required: !signUpData.session,
    })
    trackFirstParty('register_completed', {
      method: 'email',
      confirmation_required: !signUpData.session,
    })

    // Sin sesión = falta confirmar el email. No lo mandamos al lobby, porque no
    // podría entrar y parecería que algo se rompió.
    if (!signUpData.session) {
      setConfirmarEmail(true)
      setLoading(false)
      return
    }

    router.push('/lobby')
    router.refresh()
  }

  // Falta confirmar el email: la cuenta ya está creada, pero no puede entrar
  // hasta que toque el link que le llegó.
  if (confirmarEmail) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <Panel className="w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center animate-scale-in">
          <Logo size="md" />
          <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center shadow-gold-ring">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold text-cream">Revisá tu email</h2>
            <p className="text-sm text-muted">
              Te mandamos un mail a <b className="text-cream">{email}</b> para confirmar la cuenta.
              Tocá el link y ya podés entrar a jugar.
            </p>
          </div>
          <p className="text-xs text-subtle">
            Si no lo ves, mirá en el correo no deseado.
          </p>
          <Link href="/login" className="text-sm font-semibold text-gold hover:text-gold-600 transition-colors">
            Ir a iniciar sesión
          </Link>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 animate-fade-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">Creá tu cuenta</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col gap-4">
          <Input
            label="Nombre de usuario"
            name="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ej: ElTruco99"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <Button fullWidth size="lg" onClick={handleRegister} disabled={loading}>
          {loading ? (
            'Creando cuenta…'
          ) : (
            <span className="inline-flex items-center gap-2">
              Registrarse y ganar <CoinIcon size={16} /> 1.000
            </span>
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-subtle">
          Al registrarte podemos enviarte novedades e invitaciones para volver a jugar.
          Podés darte de baja con un toque desde cualquier correo.{' '}
          <Link href="/privacidad" className="text-gold hover:underline">Ver privacidad</Link>
        </p>

        <p className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-gold font-semibold hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </Panel>
    </main>
  )
}
