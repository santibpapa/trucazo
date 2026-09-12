'use client'

import { useState } from 'react'
import { CoinIcon } from '@/components/ui'
import { getFrameTheme } from '@/lib/marcos'
import { getMedal } from '@/lib/medallas'
import { getSalonTheme } from '@/lib/salones'
import styles from './salon.module.css'

/** La misma cabecera y el mismo reloj en las dos modalidades. */
export function MesaHeader({ salonSlug, left, right, target, pot, mano }: {
  salonSlug: string
  left: { name: string; score: number }
  right: { name: string; score: number }
  target: number
  pot: number
  mano: string
}) {
  const theme = getSalonTheme(salonSlug)
  return <>
    <div className={styles.brand} aria-label="Trucazo">TRUCAZO
      {theme.integratedTable && <span className={styles.salonName}>{theme.name}</span>}
    </div>
    <div className={styles.scoreboard} aria-label="Marcador">
      <div className={styles.scoreRow}>
        <div className={styles.scorePlayer}><span className={styles.scoreName}>{left.name}</span><span className={styles.scoreValue}>{left.score}</span></div>
        <div className={styles.scoreDetail}>
          <span>A {target}</span>
          {pot > 0 && <span className="inline-flex items-center gap-1"><CoinIcon size={12} />{pot}</span>}
          <small>{pot > 0 ? 'Pozo · ' : ''}Mano: {mano}</small>
        </div>
        <div className={styles.scorePlayer}><span className={styles.scoreName}>{right.name}</span><span className={styles.scoreValue}>{right.score}</span></div>
      </div>
    </div>
  </>
}

export function MesaTurn({ active, seconds, children }: { active: boolean; seconds: number | null; children: React.ReactNode }) {
  return <div className={styles.turn}>
    <div role="status" className={`${styles.turnLabel} ${active ? styles.turnActive : ''}`}>
      {children}
      {seconds != null && <span className={`ml-2 tabular ${seconds <= 5 ? 'text-negative font-bold' : 'opacity-80'}`}>⏱ {seconds}s</span>}
    </div>
  </div>
}

