'use client'

import { useRef, type ReactNode } from 'react'
import Panel from './ui/Panel'
import Logo from './ui/Logo'
import Input from './ui/Input'
import Button from './ui/Button'
import Alert from './ui/Alert'

interface Props {
  identifier: string
  password: string
  error: string
  loading: boolean
  onIdentifierChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLogin: () => void
  children: ReactNode
  registration: ReactNode
  status?: ReactNode
}

/** Presentación compartida; cada entrada conserva su propio acceso y navegación. */
export default function LoginScreen(props: Props) {
  const passwordField = useRef<HTMLInputElement>(null)
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">Entrá a jugar</p>
        </div>

        {props.status}
        {props.error && <Alert>{props.error}</Alert>}

        <div className="flex flex-col gap-4">
          <Input
            label="Email o usuario"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={props.identifier}
            onChange={e => props.onIdentifierChange(e.target.value)}
            placeholder="tu@email.com o tu usuario"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); passwordField.current?.focus() } }}
          />
          <Input
            label="Contraseña"
            name="password"
            ref={passwordField}
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            value={props.password}
            onChange={e => props.onPasswordChange(e.target.value)}
            placeholder="Tu contraseña"
            onKeyDown={e => e.key === 'Enter' && props.onLogin()}
          />
        </div>

        <Button fullWidth size="lg" onClick={props.onLogin} disabled={props.loading}>
          {props.loading ? 'Entrando…' : 'Iniciar sesión'}
        </Button>

        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex flex-col gap-3">{props.children}</div>
        <p className="text-center text-sm text-muted">
          ¿No tenés cuenta?{' '}{props.registration}
        </p>
      </Panel>
    </main>
  )
}
