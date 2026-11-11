'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel, Logo, Input, Button, Alert, CoinIcon } from '@/components/ui'
import { track } from '@vercel/analytics'
import { trackFirstParty } from '@/lib/analytics/client'
import { loginDestination } from '@/lib/android-entry'
import { invitationAuthLink, invitationPath } from '@/lib/table-invites'
import { COMMUNITY_RULES, RULES_VERSION } from '@/lib/community-safety'
import GoogleButton from '@/components/GoogleButton'

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const next = invitationPath(searchParams.get('next'))
  const googleTaken = searchParams.get('google') === 'ocupada'
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(googleTaken
    ? 'Esa cuenta de Google ya tiene un usuario en Trucazo. Para guardar lo que jugaste, usá un email. Si preferís entrar con esa cuenta, andá a Iniciar sesión (lo jugado como invitado no se suma).'
    : '')
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState(false)
  // Cuando el proyecto pide confirmar el email, signUp no devuelve sesión: en
  // vez de mandarlo al lobby (donde no podría entrar), le avisamos.
  const [confirmarEmail, setConfirmarEmail] = useState(false)
  // Si quien se registra es un invitado, no se crea un usuario nuevo: se le
  // agrega email y contraseña al mismo usuario y conserva lo que jugó
  // (ver docs/backend.md → convertir-invitado).
  const [guestId, setGuestId] = useState<string | null>(null)

  useEffect(() => {
    void createClient().auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user?.is_anonymous) setGuestId(user.id)
    })
  }, [])

  async function convertGuest(supabase: ReturnType<typeof createClient>) {
    const { data: updated, error: emailError } = await supabase.auth.updateUser({
      email,
      data: { username, community_rules_version: RULES_VERSION },
    })
    if (emailError) {
      setError(emailError.code === 'email_exists' || /already/i.test(emailError.message)
        ? 'Ese email ya tiene una cuenta. Usá otro para guardar lo que jugaste, o iniciá sesión con esa cuenta (lo jugado como invitado no se suma).'
        : emailError.message)
      setLoading(false)
      return
    }

    // Si el proyecto pidiera confirmar el email, el usuario sigue siendo
    // invitado hasta que toque el link. Hoy Trucazo confirma al instante.
    if (updated.user?.is_anonymous) {
      setConfirmarEmail(true)
      setLoading(false)
      return
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password })
    if (passwordError) {
      setError('Guardamos tu cuenta con ese email, pero no la contraseña. Entrá a Recuperar cuenta para elegir una.')
      setLoading(false)
      return
    }

    // Token nuevo: el viejo todavía dice "invitado" y las normas y el nombre
    // lo exigen registrado.
    await supabase.auth.refreshSession()
    await supabase.rpc('accept_community_rules', { p_version: RULES_VERSION })
    // Si el nombre falla (lo ganó otro justo ahora, o la base todavía no tiene
    // esta función), el lobby se lo vuelve a pedir.
    await supabase.rpc('choose_guest_account_name', { p_username: username })
    try { localStorage.removeItem('trucazo:guest-alive') } catch {}

    track('register_completed', { method: 'email', from_guest: true, confirmation_required: false })
    trackFirstParty('register_completed', { method: 'email', from_guest: true, confirmation_required: false })
    router.push(loginDestination())
    router.refresh()
  }

  async function handleRegister() {
    if (!rules) { setError('Aceptá las normas de convivencia para crear tu cuenta.'); return }
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
    let nameQuery = supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
    if (guestId) nameQuery = nameQuery.neq('id', guestId)
    const { data: existing } = await nameQuery.maybeSingle()

    if (existing) {
      setError('Ese nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    if (guestId) {
      await convertGuest(supabase)
      return
    }

    if (next) document.cookie = `trucazo_auth_next=${next}; Path=/; Max-Age=600; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, community_rules_version: RULES_VERSION },
        ...(next ? { emailRedirectTo: `${window.location.origin}/auth/callback` } : {}),
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

    router.push(loginDestination())
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
          <Link href={invitationAuthLink('/login', next)} className="text-sm font-semibold text-gold hover:text-gold-600 transition-colors">
            Ir a iniciar sesión
          </Link>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">{guestId ? 'Guardá lo que jugaste' : 'Creá tu cuenta'}</p>
        </div>

        {guestId && (
          <p className="rounded-xl border border-gold/30 bg-gold-soft/30 p-3 text-sm text-cream/90">
            Tus monedas, tu historial y tu avance del Modo Historia pasan a la cuenta.
            Si tenés menos de 1.000 monedas, te completamos hasta 1.000.
          </p>
        )}

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

        <label className="text-xs text-muted flex items-start gap-2"><input type="checkbox" checked={rules} onChange={e => setRules(e.target.checked)} /><span>Acepto las <Link href="/terminos" target="_blank" className="text-gold underline">normas de convivencia</Link>. {COMMUNITY_RULES}</span></label>
        <Button fullWidth size="lg" onClick={handleRegister} disabled={loading || !rules}>
          {loading ? (
            'Creando cuenta…'
          ) : guestId ? (
            'Crear cuenta y guardar lo jugado'
          ) : (
            <span className="inline-flex items-center gap-2">
              Registrarse y ganar <CoinIcon size={16} /> 1.000
            </span>
          )}
        </Button>

        {guestId && <GoogleButton variant="secondary" size="lg" linkGuest />}

        <p className="text-center text-xs leading-relaxed text-subtle">
          Al registrarte podemos enviarte novedades e invitaciones para volver a jugar.
          Podés darte de baja con un toque desde cualquier correo.{' '}
          <Link href="/privacidad" className="text-gold hover:underline">Ver privacidad</Link>
        </p>

        <p className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{' '}
          <Link href={invitationAuthLink('/login', next)} className="text-gold font-semibold hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </Panel>
    </main>
  )
}
