'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Alert, Button, Input, Panel } from '@/components/ui'
import GoogleButton from '@/components/GoogleButton'
import { DELETION_CONFIRMATION, needsPassword } from '@/lib/account-deletion/identity'
import type { User } from '@supabase/supabase-js'

export default function AccountDeletionForm() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'deleted' | 'pending' | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user?.is_anonymous ? null : data.user); setReady(true) }
    }).catch(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      const supabase = createClient()
      if (identifier.includes('@')) {
        const signedIn = await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
        if (signedIn.error) throw new Error()
      } else {
        const response = await fetch('/api/login-usuario', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: identifier.trim(), password }) })
        if (!response.ok) throw new Error()
      }
      window.location.assign('/eliminar-cuenta')
    } catch { setError('Email/usuario o contraseña incorrectos.'); setLoading(false) }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      const response = await fetch('/api/account/delete', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation, password }) })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data.reason === 'reauthenticate'
          ? needsPassword(user!) ? 'La contraseña no es correcta.' : 'Volvé a entrar con Google para confirmar que sos vos.'
          : data.reason === 'session' ? 'Tu sesión venció. Volvé a entrar.'
            : 'No se pudo eliminar la cuenta. Probá de nuevo o escribinos a hola@trucazo.com.ar.')
        return
      }
      setResult(data.status)
      setPassword('')
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      // Eliminar identificadores/progreso locales; no conservar caché de páginas privadas.
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('trucazo:') || key.startsWith('sb-')) localStorage.removeItem(key)
        }
        sessionStorage.clear()
        if ('caches' in window) await Promise.all((await caches.keys()).map(key => caches.delete(key)))
      } catch {}
    } catch {
      setError('Se cortó la conexión. Si ya confirmaste, la solicitud puede estar en proceso. Para verificarlo, escribinos a hola@trucazo.com.ar.')
    } finally { setLoading(false) }
  }

  if (!ready) return <p className="text-muted" role="status">Cargando tu cuenta…</p>
  if (result) return (
    <Panel className="p-5 flex flex-col gap-3" role="status">
      <h2 className="text-xl font-display font-bold text-cream">{result === 'deleted' ? 'Tu cuenta fue eliminada' : 'Recibimos tu solicitud'}</h2>
      <p className="text-muted">{result === 'deleted'
        ? 'Borramos tu cuenta y sus datos personales. Gracias por haber jugado a Trucazo.'
        : 'Ya borramos tu perfil y progreso. Estamos terminando de borrar los archivos y el acceso. El proceso se reintenta automáticamente; si no termina dentro de 48 horas, escribinos a hola@trucazo.com.ar.'}</p>
      <Link href="/" className="text-gold underline">Volver al inicio</Link>
    </Panel>
  )
  return (
    <Panel className="p-5 flex flex-col gap-4">
      <h2 className="text-xl font-display font-bold text-cream">{user ? 'Confirmar eliminación' : 'Entrá para eliminar tu cuenta'}</h2>
      {error && <Alert>{error}</Alert>}
      {!user ? (
        <>
          <form onSubmit={signIn} className="flex flex-col gap-4">
            <Input name="identifier" label="Email o usuario" value={identifier} onChange={e => setIdentifier(e.target.value)} required autoComplete="username" />
            <Input name="password" label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            <Button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Iniciar sesión'}</Button>
          </form>
          <GoogleButton returnTo="/eliminar-cuenta" />
        </>
      ) : (
        <form onSubmit={deleteAccount} className="flex flex-col gap-4">
          <p className="text-sm text-muted">Cuenta: <strong className="text-cream break-all">{user.email}</strong></p>
          <p className="text-sm text-muted">Perderás tus monedas, compras, medallas y progreso. La eliminación es permanente. Una partida en curso contará como abandono y tu equipo se retirará de los torneos activos.</p>
          {needsPassword(user) ? <Input name="password" label="Confirmá tu contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            : <GoogleButton returnTo="/eliminar-cuenta" />}
          <Input name="confirmation" label="Escribí ELIMINAR para confirmar" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} required />
          <Button type="submit" variant="danger" disabled={loading || confirmation !== DELETION_CONFIRMATION}>
            {loading ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}
          </Button>
        </form>
      )}
    </Panel>
  )
}
