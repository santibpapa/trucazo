'use client'

import { useEffect, useState } from 'react'
import { MOBILE_SCHEME, MOBILE_RELEASE_SCHEME } from '@/lib/auth-links'
import { buttonClass } from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import Logo from '@/components/ui/Logo'

// Puente HTTPS: ningún token de sesión ni credencial web se importa a la app.
export default function MobileAuthReturn() {
  const [link, setLink] = useState(''), [recovery, setRecovery] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const flow = params.get('flow'), nonce = params.get('nonce'), code = params.get('code')
    setRecovery(flow === 'recovery')
    if (!['google', 'signup', 'recovery'].includes(flow || '') || !nonce || !/^[0-9a-f-]{36}$/i.test(nonce)) {
      setError('Este enlace está incompleto. Volvé a iniciar el acceso.'); return
    }
    const target = new URL((params.get('app') === 'release' ? MOBILE_RELEASE_SCHEME : MOBILE_SCHEME) + '://auth/callback')
    target.searchParams.set('flow', flow!); target.searchParams.set('nonce', nonce)
    const flowId = params.get('sb_flow_id')
    if (flowId && /^[0-9a-f]{32}$/.test(flowId)) target.searchParams.set('sb_flow_id', flowId)
    if (params.has('error') || params.has('error_code') || fragment.has('error') || fragment.has('error_code')) target.searchParams.set('error', 'cancelled')
    else if (code && /^[A-Za-z0-9_-]{8,512}$/.test(code)) target.searchParams.set('code', code)
    else { setError('El enlace venció o está incompleto. Pedí uno nuevo.'); return }
    setLink(target.toString())
    // El código queda sólo en el botón, sin historial, referencia ni analítica.
    window.history.replaceState(null, '', '/auth/mobile')
  }, [])
  return <main className="flex min-h-dvh flex-col items-center justify-center p-6">
    <Panel className="flex w-full max-w-sm flex-col gap-6 p-8 text-center">
      <Logo size="md" className="justify-center" /><h1 className="text-xl font-semibold">Volvé a Trucazo</h1>
      <p role={error ? 'alert' : 'status'} className="text-sm text-muted">{error || 'Abrí la app para completar el acceso que iniciaste allí.'}</p>
      {link && <a href={link} className={buttonClass('primary', 'lg', true)}>Abrir Trucazo</a>}
      <a href={recovery ? '/recuperar-cuenta' : '/login'} className="text-sm text-gold hover:underline">{recovery ? 'Recuperar desde este navegador' : 'Entrar desde este navegador'}</a>
      <p className="text-xs text-subtle">Si la app no está instalada, iniciá el acceso desde este navegador. Los enlaces se completan donde los pediste.</p>
    </Panel>
  </main>
}