export function MesaToolbar({ muted, onToggleMute, emoteTray, onToggleEmotes }: {
  muted: boolean; onToggleMute: () => void; emoteTray: boolean; onToggleEmotes: () => void
}) {
  return <div className={styles.toolbar}>
    <button onClick={onToggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className={styles.toolButton}>{muted ? <SoundOffIcon /> : <SoundOnIcon />}</button>
    <button onClick={onToggleEmotes} aria-label="Chat rápido" aria-expanded={emoteTray} className={styles.toolButton}><ChatIcon /></button>
  </div>
}

export type Announce = {
  side: 'top' | 'bottom' | 'left' | 'right'
  eyebrow?: string
  title: string
  titleClass: string
  subtitle?: string
  subtitleClass?: string
  // Tablero de 2 columnas (vos / rival) para el resultado del envido. El ganador
  // va en verde y el perdedor en rojo; points null = tanto oculto ("son buenas").
  score?: {
    left: { label: string; points: number | null; won: boolean }
    right: { label: string; points: number | null; won: boolean }
  }
  // Mano en la que se mostró el cartel: al empezar una mano nueva descartamos los
  // carteles de manos anteriores para que no tapen la mesa nueva.
  hand?: number
}

export const DEAL_ORIGINS: Array<Record<string, string>> = [
  { '--dx': '95px', '--dy': '-110px', '--rot': '14deg' },
  { '--dx': '55px', '--dy': '-120px', '--rot': '9deg' },
  { '--dx': '22px', '--dy': '-110px', '--rot': '5deg' },
]


// Asiento del marcador: la cara del rival de campaña (/personajes/{slug}.webp) o
// una silueta genérica. El aro dorado latiendo marca al que le toca actuar.
export function SeatAvatar({ slug, imageUrl, name, active, frame, medal, style }: { slug?: string | null; imageUrl?: string | null; name: string; active?: boolean; frame?: string | null; medal?: string | null; style?: React.CSSProperties }) {
  const [imgFailed, setImgFailed] = useState(false)
  // El rival de campaña usa su ilustración (slug); el resto, su foto de perfil.
  const src = slug ? `/personajes/${slug}.webp` : imageUrl || null
  // Marco comprado en la Tienda, alrededor del retrato de cada jugador.
  const theme = getFrameTheme(frame)

  const face =
    src && !imgFailed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setImgFailed(true)}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
    ) : (
      <PersonIcon />
    )

  const leather = 'linear-gradient(180deg, #3a2224 0%, #2a1517 100%)'

  // El marco comprado conserva su aro alrededor del retrato circular.
  const box = theme ? (
    <div
      className={`shrink-0 overflow-hidden transition-shadow relative ${styles.avatar} ${
        active ? 'ring-1 ring-gold/60 animate-pulse-glow' : ''
      }`}
      style={{ background: theme.ring, boxShadow: active ? undefined : theme.glow, ...style }}
    >
      <div
        className={`absolute inset-[3px] overflow-hidden flex items-center justify-center ${styles.avatarInner}`}
        style={{ background: leather }}
      >
        {face}
      </div>
    </div>
  ) : (
    <div
      className={`shrink-0 overflow-hidden flex items-center justify-center transition-shadow ${styles.avatar} ${
        active ? 'border-gold ring-1 ring-gold/60 animate-pulse-glow' : 'border-line'
      }`}
      style={{ background: leather, ...style }}
    >
      {face}
    </div>
  )

  const medalMeta = getMedal(medal)
  if (!medalMeta) return box

  // Pin de la medalla destacada en la esquina del asiento.
  return (
    <div className="relative shrink-0">
      {box}
      <span
        aria-hidden="true"
        title={medalMeta.name}
        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border border-line bg-surface2 shadow-card leading-none w-5 h-5 text-[13px]"
      >
        {medalMeta.emoji}
      </span>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-gold/50 mt-1.5">
      <circle cx="12" cy="8" r="3.6" fill="currentColor" />
      <path d="M4 20.5c1.2-3.8 4.3-5.8 8-5.8s6.8 2 8 5.8V22H4v-1.5Z" fill="currentColor" />
    </svg>
  )
}

