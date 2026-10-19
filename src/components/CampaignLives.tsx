'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Alert, Button, Modal } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { CampaignLives as Lives, useCampaignLives, useLifeCountdown } from '@/lib/useCampaignLives'

const AD_UNIT = process.env.NEXT_PUBLIC_CAMPAIGN_REWARDED_AD_UNIT
const REWARD_KEY = 'trucazo:campaign:pending-reward'

export default function CampaignLives({ initial = null }: { initial?: Lives | null }) {
  const { data, error, refresh, setData } = useCampaignLives(initial)
  const paused = data?.lives_enabled === false
  const countdown = useLifeCountdown(data)
  const [supabase] = useState(createClient)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [pendingTicket, setPendingTicket] = useState<string | null>(null)
  const rewardKey = data ? `${REWARD_KEY}:${data.user_id}` : null

  useEffect(() => {
    if (!rewardKey) return
    try { setPendingTicket(localStorage.getItem(rewardKey)) } catch {}
  }, [rewardKey])
  useEffect(() => {
    const show = () => { setOpen(true); void refresh() }
    window.addEventListener('campaign-no-lives', show)
    return () => window.removeEventListener('campaign-no-lives', show)
  }, [refresh])

  async function request(friendId: string) {
    setBusy(true); setMessage('')
    try {
      const result = await supabase.rpc('request_campaign_life', { p_friend_id: friendId }).abortSignal(AbortSignal.timeout(8000))
      if (result.error) throw new Error(result.error.message)
      setData(result.data as Lives)
      setMessage('¡Pedido enviado! Tu amigo lo verá en Amigos.')
    } catch { setMessage('No se pudo enviar el pedido. Probá de nuevo.'); void refresh() }
    finally { setBusy(false) }
  }

  async function credit(ticket: string) {
    const result = await supabase.rpc('complete_campaign_life_ad', { p_ticket: ticket }).abortSignal(AbortSignal.timeout(8000))
    if (result.error?.code === 'P0001') {
      setPendingTicket(null)
      try { if (rewardKey) localStorage.removeItem(rewardKey) } catch {}
      void refresh()
      throw new Error('La recompensa venció o ya no está disponible. Revisá tus vidas.')
    }
    if (result.error || !result.data) throw new Error('No pudimos acreditar la vida. Tocá «Recuperar recompensa» para reintentar sin otro anuncio.')
    setData(result.data as Lives)
    setPendingTicket(null)
    try { if (rewardKey) localStorage.removeItem(rewardKey) } catch {}
    setMessage('Ya podés seguir jugando.')
  }

  async function watchAd() {
    setBusy(true); setMessage('')
    try {
      if (pendingTicket) { await credit(pendingTicket); return }
      if (!AD_UNIT) return
      const result = await supabase.rpc('begin_campaign_life_ad').abortSignal(AbortSignal.timeout(8000))
      if (result.error || !result.data) { await refresh(); throw new Error('No se pudo preparar el anuncio. Probá de nuevo.') }
      const ticket = result.data as string
      const { showCampaignRewardedAd } = await import('@/lib/campaign-rewarded-ad')
      let creditResult: Promise<void> | null = null
      const granted = await showCampaignRewardedAd(AD_UNIT, () => {
        setPendingTicket(ticket)
        try { if (rewardKey) localStorage.setItem(rewardKey, ticket) } catch {}
        // Guardar el resultado evita rechazos sin capturar mientras el video se cierra.
        creditResult = credit(ticket).catch(e => { setMessage((e as Error).message) })
      })
      if (creditResult) await creditResult
      if (!granted) setMessage('El anuncio se cerró sin recompensa. Podés esperar o pedir ayuda.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo abrir el anuncio.') }
    finally { setBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); void refresh() }}
        className="shrink-0 rounded-full border border-line bg-surface2/95 px-2.5 py-1.5 text-xs font-bold text-cream shadow-card hover:border-gold/60 transition-colors"
        aria-label={paused ? 'Vidas ilimitadas de Historia. Ver información' : data ? `${data.lives} de 3 vidas de Historia. Ver opciones` : 'Ver vidas de Historia'}>
        <span className="flex items-center justify-center gap-1.5"><span aria-hidden="true" className="text-negative">♥</span> Vidas <span className="tabular">{paused ? '∞' : data ? `${data.lives}/3` : '…'}</span></span>
        {countdown && <span className="block text-[10px] text-muted tabular">{countdown}</span>}
      </button>
      {open && createPortal(<Modal open={open} onClose={() => { if (!busy) setOpen(false) }} title="Vidas de Historia" showCloseButton panelClassName="max-h-[85dvh] overflow-y-auto">
        <div className="text-center">
          <p className="text-3xl tracking-widest text-negative" aria-label={paused ? 'Vidas ilimitadas' : data ? `${data.lives} de 3 vidas` : 'Cargando vidas'}>
            {paused ? '♥ ∞' : data ? '♥'.repeat(data.lives) + '♡'.repeat(3 - data.lives) : '…'}
          </p>
          <p className="mt-2 text-sm text-muted">{paused ? 'Por ahora podés jugar sin límite. Las derrotas no descuentan vidas.' : 'Perdés una vida al perder un duelo. Recuperás una cada 30 minutos, hasta 3.'}</p>
          {countdown && <p className="mt-2 text-sm font-bold text-gold">Próxima vida en {countdown}</p>}
        </div>
        {error && <Alert>{error}<button className="ml-2 underline" onClick={() => void refresh()}>Reintentar</button></Alert>}
        {message && <p role="status" className="text-sm text-cream">{message}</p>}
        {data?.active_game_id && <Link className="text-center text-sm font-bold text-gold underline" href={`/game/${data.active_game_id}`}>Retomar duelo pendiente</Link>}
        {pendingTicket ? <Button fullWidth onClick={watchAd} disabled={busy}>Recuperar recompensa</Button>
          : !paused && data?.lives === 0 && data.ads_enabled && AD_UNIT ? <div className="flex flex-col gap-2">
            <Button fullWidth onClick={watchAd} disabled={busy}>{busy ? 'Preparando…' : 'Ver anuncio para recuperar 1 vida'}</Button>
            <p className="text-xs text-muted text-center">Opcional. Completá el anuncio para recibir una vida. <Link href="/privacidad" className="underline">Privacidad</Link></p>
          </div> : null}
        {!paused && data?.lives === 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-bold text-sm text-cream">Pedile una vida a un amigo</p>
            <p className="text-xs text-muted">Ayudar es gratis y no le quita vidas.</p>
            {data.request_out ? <p role="status" className="text-sm text-gold">Esperando la ayuda de {data.request_out.username}.</p>
              : data.friends.map(friend => <div key={friend.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-cream truncate">{friend.username}</span>
                <Button size="sm" variant="secondary" onClick={() => request(friend.id)} disabled={busy}>Pedir</Button>
              </div>)}
            {data.friends.length === 0 && <Link href="/comunidad" className="text-sm text-gold underline">Agregá amigos desde Comunidad</Link>}
            <Link href="/lobby" className="text-sm text-muted text-center underline">Mientras esperás, jugá en las mesas</Link>
          </div>
        )}
      </Modal>, document.body)}
    </>
  )
}

export function CampaignLifeRequests() {
  const { data, refresh } = useCampaignLives()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function send(id: string) {
    setBusy(true)
    try {
      const result = await createClient().rpc('send_campaign_life', { p_request_id: id }).abortSignal(AbortSignal.timeout(8000))
      if (result.error) throw result.error
      setMessage(result.data === 'expired' ? 'El pedido ya venció o tu amigo ya recuperó una vida.' : '¡Vida enviada! Tus vidas siguen iguales.')
      await refresh()
    } catch { setMessage('No se pudo enviar la vida. Probá de nuevo.') }
    finally { setBusy(false) }
  }
  return <>
    {message && <p role="status" className="text-xs text-gold">{message}</p>}
    {data?.lives_enabled !== false && data?.requests_in.map(request => <div key={request.id} className="rounded-2xl border border-gold/40 bg-gold/10 p-3 flex items-center justify-between gap-3">
      <p className="text-sm text-cream min-w-0"><b>{request.username}</b> te pide una vida para Historia.</p>
      <Button size="sm" onClick={() => send(request.id)} disabled={busy}>Enviar gratis</Button>
    </div>)}
  </>
}
