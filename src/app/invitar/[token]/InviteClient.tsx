'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert, Button, Coins, Input } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import { createClient } from '@/lib/supabase/client'
import { invitationAuthLink, invitationPath, type TableInvitePreview } from '@/lib/table-invites'

export default function InviteClient({ token, invite, signedIn }: {
  token: string; invite: TableInvitePreview; signedIn: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const pending = useRef(false)
  const next = invitationPath(token)!

  async function join() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const { data, error: joinError } = await createClient().rpc('join_table_invite', { p_token: token })
        .abortSignal(AbortSignal.timeout(8000))
      if (joinError || !data) throw new Error(joinError?.message ?? 'No se pudo entrar a la mesa')
      router.push(data as string)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setError(message.includes('monedas') ? 'No tenés suficientes monedas para esta mesa.'
        : /disponible|llena|comenzó/.test(message) ? 'La mesa se llenó o ya no está disponible.'
          : 'No pudimos confirmar la entrada. Reintentá: si ya entraste, no se te vuelve a cobrar.')
      router.refresh()
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <>
    <header className="flex flex-col gap-2 text-center">
      <p className="text-sm text-gold">{invite.creator_username} te invita a jugar</p>
      <h1 className="font-display text-2xl font-bold text-cream break-words">{invite.name}</h1>
      <p className="text-sm text-muted">{invite.mode === '2v2' ? 'Parejas · 2 vs 2' : 'Mano a mano · 1 vs 1'}</p>
    </header>
    <div className="rounded-xl border border-line bg-base p-4 flex flex-col gap-2 text-sm">
      <div className="flex justify-between gap-2"><span className="text-muted">Apuesta por persona</span><Coins amount={invite.bet} size="sm" /></div>
      <p className="text-muted">A {invite.target_score} puntos · {invite.time_limit} segundos por jugada</p>
      {invite.mode === '2v2' && <p className="text-muted">{invite.occupied}/4 lugares ocupados · Elegís tu lugar al entrar.</p>}
    </div>
    {error && <Alert>{error}</Alert>}
    {invite.destination ? <Button fullWidth onClick={() => router.push(invite.destination!)}>Volver a mi mesa</Button>
      : !invite.available ? <p role="status" className="text-center text-sm text-muted">La mesa se llenó o ya no está disponible. Pedile otra invitación a quien te invitó.</p>
        : signedIn ? <>
          <p className="text-xs text-subtle text-center">Al confirmar se descuentan {invite.bet.toLocaleString('es-AR')} monedas ficticias de tu saldo.</p>
          <Button fullWidth size="lg" disabled={busy} onClick={() => { void join() }}>{busy ? 'Confirmando…' : 'Unirme'}</Button>
        </> : <>
          <p className="text-sm text-muted text-center">Entrá para confirmar la invitación.</p>
          <Input label="Tu nombre para jugar" name="guestName" value={name} onChange={event => setName(event.target.value)} maxLength={16} placeholder="Cómo te llamás" />
          <GuestButton returnTo={next} username={name} source="table_invite" label="Continuar como invitado" variant="primary" />
          <Link href={invitationAuthLink('/login', next)} className="text-center text-sm font-semibold text-gold">Ya tengo cuenta · Iniciar sesión</Link>
          <Link href={invitationAuthLink('/register', next)} className="text-center text-sm text-muted">Crear una cuenta</Link>
        </>}
  </>
}
