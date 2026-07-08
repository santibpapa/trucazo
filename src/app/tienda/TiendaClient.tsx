'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Salon } from '@/lib/types'
import { Panel, Button, Coins, CoinIcon, Alert } from '@/components/ui'
import { getSalonTheme } from '@/lib/salones'

interface Props {
  initialCoins: number
  initialActive: string
  salons: Salon[]
  initialOwned: string[]
}

export default function TiendaClient({ initialCoins, initialActive, salons, initialOwned }: Props) {
  const [coins, setCoins] = useState(initialCoins)
  const [active, setActive] = useState(initialActive)
  const [owned, setOwned] = useState<string[]>(initialOwned)
  const [busy, setBusy] = useState<string | null>(null) // slug de la acción en curso
  const [error, setError] = useState('')

  const supabase = createClient()

  // Los gratis son de todos aunque no tengan fila de compra
  function isOwned(s: Salon) {
    return s.price === 0 || owned.includes(s.slug)
  }

  async function buy(s: Salon) {
    if (busy) return
    if (!window.confirm(`¿Comprar "${s.name}" por ${s.price.toLocaleString('es-AR')} monedas?`)) return
    setBusy(s.slug)
    setError('')
    const { data, error } = await supabase.rpc('buy_salon', { p_slug: s.slug })
    if (error) {
      setError(error.message || 'No se pudo comprar el salón')
    } else if (data) {
      const res = data as { coins: number; active_salon: string }
      setCoins(res.coins)
      setActive(res.active_salon)
      setOwned(prev => [...prev, s.slug])
    }
    setBusy(null)
  }

  async function activate(s: Salon) {
    if (busy || active === s.slug) return
    setBusy(s.slug)
    setError('')
    const { error } = await supabase.rpc('set_active_salon', { p_slug: s.slug })
    if (error) setError(error.message || 'No se pudo cambiar el salón')
    else setActive(s.slug)
    setBusy(null)
  }

  return (
    <main className="min-h-screen w-full max-w-4xl mx-auto flex flex-col gap-5 px-4 sm:px-6 py-5 pb-16">
      {/* Encabezado: volver + título + saldo */}
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-gold transition-colors"
        >
          <BackIcon /> Lobby
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-cream">Tienda</h1>
        <Coins amount={coins} size="md" />
      </header>

      {error && <Alert>{error}</Alert>}

      {/* Salones */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-gold">Salones</h2>
          <p className="text-sm text-muted">
            El ambiente donde jugás tus partidas. Comprás uno y queda tuyo para siempre.
          </p>
        </div>

        {salons.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-muted">
            La tienda está en preparación. Volvé en un ratito.
          </Panel>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {salons.map(s => {
              const mine = isOwned(s)
              const inUse = active === s.slug
              const canAfford = coins >= s.price
              return (
                <Panel
                  key={s.slug}
                  className={`overflow-hidden flex flex-col transition-shadow ${
                    inUse ? 'border-gold shadow-gold-ring' : ''
                  }`}
                >
                  {/* Vista previa: la foto del salón; si falta, el paño de SU mesa */}
                  <div
                    className="relative aspect-[4/3] bg-cover bg-center"
                    style={{
                      backgroundColor: '#241214',
                      backgroundImage: `url('/mesa/${s.slug}.png'), ${getSalonTheme(s.slug).felt}`,
                    }}
                  >
                    {inUse && (
                      <span className="absolute top-2 right-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-gold">
                        En uso
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 p-3">
                    <h3 className="font-display font-bold text-cream leading-tight">{s.name}</h3>
                    <p className="text-xs text-muted leading-snug flex-1">{s.description}</p>

                    {inUse ? (
                      <Button variant="secondary" size="sm" fullWidth disabled>
                        En uso
                      </Button>
                    ) : mine ? (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => activate(s)}
                        disabled={busy != null}
                      >
                        Usar
                      </Button>
                    ) : (
                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth
                        onClick={() => buy(s)}
                        disabled={busy != null || !canAfford}
                        title={canAfford ? undefined : 'No te alcanzan las monedas'}
                      >
                        <CoinIcon size={14} />
                        {canAfford
                          ? s.price.toLocaleString('es-AR')
                          : `Te faltan ${(s.price - coins).toLocaleString('es-AR')}`}
                      </Button>
                    )}
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
