'use client'

import { Avatar } from '@/components/ui'
import { getSalonTheme } from '@/lib/salones'
import type { Card } from '@/lib/truco'
import PlayingCard from './PlayingCard'
import CardBack from './CardBack'

/** Pantalla de fin de partida "sobre la mesa": el salón queda de fondo,
 *  desenfocado, con las cartas de la última mano en abanico, el resultado en
 *  letra grande, el marcador con avatares y lo que se ganó/perdió. Abajo, un
 *  panel con los objetivos y las acciones (children). Compartida por el 1v1
 *  online y el Modo Historia. */
export default function FinishScreen({ won, salonSlug, hand, title, subtitle, note, me, opponent, extra, children }: {
  won: boolean
  salonSlug?: string
  hand: (Card | null)[]
  title: string
  subtitle: React.ReactNode
  note?: string
  me: { url?: string | null; name: string; score: number; highlight: boolean; players?: { avatar_url: string | null; username: string }[] }
  opponent: { url?: string | null; name: string; score: number; highlight: boolean; players?: { avatar_url: string | null; username: string }[] }
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  const fan = [
    'translateX(-50%) rotate(-18deg) translateX(-24px)',
    'translateX(-50%) translateY(-8px)',
    'translateX(-50%) rotate(18deg) translateX(24px)',
  ]
  const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
  const theme = getSalonTheme(salonSlug)
  const chip = (p: typeof me) => (
    <span aria-label={`${p.name}: ${p.score}`} className={`inline-flex items-center gap-2 rounded-full border bg-surface/85 px-3 py-1.5 text-sm font-bold ${p.highlight ? 'border-gold/50 shadow-gold-ring' : 'border-line'}`}>
      {p.players ? <span className="flex -space-x-1">{p.players.map((player, i) => <Avatar key={i} url={player.avatar_url} name={player.username} size={24} />)}</span> : <Avatar url={p.url} name={p.name} size={24} />}
      <span className={p.highlight ? 'text-lg text-gold' : ''}>{p.score}</span>
    </span>
  )
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#1a100d]">
      {/* El salón queda de fondo, desenfocado y oscurecido: seguís en la mesa */}
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-105 bg-[#211712] bg-cover bg-center blur-[2px] saturate-[.85]"
        style={{ backgroundImage: `url('${theme.scene}')` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(16,11,8,.55) 0%, rgba(16,11,8,.35) 26%, rgba(16,11,8,.72) 52%, #1a100d 64%)' }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[540px] flex-col">
        {/* Escena: cartas, resultado, marcador y premios */}
        <section className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pb-2 pt-12 text-center animate-fade-up">
          <div className="relative h-24 w-36" aria-hidden="true">
            {hand.map((c, i) => (
              <div
                key={i}
                className={`absolute bottom-0 left-1/2 w-[62px] origin-bottom ${i === 1 ? 'z-10' : ''} ${won ? '' : 'brightness-[.55] saturate-50'}`}
                style={{ transform: fan[i] }}
              >
                {c ? <PlayingCard card={c} /> : <CardBack className="w-full aspect-[600/925]" />}
              </div>
            ))}
          </div>

          <div>
            {won ? (
              <h2
                className="text-5xl font-bold leading-none bg-clip-text text-transparent"
                style={{
                  ...serif,
                  backgroundImage: 'linear-gradient(180deg, #F3DB89 0%, #C9A24B 55%, #A98532 100%)',
                  filter: 'drop-shadow(0 0 18px rgba(201,162,75,0.45))',
                }}
              >
                {title}
              </h2>
            ) : (
              <h2 className="text-5xl font-bold leading-none text-cream" style={serif}>{title}</h2>
            )}
            <p className="mt-2 text-sm font-medium text-muted">{subtitle}</p>
            {note && <p className="mt-1 text-xs text-subtle">{note}</p>}
          </div>

          <div className="flex items-center gap-2.5 tabular">
            {chip(me)}
            {chip(opponent)}
          </div>

          {extra}
        </section>

        {/* La mesa: el paño del salón entra desde abajo. Encima, las misiones
            como naipes; los botones, apoyados en el borde. */}
        <section
          className="relative -mx-[10%] flex flex-col gap-2.5 px-[calc(10%+1rem)] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-[inset_0_14px_30px_rgba(0,0,0,0.55),0_-10px_30px_rgba(0,0,0,0.6)] animate-fade-up"
          style={{
            background: theme.felt,
            borderTop: `7px solid ${theme.edge}`,
            borderRadius: '50% 50% 0 0 / 70px 70px 0 0',
          }}
        >
          {children}
        </section>
      </div>
    </main>
  )
}

