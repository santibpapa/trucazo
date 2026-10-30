'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RecoveryScreen from '@/components/RecoveryScreen'

const KEY = 'trucazo:web-recovery:v1'
export default function RecoverAccountPage() {
  const [ready, setReady] = useState(false), [error, setError] = useState('')
  const router = useRouter(), client = createClient()
  useEffect(() => {
    const subscription = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session && !session.user.is_anonymous) {
        sessionStorage.setItem(KEY, JSON.stringify({ owner: session.user.id, at: Date.now() })); setReady(true)
        window.history.replaceState(null, '', '/recuperar-cuenta')
      }
      if (event === 'SIGNED_OUT') { sessionStorage.removeItem(KEY); setReady(false) }
    }).data.subscription
    void client.auth.getSession().then(({ data, error: failure }) => {
      const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
      if (saved && saved.owner === data.session?.user.id && Date.now() - saved.at < 3600000) setReady(true)
      if (failure || new URLSearchParams(window.location.hash.slice(1)).has('error')) {
        setError('El enlace venció o ya fue usado. Pedí uno nuevo.'); window.history.replaceState(null, '', '/recuperar-cuenta')
      }
    })
    return () => subscription.unsubscribe()
  }, [client])
  return <>
    {error && <p role="alert" className="p-3 text-center text-sm text-negative">{error}</p>}
    <RecoveryScreen ready={ready} back={<Link href="/login">Volver al ingreso</Link>}
      request={async email => {
        sessionStorage.removeItem(KEY); setReady(false); setError('')
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/recuperar-cuenta' })
        if (error) throw new Error('No pudimos enviar el correo. Esperá un minuto y reintentá.')
      }} change={async password => {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
        const { data } = await client.auth.getUser()
        if (!saved || data.user?.id !== saved.owner || Date.now() - saved.at >= 3600000) throw new Error('Pedí un enlace de recuperación nuevo.')
        const { error } = await client.auth.updateUser({ password })
        if (error) throw new Error('No pudimos cambiar la contraseña. Probá otra o pedí un enlace nuevo.')
        sessionStorage.removeItem(KEY)
      }} done={() => { router.push('/lobby'); router.refresh() }} />
  </>
}
