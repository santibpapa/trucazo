'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Panel from './ui/Panel'
import Logo from './ui/Logo'
import Input from './ui/Input'
import Button from './ui/Button'
import Alert from './ui/Alert'

export default function RecoveryScreen({ ready, request, change, back, done }: {
  ready: boolean; request: (email: string) => Promise<void>; change: (password: string) => Promise<void>
  back: ReactNode; done: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  async function submit() {
    if (loading) return
    setError('')
    if (ready && (password.length < 6 || password !== confirmation)) {
      setError(password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : 'Las contraseñas no coinciden'); return
    }
    setLoading(true)
    try {
      if (!navigator.onLine) throw new Error('Necesitás internet para continuar.')
      if (ready) { await change(password); setPassword(''); setConfirmation(''); done() }
      else { await request(email.trim()); setSent(true) }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos conectar. Reintentá.') }
    finally { setLoading(false) }
  }
  return <main className="flex min-h-dvh flex-col items-center justify-center p-6">
    <Panel className="flex w-full max-w-sm flex-col gap-6 p-8">
      <Logo size="md" className="justify-center" />
      <h1 className="text-center text-xl font-semibold">{ready ? 'Elegí una nueva contraseña' : 'Recuperá tu cuenta'}</h1>
      {error && <Alert>{error}</Alert>}
      {sent && !ready ? <>
        <p role="status" className="text-center text-sm text-muted">Si ese email tiene una cuenta, te llegará un enlace para recuperar el acceso. Revisá también el correo no deseado.</p>
        <Button variant="secondary" onClick={() => setSent(false)}>Pedir otro enlace</Button>
      </> : <form onSubmit={event => { event.preventDefault(); void submit() }} className="flex flex-col gap-4">
        {ready ? <>
          <Input label="Nueva contraseña" name="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          <Input label="Repetí la contraseña" name="confirm-password" type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </> : <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />}
        <Button type="submit" fullWidth size="lg" disabled={loading}>{loading ? 'Un momento…' : ready ? 'Guardar contraseña' : 'Enviar enlace'}</Button>
      </form>}
      <div className="text-center text-sm text-gold">{back}</div>
    </Panel>
  </main>
}
