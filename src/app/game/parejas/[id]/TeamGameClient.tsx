'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, Avatar, Button, CoinIcon, Coins, Modal, Panel } from '@/components/ui'
import { SalonBackground, SalonTable } from '@/components/game/SalonScene'
import PlayingCard from '@/components/game/PlayingCard'
import CardBack from '@/components/game/CardBack'
import FinishScreen from '@/components/game/FinishScreen'
import { MesaHeader, MesaButton, MesaTurn, MesaAnnouncement, SeatAvatar, TableAccessory, MesaDeck, DEAL_ORIGINS } from '@/components/game/MesaUI'
import { TEAM_LABELS as labels, teamActionRows } from '@/lib/team-presentation'
import useTeamPresentation from './useTeamPresentation'
import TeamToolbar from './TeamToolbar'
import useTeamCosmetics from './useTeamCosmetics'
import { getEnvidoPoints, type Card } from '@/lib/truco'
import type { TeamMember, TeamSnapshot } from '@/lib/team-game'
import { getSalonTheme } from '@/lib/salones'
import salon from '@/components/game/salon.module.css'
import styles from './team.module.css'

function Played({ card, seat, animate }: { card: Card; seat: number; animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const target = ref.current
    if (!target || !animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const source = target.closest('[data-team-stage]')?.querySelector(`[data-team-hand="${seat}"]`)
    if (!source) return
    const from = source.getBoundingClientRect(), to = target.getBoundingClientRect()
    const animation = target.animate([
      { transform: `translate(${from.x + from.width / 2 - to.x - to.width / 2}px,${from.y + from.height / 2 - to.y - to.height / 2}px) scale(.8)` },
      { transform: 'translate(0,0) scale(1)' },
    ], { duration: 380, easing: 'cubic-bezier(.22,.7,.24,1)' })
    return () => animation.cancel()
    // Solo al montar: la carta vuela una vez. Si dependiera de `animate`, el
    // primer re-render (reloj, Realtime) la cancelaría a mitad de camino.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div ref={ref}><PlayingCard card={card} /></div>
}

export default function TeamGameClient({ initial, userId, salonSlug }: { initial: TeamSnapshot; userId: string; salonSlug: string }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(true)
  const [seconds, setSeconds] = useState(initial.table.time_limit)
  const [showExit, setShowExit] = useState(false)
  const pending = useRef<{ key: string; id: string } | null>(null)
  const acting = useRef(false)
  const disposed = useRef(false)
  const offset = useRef(Date.parse(initial.server_now) - Date.now())
  const animated = useRef(new Set(initial.game?.played.map(c => `${initial.game!.hand_number}-${c.round}-${c.seat}`)))
  const supabase = createClient()
  const router = useRouter()
  const { announce, showFinish } = useTeamPresentation(state)
  const cosmetics = useTeamCosmetics(state.members)

  const apply = useCallback((next: TeamSnapshot) => {
    if (disposed.current) return
    if (next.left) { router.push('/lobby'); router.refresh(); return }
    if (!next.table || next.table.version < current.current.table.version) return
    offset.current = Date.parse(next.server_now) - Date.now()
    current.current = next
    setState(next)
    setConnected(true)
  }, [router])

  const act = useCallback(async (action: string, seat?: number, card?: Card) => {
    if (acting.current) return
    acting.current = true
    if (action !== 'tick') { setBusy(true); setError('') }
    const snap = current.current
    const key = JSON.stringify([snap.table.version, action, seat, card])
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() }
    try {
      const result = await supabase.rpc('team_action', {
        p_table_id: snap.table.id, p_request_id: pending.current.id, p_version: snap.table.version,
        p_action: action, p_seat: seat ?? null, p_card: card ?? null,
      })
      if (disposed.current) return
      if (result.error) {
        if (action !== 'tick') setError(result.error.message)
        setConnected(false)
      } else {
        pending.current = null
        apply(result.data as TeamSnapshot)
        if ((result.data as TeamSnapshot).stale && action !== 'tick') setError('La mesa se actualizó. Revisá tu turno y volvé a intentar.')
      }
    } catch {
      if (!disposed.current) { setConnected(false); if (action !== 'tick') setError('Se cortó la conexión. Podés reintentar la acción.') }
    } finally { acting.current = false; if (!disposed.current) setBusy(false) }
  }, [apply, supabase])

  useEffect(() => {
    disposed.current = false
    const refresh = async () => {
      try {
        const result = await supabase.rpc('team_snapshot', { p_table_id: initial.table.id })
        if (disposed.current) return
        if (result.data) apply(result.data as TeamSnapshot)
        else setConnected(false)
      } catch { if (!disposed.current) setConnected(false) }
    }
    const presence = () => {
      if (['waiting', 'playing'].includes(current.current.table.status)) void supabase.rpc('team_presence', { p_table_id: initial.table.id })
    }
    const channel = supabase.channel(`team-${initial.table.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_tables', filter: `id=eq.${initial.table.id}` }, () => { void refresh() })
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh() })
    const poll = setInterval(() => { void refresh() }, 2500)
    const heartbeat = setInterval(presence, 8000)
    const focus = () => { presence(); void refresh() }
    window.addEventListener('online', focus)
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', focus)
    presence(); void refresh()
    return () => {
      disposed.current = true; clearInterval(poll); clearInterval(heartbeat)
      void supabase.removeChannel(channel)
      window.removeEventListener('online', focus); window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [initial.table.id, apply, supabase])

  useEffect(() => {
    const timer = setInterval(() => {
      const snap = current.current, g = snap.game
      if (!g || snap.table.status !== 'playing') return
      const elapsed = Date.now() + offset.current - Date.parse(g.action_started_at)
      setSeconds(Math.max(0, Math.ceil(snap.table.time_limit - elapsed / 1000)))
      if ((g.awaiting_deal && elapsed >= 2500) || (!g.awaiting_deal && (elapsed >= snap.table.time_limit * 1000 || (snap.actor_is_bot && elapsed >= 1200)))) void act('tick')
    }, 500)
    return () => clearInterval(timer)
  }, [act])

  useEffect(() => {
    // Solo mientras se juega: las pantallas de resultado y de mesa cancelada
    // pueden ser más altas que el celular y necesitan scroll para llegar al botón.
    if (state.table.status !== 'playing') return
    const previous = { html: document.documentElement.style.overflow, body: document.body.style.overflow, over: document.body.style.overscrollBehavior }
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none'
    return () => { document.documentElement.style.overflow = previous.html; document.body.style.overflow = previous.body; document.body.style.overscrollBehavior = previous.over }
  }, [state.table.status])
  useEffect(() => {
    const g = state.game
    if (g) for (const c of g.played) animated.current.add(`${g.hand_number}-${c.round}-${c.seat}`)
  }, [state.game])

  const { table, members, game: g, my_seat: mySeat } = state
  const owner = table.creator_id === userId
  const member = (seat: number) => members.find(m => m.seat === seat)
  const lobby = () => { router.push('/lobby'); router.refresh() }

  if (table.status === 'waiting') return <main className="min-h-dvh p-4 flex items-center justify-center">
    <Panel className="w-full max-w-lg p-5 flex flex-col gap-4">
      <div><h1 className="font-display text-2xl text-cream font-bold">{table.name}</h1><p className="text-sm text-muted">2vs2 · A {table.target_score} · <Coins amount={table.bet} size="sm" /> por jugador</p></div>
      {error && <Alert>{error}</Alert>}
      {!connected && <p role="status" className="text-sm text-muted">Reconectando con la mesa…</p>}
      {table.private_code && <div className="text-center rounded-xl border border-gold/40 p-3"><p className="text-sm text-muted">Código de la mesa</p><p className="text-xl font-bold tracking-widest text-gold">{table.private_code}</p></div>}
      <p className="text-sm text-cream">Elegí tu asiento. Los que están enfrente juegan juntos.</p>
      <div className={styles.seatPicker}>
        {[0, 1, 2, 3].map(seat => {
          const m = member(seat)
          return <div key={seat} className={`${styles.pickSeat} ${styles[`pick${seat}`]} ${mySeat === seat ? styles.selected : ''}`}>
            <span className="text-sm text-gold">Equipo {seat % 2 === 0 ? 'A' : 'B'} · {seat + 1}</span>
            {m ? <><Avatar url={m.avatar_url} name={m.username} size={32} /><span className="text-sm truncate max-w-full">{m.username}{m.user_id === userId ? ' (vos)' : ''}</span>
              {m.is_bot && owner && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { void act('remove_bot', seat) }}>Quitar bot</Button>}</>
              : <><Button size="sm" disabled={busy} onClick={() => { void act('seat', seat) }}>Sentarme</Button>
                {owner && members.length < 4 && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { void act('add_bot', seat) }}>Agregar bot</Button>}</>}
          </div>
        })}
      </div>
      {members.some(m => m.seat === null) && <p className="text-sm text-muted">Eligiendo asiento: {members.filter(m => m.seat === null).map(m => m.username).join(', ')}</p>}
      {owner ? <Button fullWidth disabled={busy || members.filter(m => m.seat !== null).length !== 4} onClick={() => { void act('start') }}>Empezar partida</Button>
        : <p className="text-sm text-muted text-center">El creador empieza cuando los cuatro estén sentados.</p>}
      <Button variant="ghost" disabled={busy} onClick={() => { void act('leave').then(() => { if (!current.current.left && current.current.table.status === 'cancelled') lobby() }) }}>{owner ? 'Cancelar mesa y recuperar apuestas' : 'Salir y recuperar mi apuesta'}</Button>
    </Panel>
  </main>

  const team = (mySeat ?? 0) % 2
  const partners = members.filter(m => m.seat !== null && m.seat % 2 === team)
  const rivals = members.filter(m => m.seat !== null && m.seat % 2 !== team)
  if (table.status === 'cancelled' || (table.status === 'finished' && showFinish)) {
    const voided = table.status === 'cancelled'
    const won = !voided && g?.winner_team === team
    const lastHand = [...state.hand, ...(g?.played.filter(c => c.seat === mySeat).map(c => c.card) ?? [])]
    return <FinishScreen
      won={won} salonSlug={salonSlug} hand={lastHand.length ? lastHand : [null, null, null]}
      title={voided ? 'Partida anulada' : won ? '¡Ganaste!' : 'Perdiste'}
      subtitle={voided ? 'Se devolvieron las apuestas.' : <>
        <b className="font-semibold text-cream">{partners.map(m => m.username).join(' + ')}</b><br />
        {won ? 'le ganó a' : 'perdió con'} {rivals.map(m => m.username).join(' + ')} · {g!.scores[team]} a {g!.scores[1 - team]}
      </>}
      note={g?.finish_reason === 'timeouts' ? 'Partida terminada por tres vencimientos de tiempo.' : g?.finish_reason === 'forfeit' ? 'Partida terminada por abandono.' : undefined}
      me={{ name: 'Nosotros', score: g?.scores[team] ?? 0, highlight: won, players: partners }}
      opponent={{ name: 'Ellos', score: g?.scores[1 - team] ?? 0, highlight: !voided && !won, players: rivals }}
      extra={voided ? <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-4 py-2 font-display font-bold text-muted"><CoinIcon size={18} />Apuesta reembolsada</div> :
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-display text-lg font-bold tabular ${won ? 'border-positive/40 bg-positive/10 text-positive' : 'border-negative/40 bg-negative/10 text-negative'}`}><CoinIcon size={18} />{won ? '+' : '−'}{table.bet.toLocaleString('es-AR')}</div>}
    >
      <Button variant="secondary" size="sm" fullWidth onClick={lobby}>Volver al lobby</Button>
    </FinishScreen>
  }
  if (!g || mySeat === null) return <main className={styles.result}><p>Recuperando tu partida…</p></main>

  const relativeSeats = [0, 1, 2, 3].map(n => (mySeat + n) % 4)
  const fullHand = [...state.hand, ...g.played.filter(c => c.seat === mySeat).map(c => c.card)]
  const tanto = getEnvidoPoints(fullHand)
  const actor = state.actor === null ? null : member(state.actor)
  const active = state.legal.length > 0 && table.status === 'playing' && !g.awaiting_deal
  const status = g.awaiting_deal ? `Mano para ${g.last_hand_winner === team ? 'tu equipo' : 'el otro equipo'}`
    : g.envido.status === 'declaring' ? `Declara ${actor?.username ?? ''}`
      : g.envido.status === 'pending' || g.truco.status === 'pending' ? `Responde el equipo de ${actor?.username ?? ''}`
        : actor?.user_id === userId ? 'Tu turno' : `Turno de ${actor?.username ?? ''}`

  function seatView(m: TeamMember | undefined, relative: number) {
    if (!m || m.seat === null) return null
    return <div key={m.seat} className={`${styles.player} ${styles[`position${relative}`]}`} data-team-hand={relative === 0 ? undefined : m.seat}>
      <SeatAvatar style={{ width: 'min(8cqh,36px)', height: 'min(8cqh,36px)' }} frame={cosmetics[m.user_id ?? '']?.frame} medal={cosmetics[m.user_id ?? '']?.medal} imageUrl={m.avatar_url} name={m.username} active={state.actor === m.seat && !g!.awaiting_deal} />
      <span className={`${salon.seatName} ${styles.playerName}`} title={`${m.username} · ${m.seat % 2 === team ? 'Nosotros' : 'Ellos'}`}>{m.user_id === userId ? 'Vos' : m.username}</span>
      {relative !== 0 && <div className={styles.backs} aria-label={`${m.username}: cartas ocultas`}>{Array.from({ length: Math.max(0, 3 - g!.played.filter(c => c.seat === m.seat).length) }, (_, i) => <div key={i}><CardBack /></div>)}</div>}
    </div>
  }

  return <main className={`${salon.game} ${getSalonTheme(salonSlug).integratedTable ? salon.reference : ''} ${styles.game}`}>
    {!getSalonTheme(salonSlug).integratedTable && <SalonBackground slug={salonSlug} />}
    <div className={`${salon.shell} ${styles.shell}`}>
      {getSalonTheme(salonSlug).integratedTable && <SalonBackground slug={salonSlug} />}
      <MesaHeader salonSlug={salonSlug} left={{ name: 'Nosotros', score: g.scores[team] }} right={{ name: 'Ellos', score: g.scores[1 - team] }} target={table.target_score} pot={table.bet * 4} mano={g.mano === mySeat ? 'vos' : g.mano % 2 === team ? 'compañero' : 'rival'} />
      <section className={styles.stage} data-team-stage aria-label="Mesa de cuatro jugadores">
        <SalonTable slug={salonSlug} />
        <MesaDeck className={styles.deck} />
        <TeamToolbar tableId={table.id} members={members} userId={userId} mySeat={mySeat} playing={table.status === 'playing'} />
        {announce && <MesaAnnouncement key={g.announcement?.at} announce={announce} />}
        {relativeSeats.map((seat, relative) => seatView(member(seat), relative))}
        {relativeSeats.map((seat, relative) => <TableAccessory key={seat} slug={cosmetics[member(seat)?.user_id ?? '']?.accessory} who={relative === 0 ? 'me' : 'opponent'} className={styles[`accessory${relative}`]} />)}
        {relativeSeats.map((seat, relative) => <div key={seat} className={`${styles.pile} ${styles[`pile${relative}`]}`} role="group" aria-label={`Cartas jugadas por ${seat === mySeat ? 'vos' : member(seat)?.username}`}>
          {g.played.filter(c => c.seat === seat).map(played => {
            const key = `${g.hand_number}-${played.round}-${seat}`
            return <div key={key} className={`${salon.playedCard} ${styles.playedCard}`}><Played card={played.card} seat={seat} animate={!animated.current.has(key)} /></div>
          })}
        </div>)}
        {g.reveal && g.awaiting_deal && <div className={styles.reveal} aria-label={`Envido de ${member(g.reveal.seat)?.username}: ${g.reveal.points} en mesa`}>
          {g.reveal.cards.map(c => <PlayingCard key={`${c.suit}-${c.value}`} card={c} flip />)}
        </div>}
        <div className={styles.hand} aria-label="Tus cartas" data-team-hand={mySeat}>
          {state.hand.map((c, i) => <div key={`${g.hand_number}-${c.suit}-${c.value}`} className="relative" style={{ transform: `rotate(${(i - (state.hand.length - 1) / 2) * 7}deg) translateY(${Math.abs(i - (state.hand.length - 1) / 2) * 7}px)`, transformOrigin: '50% 135%', zIndex: i + 1 }}>
            <PlayingCard card={c} interactive deal className={salon.handCard} aria-label={`Jugar ${c.value} de ${c.suit}`} disabled={busy || !state.legal.includes('play')} onClick={() => { void act('play', undefined, c) }} style={{ animationDelay: `${i * 110}ms`, ...DEAL_ORIGINS[i] }} />
          </div>)}
        </div>
      </section>
      <MesaTurn active={active} seconds={g.awaiting_deal || table.status !== 'playing' ? null : seconds}>{connected ? status : 'Reconectando…'}</MesaTurn>
      <div className={`${salon.actions} ${styles.actions}`} aria-label="Acciones de la partida">
        <div className={styles.actionRows}>
          {teamActionRows(state.legal).map((row, i) => <div key={i} className="flex gap-2">
            {row.map(a => <MesaButton key={a} tone={a === 'mazo' ? 'ghost' : a.endsWith('_no') ? 'danger' : a.endsWith('_yes') ? 'positive' : ['tengo', 'truco', 'retruco', 'vale_cuatro'].includes(a) ? 'gold' : 'outline'} disabled={busy || table.status !== 'playing'} onClick={() => { void act(a) }}>{a === 'tengo' ? `Tengo ${tanto}` : labels[a]}</MesaButton>)}
          </div>)}
        </div>
        <button onClick={() => setShowExit(true)} disabled={busy || table.status !== 'playing'} className="self-center -my-1 py-1.5 px-3 inline-flex items-center text-xs text-subtle hover:text-negative transition-colors disabled:opacity-50">Abandonar partida</button>
      </div>
      {error && <div className={styles.error} role="alert" onClick={() => setError('')}>{error}</div>}
      <Modal open={showExit} title="¿Abandonar la partida?" onClose={() => setShowExit(false)}><p className="text-sm text-muted">Tu equipo perderá la partida y la apuesta. Para perder solamente esta mano, usá «Irse al mazo» cuando sea tu turno.</p><Button variant="danger" disabled={busy} onClick={() => { setShowExit(false); void act('forfeit') }}>Abandonar partida</Button><Button variant="ghost" onClick={() => setShowExit(false)}>Seguir jugando</Button></Modal>
    </div>
  </main>
}
