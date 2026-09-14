'use client'

import type { CSSProperties } from 'react'
import { Alert, Avatar, Button, CoinIcon, Panel } from '@/components/ui'
import { getSalonTheme } from '@/lib/salones'
import type { TeamSnapshot } from '@/lib/team-game'
import styles from './waiting.module.css'

// Asientos vistos desde arriba: 0 abajo, 1 derecha, 2 arriba, 3 izquierda.
// Los enfrentados (0-2 y 1-3) juegan juntos, igual que en la mesa de juego.
const POSITIONS = ['bottom', 'right', 'top', 'left'] as const

export default function TeamWaitingRoom({ state, userId, salonSlug, busy, error, connected, act, onLeave }: {
  state: TeamSnapshot; userId: string; salonSlug: string; busy: boolean; error: string; connected: boolean
  act: (action: string, seat?: number) => void
  onLeave: () => void
}) {
  const { table, members, my_seat: mySeat } = state
  const owner = table.creator_id === userId
  const seated = members.filter(m => m.seat !== null).length
  const choosing = members.filter(m => m.seat === null && m.user_id !== userId)
  const canAddBot = owner && members.length < 4
  const creator = members.find(m => m.user_id === table.creator_id)
  const theme = getSalonTheme(salonSlug)

  // Relación de cada asiento con el mío: solo tiene sentido una vez sentado.
  const side = (seat: number) => mySeat === null ? '' : seat % 2 === mySeat % 2 ? styles.ours : styles.theirs
  const role = (seat: number) => mySeat === null ? null : seat % 2 === mySeat % 2 ? 'compañero' : 'rival'

  const seatView = (seat: number) => {
    const m = members.find(x => x.seat === seat)
    const mine = seat === mySeat
    return <div key={seat} className={`${styles.seat} ${styles[POSITIONS[seat]]}`}>
      {m ? <>
        <span className={`${styles.ring} ${side(seat)} ${mine ? styles.me : ''}`}><Avatar url={m.avatar_url} name={m.username} size={60} /></span>
        <span className={`${styles.name} ${mine ? styles.nameMe : ''}`} title={m.username}>{mine ? 'Vos' : m.username}</span>
        {!mine && role(seat) && <span className={styles.role}>{role(seat)}</span>}
        {m.is_bot && owner && <button type="button" className={styles.pill} disabled={busy} onClick={() => act('remove_bot', seat)}>Quitar bot</button>}
      </> : <>
        <button type="button" className={`${styles.free} ${side(seat)}`} disabled={busy} aria-label={`Sentarme en el asiento ${seat + 1}`} onClick={() => act('seat', seat)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        <span className={styles.name}>{mySeat === null ? 'Sentarme' : 'Libre'}</span>
        {role(seat) && <span className={styles.role}>{role(seat)}</span>}
        {canAddBot && <button type="button" className={styles.pill} disabled={busy} onClick={() => act('add_bot', seat)}>Añadir bot</button>}
      </>}
    </div>
  }

  const status = !connected ? 'Reconectando con la mesa…'
    : seated === 4 ? (owner ? 'Están los cuatro. ¡A jugar!' : `Esperando que ${creator?.username ?? 'el creador'} empiece la partida…`)
      : mySeat === null ? 'Tocá un lugar libre para sentarte.'
        : `Faltan ${4 - seated} para empezar.`

  return <main className="min-h-dvh p-4 flex items-center justify-center">
    <Panel className="w-full max-w-md p-5 flex flex-col gap-5 animate-fade-up">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-cream leading-tight">{table.name}</h1>
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className={styles.chip}>2vs2 · Parejas</span>
          <span className={styles.chip}>A {table.target_score}</span>
          <span className={`${styles.chip} ${styles.chipGold}`}><CoinIcon size={13} />{table.bet.toLocaleString('es-AR')} por jugador</span>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {table.private_code && <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-base px-4 py-2.5 shadow-gold-ring">
        <p className="text-sm text-muted">Código para invitar</p>
        <p className="font-display text-xl font-extrabold tracking-[0.25em] text-gold">{table.private_code}</p>
      </div>}

      <section aria-label="Asientos de la mesa" className="flex flex-col gap-3">
        <p className="text-sm text-cream text-center">Elegí tu lugar. <span className="text-muted">El de enfrente es tu compañero.</span></p>
        <div className={styles.board}>
          <div className={styles.felt} style={{ '--felt': theme.felt, '--edge': theme.edge } as CSSProperties} aria-hidden="true">
            <span className={styles.pot}><CoinIcon size={14} />{(table.bet * 4).toLocaleString('es-AR')}</span>
            <span className={styles.potLabel}>en juego</span>
          </div>
          {[2, 3, 1, 0].map(seatView)}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <p role="status" className="text-sm text-center text-muted">
          <span className="font-semibold text-cream tabular">{seated}/4</span> sentados · {status}
          {choosing.length > 0 && <><br /><span className="text-subtle">{choosing.map(m => m.username).join(', ')} {choosing.length === 1 ? 'está eligiendo' : 'están eligiendo'} lugar</span></>}
        </p>
        {owner && <Button size="lg" fullWidth disabled={busy || seated !== 4} onClick={() => act('start')}>Empezar partida</Button>}
        <button type="button" disabled={busy} onClick={onLeave} className="self-center py-1.5 px-3 text-sm text-subtle hover:text-negative transition-colors disabled:opacity-50">
          {owner ? 'Cancelar mesa y devolver apuestas' : 'Salir y recuperar mi apuesta'}
        </button>
      </div>
    </Panel>
  </main>
}
