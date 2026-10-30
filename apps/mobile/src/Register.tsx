import { useState } from 'react'
import { register, takeDestination } from './auth'
import { navigate } from './navigation'
import { WEB_ORIGIN } from './config'
import { Alert, Button, Input, Logo, Panel, CoinIcon } from '../../../src/components/ui'
import { COMMUNITY_RULES } from '../../../src/lib/community-safety'

export default function Register() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [username, setUsername] = useState('')
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [sent, setSent] = useState(false)
  const [rules, setRules] = useState(false)
  async function submit() {
    if (loading) return
    if (!rules) { setError('Aceptá las normas de convivencia para crear tu cuenta.'); return }
    setError('')
    if (username.trim().length < 3 || password.length < 6) {
      setError(username.trim().length < 3 ? 'El nombre de usuario debe tener al menos 3 caracteres' : 'La contraseña debe tener al menos 6 caracteres'); return
    }
    setLoading(true)
    try {
      const entered = await register(email.trim(), password, username.trim())
      setPassword('')
      if (entered) navigate(takeDestination())
      else setSent(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos conectar. Reintentá.') }
    finally { setLoading(false) }
  }
  return <main className="flex min-h-dvh flex-col items-center justify-center p-6">
    <Panel className="flex w-full max-w-sm flex-col gap-6 p-8">
      <Logo size="md" className="justify-center" /><h1 className="text-center text-xl font-semibold">Crear tu cuenta</h1>
      {error && <Alert>{error}</Alert>}
      {sent ? <p role="status" className="text-center text-sm text-muted">Revisá tu email para confirmar la cuenta. Abrí el enlace y tocá Abrir Trucazo. Si no llega, mirá en el correo no deseado.</p> : <>
        <form onSubmit={e => { e.preventDefault(); void submit() }} className="flex flex-col gap-4">
          <Input label="Nombre de usuario" name="username" required minLength={3} value={username} onChange={e => setUsername(e.target.value)} placeholder="ej: ElTruco99" />
          <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
          <Input label="Contraseña" name="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <label className="text-xs text-muted flex items-start gap-2"><input type="checkbox" checked={rules} onChange={e => setRules(e.target.checked)} /><span>Acepto las <a href="#/terminos" className="text-gold underline">normas de convivencia</a>. {COMMUNITY_RULES}</span></label>
          <Button type="submit" fullWidth size="lg" disabled={loading || !rules}>{loading ? 'Creando cuenta…' : <span className="inline-flex items-center gap-2">Registrarse y ganar <CoinIcon size={16} /> 1.000</span>}</Button>
        </form>
        <p className="text-center text-xs leading-relaxed text-subtle">Al registrarte podemos enviarte novedades e invitaciones para volver a jugar. Podés darte de baja desde cualquier correo. <a href={WEB_ORIGIN + '/privacidad'} target="_blank" rel="noreferrer" className="text-gold hover:underline">Ver privacidad</a></p>
      </>}
      <a href="#/login" className="text-center text-sm font-semibold text-gold hover:underline">Ir a iniciar sesión</a>
    </Panel>
  </main>
}
