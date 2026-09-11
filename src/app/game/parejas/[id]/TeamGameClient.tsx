'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, Avatar, Button, Coins, Modal, Panel } from '@/components/ui'
import { SalonBackground, SalonTable } from '@/components/game/SalonScene'
import PlayingCard from '@/components/game/PlayingCard'
import CardBack from '@/components/game/CardBack'
import { getEnvidoPoints, type Card } from '@/lib/truco'
import type { TeamMember, TeamSnapshot } from '@/lib/team-game'
import { getSalonTheme } from '@/lib/salones'
import salon from '@/components/game/salon.module.css'
import styles from './team.module.css'

const labels: Record<string, string> = {
  mazo: 'Irse al mazo', envido: 'Envido', real_envido: 'Real envido', falta_envido: 'Falta envido',
  truco: 'Truco', retruco: 'Retruco', vale_cuatro: 'Vale cuatro',
  envido_yes: 'Quiero', envido_no: 'No quiero', truco_yes: 'Quiero', truco_no: 'No quiero', son_buenas: 'Son buenas',
}

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
  }, [animate, seat])
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
    if (state.table.status === 'waiting') return
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

  if (table.status === 'cancelled') return <main className={styles.result}><Panel className="max-w-md w-full p-6 flex flex-col gap-4 text-center"><h1 className="font-display text-2xl">Mesa cancelada</h1><p>Se devolvieron las apuestas.</p><Button onClick={lobby}>Volver al lobby</Button></Panel></main>
  if (!g || mySeat === null) return <main className={styles.result}><p>Recuperando tu partida…</p></main>
  const team = mySeat % 2
  const partners = members.filter(m => m.seat !== null && m.seat % 2 === team)
  const rivals = members.filter(m => m.seat !== null && m.seat % 2 !== team)
  if (table.status === 'finished') return <main className={styles.result}>
    <SalonBackground slug={salonSlug} />
    <Panel className="relative z-10 max-w-md w-full p-6 flex flex-col gap-4 text-center">
      <p className="text-gold font-semibold">Truco 2vs2</p><h1 className="font-display text-3xl font-bold">{g.winner_team === team ? '¡Ganó tu equipo!' : 'Ganó el otro equipo'}</h1>
      <p className="text-muted">{partners.map(m => m.username).join(' + ')}</p>
      <p className="font-display text-4xl text-gold">{g.scores[team]} — {g.scores[1 - team]}</p>
      <p className="text-muted">{rivals.map(m => m.username).join(' + ')}</p>
      {g.finish_reason !== 'points' && <p className="text-sm text-muted">{g.finish_reason === 'timeouts' ? 'Partida terminada por tres vencimientos de tiempo.' : 'Partida terminada por abandono.'}</p>}
      <p>{g.winner_team === team ? <>Cobraste <Coins amount={table.bet * 2} /></> : <>Apuesta: <Coins amount={table.bet} /></>}</p>
      <Button fullWidth onClick={lobby}>Volver al lobby</Button>
    </Panel>
  </main>

  const relativeSeats = [0, 1, 2, 3].map(n => (mySeat + n) % 4)
  const fullHand = [...state.hand, ...g.played.filter(c => c.seat === mySeat).map(c => c.card)]
  const tanto = getEnvidoPoints(fullHand)
  const actor = state.actor === null ? null : member(state.actor)
  const status = g.awaiting_deal ? `Mano para ${g.last_hand_winner === team ? 'tu equipo' : 'el otro equipo'}`
    : g.envido.status === 'declaring' ? `Declara ${actor?.username ?? ''}`
      : g.envido.status === 'pending' || g.truco.status === 'pending' ? `Responde el equipo de ${actor?.username ?? ''}`
        : `Turno de ${actor?.user_id === userId ? 'vos' : actor?.username ?? ''}`

  function seatView(m: TeamMember | undefined, relative: number) {
    if (!m || m.seat === null) return null
    return <div key={m.seat} className={`${styles.player} ${styles[`position${relative}`]} ${state.actor === m.seat && !g!.awaiting_deal ? styles.active : ''}`} data-team-hand={m.seat}>
      <Avatar url={m.avatar_url} name={m.username} size={32} />
      <span className={styles.playerName}>{m.user_id === userId ? 'Vos' : m.username}</span>
      {relative !== 0 && <div className={styles.backs} aria-label={`${m.username}: cartas ocultas`}>{Array.from({ length: Math.max(0, 3 - g!.played.filter(c => c.seat === m.seat).length) }, (_, i) => <div key={i}><CardBack /></div>)}</div>}
    </div>
  }

  return <main className={`${salon.game} ${getSalonTheme(salonSlug).integratedTable ? salon.reference : ''} ${styles.game}`}>
    <div className={styles.shell}>
      <SalonBackground slug={salonSlug} />
      <header className={styles.header}><span>TRUCAZO · 2vs2</span><button type="button" onClick={() => setShowExit(true)}>Salir</button></header>
      <div className={salon.scoreboard} aria-label="Marcador por equipos"><div className={salon.scoreRow}>
        <div className={salon.scorePlayer}><span className={salon.scoreName}>Nosotros</span><strong className={salon.scoreValue}>{g.scores[team]}</strong></div>
        <div className={salon.scoreDetail}><span>A {table.target_score}</span><span>Pozo {table.bet * 4}</span><span className={styles.small}>Mano {g.hand_number}</span></div>
        <div className={salon.scorePlayer}><span className={salon.scoreName}>Ellos</span><strong className={salon.scoreValue}>{g.scores[1 - team]}</strong></div>
      </div></div>
      <section className={styles.stage} data-team-stage aria-label="Mesa de cuatro jugadores">
        <SalonTable slug={salonSlug} />
        {relativeSeats.map((seat, relative) => seatView(member(seat), relative))}
        {relativeSeats.map((seat, relative) => <div key={seat} className={`${styles.pile} ${styles[`pile${relative}`]}`} role="group" aria-label={`Cartas jugadas por ${seat === mySeat ? 'vos' : member(seat)?.username}`}>
          {g.played.filter(c => c.seat === seat).map(played => {
            const key = `${g.hand_number}-${played.round}-${seat}`
            return <div key={key} className={styles.playedCard}><Played card={played.card} seat={seat} animate={!animated.current.has(key)} /></div>
          })}
        </div>)}
        {g.reveal && g.awaiting_deal && <div className={styles.reveal}><span>{member(g.reveal.seat)?.username}: {g.reveal.points} en mesa</span><div>{g.reveal.cards.map(c => <div key={`${c.suit}-${c.value}`}><PlayingCard card={c} /></div>)}</div></div>}
        <div className={styles.hand} aria-label="Tus cartas">{state.hand.map(c => <button key={`${g.hand_number}-${c.suit}-${c.value}`} aria-label={`Jugar ${c.value} de ${c.suit}`} disabled={busy || !state.legal.includes('play')} onClick={() => { void act('play', undefined, c) }}><PlayingCard card={c} /></button>)}</div>
      </section>
      <div className={styles.callout}>{g.announcement && <div className={styles.announcement} key={g.announcement.at} role="status"><strong>{member(g.announcement.seat)?.username}:</strong><span>{g.announcement.text}</span></div>}</div>
      <div className={styles.status} role="status"><span>{connected ? status : 'Reconectando…'}</span>{!g.awaiting_deal && <strong>{seconds}s</strong>}</div>
      <div className={styles.actions} aria-label="Acciones de la partida">
        {state.legal.filter(a => a !== 'play').map(a => <Button key={a} className={salon.action} variant={a === 'mazo' || a.endsWith('_no') ? 'ghost' : a.endsWith('_yes') ? 'positive' : 'secondary'} disabled={busy} onClick={() => { void act(a) }}>{a === 'tengo' ? `Tengo ${tanto}` : labels[a]}</Button>)}
      </div>
      {error && <div className={styles.error} role="alert" onClick={() => setError('')}>{error}</div>}
      <Modal open={showExit} title="¿Abandonar la partida?" onClose={() => setShowExit(false)}><p className="text-sm text-muted">Tu equipo perderá la partida y la apuesta. Para perder solamente esta mano, usá «Irse al mazo» cuando sea tu turno.</p><Button variant="danger" disabled={busy} onClick={() => { setShowExit(false); void act('forfeit') }}>Abandonar partida</Button><Button variant="ghost" onClick={() => setShowExit(false)}>Seguir jugando</Button></Modal>
    </div>
  </main>
}
