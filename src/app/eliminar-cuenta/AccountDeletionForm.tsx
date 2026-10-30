'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Alert, Button, Input, Panel } from '@/components/ui'
import GoogleButton from '@/components/GoogleButton'
import { DELETION_CONFIRMATION, needsPassword } from '@/lib/account-deletion/identity'
import type { User } from '@supabase/supabase-js'
import { appRequest } from '@/lib/app-request'
import { removeCampaign } from '@/lib/offline-campaign/storage'
import { removeTrial } from '@/lib/offline-trial/storage'

export default function AccountDeletionForm({ onDeleted, googleButton, localNotice }: {
  onDeleted?: (owner: string) => Promise<void>; googleButton?: ReactNode; localNotice?: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'deleted' | 'pending' | null>(null)

  async function cleanLocal(owner: string) {
    if (onDeleted) await onDeleted(owner)
    else await Promise.all([removeCampaign(owner), removeTrial(owner)])
    const session = await createClient().auth.getSession()
    if (session.error) throw new Error('No pudimos comprobar la sesión local.')
    const current = session.data.session
    if (current && current.user.id !== owner) return
    await createClient().auth.signOut({ scope: 'local' }).catch(() => undefined)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || key.startsWith('trucazo:mobile:auth:')
        || key.startsWith('trucazo:mobile:auth-flow:') || key.startsWith('trucazo:mobile:auth-next:')
        || key === 'trucazo:mobile:screen:' + owner || key.startsWith('trucazo:analytics-')) localStorage.removeItem(key)
    }
    sessionStorage.clear()
    if ('caches' in window) await Promise.all((await caches.keys()).map(key => caches.delete(key)))
  }

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
      const response = await appRequest('/api/account/delete', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation, password, owner: user!.id }) })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data.reason === 'reauthenticate'
          ? needsPassword(user!) ? 'La contraseña no es correcta.' : 'Volvé a entrar con Google para confirmar que sos vos.'
          : data.reason === 'account_changed' ? 'La cuenta cambió. Volvé a abrir esta pantalla.'
            : data.reason === 'session' ? 'Tu sesión venció. Volvé a entrar.'
            : 'No se pudo eliminar la cuenta. Probá de nuevo o escribinos a hola@trucazo.com.ar.')
        return
      }
      setResult(data.status)
      setPassword('')
      try { await cleanLocal(user!.id) }
      catch { setError('La cuenta ya se eliminó del servicio, pero falta limpiar este dispositivo. Reintentá la limpieza local.') }
    } catch {
      setError('Se cortó la conexión. Si ya confirmaste, la solicitud puede estar en proceso. Para verificarlo, escribinos a hola@trucazo.com.ar.')
    } finally { setLoading(false) }
  }

  if (!ready) return <p className="text-muted" role="status">Cargando tu cuenta…</p>
  if (result) return (
    <Panel className="p-5 flex flex-col gap-3" role="status">
      <h2 className="text-xl font-display font-bold text-cream">{result === 'deleted' ? 'Tu cuenta fue eliminada' : 'Recibimos tu solicitud'}</h2>
      <p className="text-muted">{result === 'deleted'
        ? 'Borramos tu cuenta y sus datos asociados, con la excepción de evidencia de denuncias explicada en Privacidad. Gracias por haber jugado a Trucazo.'
        : 'Ya borramos tu perfil y progreso. Estamos terminando de borrar los archivos y el acceso. El proceso se reintenta automáticamente; si no termina dentro de 48 horas, escribinos a hola@trucazo.com.ar.'}</p>
      {error && <><Alert>{error}</Alert><Button onClick={() => {
        void cleanLocal(user!.id).then(() => setError('')).catch(() => setError('No se pudo limpiar este dispositivo. Reintentá.'))
      }}>Reintentar limpieza local</Button></>}
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
          {googleButton ?? <GoogleButton returnTo="/eliminar-cuenta" />}
        </>
      ) : (
        <form onSubmit={deleteAccount} className="flex flex-col gap-4">
          <p className="text-sm text-muted">Cuenta: <strong className="text-cream break-all">{user.email}</strong></p>
          <p className="text-sm text-muted">Perderás tus monedas, compras, medallas y progreso. La eliminación es permanente. Una partida en curso contará como abandono y tu equipo se retirará de los torneos activos.</p>
          <p className="text-sm text-muted">Los resultados compartidos quedan sin tu identidad. La evidencia privada de denuncias puede conservarse hasta 180 días desde su recepción o 90 desde su resolución, lo que ocurra primero, para prevenir abuso y revisar decisiones.</p>
          {localNotice ?? <p className="text-sm text-muted">Se borra también Historia de esta cuenta en este navegador. Los resultados sin sincronizar se pierden. Otro equipo sin conexión se actualizará al reconectarse.</p>}
          {needsPassword(user) ? <Input name="password" label="Confirmá tu contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            : googleButton ?? <GoogleButton returnTo="/eliminar-cuenta" />}
          <Input name="confirmation" label="Escribí ELIMINAR para confirmar" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} required />
          <Button type="submit" variant="danger" disabled={loading || confirmation !== DELETION_CONFIRMATION}>
            {loading ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente'}
          </Button>
        </form>
      )}
    </Panel>
  )
}