// Accesorio comprado en la Tienda, apoyado sobre el paño en el lado del jugador.
// El rival va a la IZQUIERDA y un poco abajo de sus cartas; el mío a la DERECHA.
// Se ubican en los costados (donde no caen cartas) para que no queden tapados.
// Imagen /accesorios/{slug}.webp; si falta, se oculta sola (onError).
export function TableAccessory({ slug, who, className = '' }: { slug?: string | null; who: 'me' | 'opponent'; className?: string }) {
  if (!slug || slug === 'ninguno') return null
  const pos =
    who === 'opponent'
      ? 'top-[24%] left-1 sm:left-4'   // rival: izquierda, debajo de sus cartas
      : 'bottom-[13%] right-0 sm:right-2' // yo: derecha, un poco más abajo
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/accesorios/${slug}.webp`}
      alt=""
      aria-hidden="true"
      onError={e => { e.currentTarget.style.display = 'none' }}
      className={`pointer-events-none absolute ${pos} z-[5] w-14 sm:w-20 object-contain select-none drop-shadow-[0_8px_10px_rgba(0,0,0,0.55)] ${className}`}
    />
  )
}

// Botones de la mesa: píldoras oscuras con borde dorado (estilo salón). 'gold'
// es la acción estrella (Truco); el resto varía borde/texto según la intención.
type MesaTone = 'gold' | 'outline' | 'positive' | 'danger' | 'ghost'
const MESA_TONES: Record<MesaTone, string> = {
  gold: 'text-ink font-display font-extrabold tracking-wide border border-[#8a6a2c] bg-gradient-to-b from-[#E8CF84] via-gold to-[#A98532] shadow-gold hover:brightness-105',
  outline:
    'text-cream border border-gold/70 bg-gradient-to-b from-[#43282b] to-[#241214] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-gold',
  positive:
    'text-positive border border-positive/60 bg-gradient-to-b from-[#26302a] to-[#141a16] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-positive',
  danger:
    'text-[#F0A98F] border border-negative/60 bg-gradient-to-b from-[#3c221c] to-[#1f100c] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-negative',
  ghost: 'text-muted border border-line/80 bg-black/30 hover:text-cream hover:border-gold/40',
}

export function MesaButton({
  tone = 'outline',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: MesaTone }) {
  return (
    <button
      data-tone={tone}
      className={`w-full h-11 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold select-none transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${MESA_TONES[tone]} ${styles.action} ${className ?? ''}`}
      {...props}
    />
  )
}

export function MesaAnnouncement({ announce }: { announce: Announce }) {
  return (
          <div role="status" aria-live="polite" aria-atomic="true" className={`absolute inset-x-0 z-30 px-3 -translate-y-1/2 pointer-events-none ${announce.side === 'top' ? 'top-[30%]' : announce.side === 'bottom' ? 'top-[70%]' : 'top-[50%]'}`}>
            <div
              className="mx-auto max-w-[16rem] rounded-2xl border border-gold/40 bg-[#160b0d]/90 backdrop-blur-md px-5 py-3 text-center shadow-lift animate-announce-in"
              style={{ '--enterY': announce.side === 'top' ? '-22px' : '22px' } as React.CSSProperties}
            >
              {announce.score ? (
                <>
                  {/* Título centrado arriba (ENVIDO / REAL ENVIDO / …) */}
                  <div className={`font-display text-lg font-extrabold uppercase tracking-[0.2em] ${announce.titleClass}`}>
                    {announce.title}
                  </div>
                  {/* Dos columnas: vos / rival, con su tanto. Ganador verde, perdedor rojo. */}
                  <div className="mt-2.5 grid grid-cols-2 divide-x divide-white/15">
                    {[announce.score.left, announce.score.right].map((c, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5 px-2 min-w-0">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide truncate max-w-[6.5rem] ${c.won ? 'text-positive' : 'text-negative'}`}>
                          {c.label}
                        </span>
                        <span className={`font-display text-3xl font-extrabold tabular leading-none ${c.won ? 'text-positive' : 'text-negative'}`}>
                          {c.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {announce.eyebrow && (
                    <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold">{announce.eyebrow}</div>
                  )}
                  <div className={`font-display text-xl font-extrabold mt-1 ${announce.titleClass}`}>{announce.title}</div>
                  {announce.subtitle && (
                    <div className={`text-sm mt-1 ${announce.subtitleClass ?? 'text-cream/85'}`}>{announce.subtitle}</div>
                  )}
                </>
              )}
            </div>
          </div>
  )
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a7 7 0 0 1 7-7h2a7 7 0 0 1 0 14H8l-3.5 2.5.5-3.7A7 7 0 0 1 4 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9a3.5 3.5 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export const EMOTES = ['👏', '😂', '😎', '🔥', '🃏', '¡Mentiroso!', '¡Andá!', '¡Achicate!', '¡Quiero!', '¡Buena!']

export function EmoteTray({ onSend, cooldown }: { onSend: (text: string) => void; cooldown: boolean }) {
  return (
          <div className="absolute top-12 right-2 z-30 flex flex-wrap justify-end gap-1.5 max-w-[15rem] rounded-2xl border border-line bg-base/95 backdrop-blur p-2 shadow-lift animate-scale-in">
            {EMOTES.map(e => {
              const isText = /[a-zA-ZÁÉÍÓÚáéíóú]/.test(e)
              return (
                <button
                  key={e}
                  onClick={() => onSend(e)}
                  disabled={cooldown}
                  className={`h-9 px-2.5 rounded-xl bg-surface2 hover:bg-surface border border-line hover:border-gold flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:border-line ${
                    isText ? 'text-sm font-semibold text-cream whitespace-nowrap' : 'text-xl'
                  }`}
                >
                  {e}
                </button>
              )
            })}
          </div>
  )
}
