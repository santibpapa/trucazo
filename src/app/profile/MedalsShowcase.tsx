'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MEDALS } from '@/lib/medallas'
import { Alert, cn } from '@/components/ui'

interface Props {
  /** Slugs de las medallas que el jugador tiene AHORA (permanentes + vivas). */
  earned: string[]
  /** Medalla destacada actual ('ninguno' si no eligió ninguna). */
  initialActive: string
}

/** Vitrina de medallas del perfil: muestra todas, marca las ganadas y deja
 *  elegir cuál se destaca como pin sobre el avatar. */
export default function MedalsShowcase({ earned, initialActive }: Props) {
  const [active, setActive] = useState(initialActive)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const earnedSet = new Set(earned)
  const count = MEDALS.filter(m => earnedSet.has(m.slug)).length

  async function toggle(slug: string) {
    if (busy || !earnedSet.has(slug)) return
    const next = active === slug ? 'ninguno' : slug // volver a tocar la destacada la saca
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('set_active_medal', { p_slug: next })
    if (error) setError(error.message || 'No se pudo cambiar la medalla')
    else setActive(next)
    setBusy(false)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-bold text-cream">Medallas</h2>
        <span className="text-xs text-subtle tabular">{count}/{MEDALS.length}</span>
      </div>
      <p className="-mt-1 text-sm text-muted">Tocá una medalla ganada para destacarla sobre tu avatar.</p>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {MEDALS.map(m => {
          const has = earnedSet.has(m.slug)
          const feat = active === m.slug
          const status = feat ? 'Destacada' : has ? (m.kind === 'live' ? 'En vivo' : 'Ganada') : m.description
          return (
            <button
              key={m.slug}
              type="button"
              onClick={() => toggle(m.slug)}
              disabled={busy || !has}
              title={has ? (feat ? 'Sacar de destacada' : 'Destacar sobre tu avatar') : `Bloqueada: ${m.description}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all',
                feat
                  ? 'border-gold bg-gold-soft/40 shadow-gold-ring'
                  : 'border-line bg-surface',
                has ? 'hover:border-gold/60' : 'cursor-default opacity-45 grayscale',
              )}
            >
              <span className="text-3xl leading-none">{m.emoji}</span>
              <span className="text-sm font-semibold leading-tight text-cream">{m.name}</span>
              <span className={cn('text-[11px] leading-snug', feat ? 'font-semibold text-gold' : 'text-subtle')}>
                {status}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
