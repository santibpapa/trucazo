'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Salon, Frame } from '@/lib/types'
import { Panel, Button, Coins, CoinIcon, Alert, Avatar } from '@/components/ui'
import { getSalonTheme } from '@/lib/salones'

interface Props {
  initialCoins: number
  initialActiveSalon: string
  salons: Salon[]
  initialOwnedSalons: string[]
  initialActiveFrame: string
  frames: Frame[]
  initialOwnedFrames: string[]
  avatarUrl: string | null
  username: string
}

export default function TiendaClient({
  initialCoins,
  initialActiveSalon,
  salons,
  initialOwnedSalons,
  initialActiveFrame,
  frames,
  initialOwnedFrames,
  avatarUrl,
  username,
}: Props) {
  const [coins, setCoins] = useState(initialCoins)
  const [activeSalon, setActiveSalon] = useState(initialActiveSalon)
  const [ownedSalons, setOwnedSalons] = useState<string[]>(initialOwnedSalons)
  const [activeFrame, setActiveFrame] = useState(initialActiveFrame)
  const [ownedFrames, setOwnedFrames] = useState<string[]>(initialOwnedFrames)
  const [busy, setBusy] = useState<string | null>(null) // slug de la acción en curso
  const [error, setError] = useState('')

  const supabase = createClient()

  // ---- Salones ----
  function salonOwned(s: Salon) {
    return s.price === 0 || ownedSalons.includes(s.slug)
  }

  async function buySalon(s: Salon) {
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
      setActiveSalon(res.active_salon)
      setOwnedSalons(prev => [...prev, s.slug])
    }
    setBusy(null)
  }

  async function activateSalon(s: Salon) {
    if (busy || activeSalon === s.slug) return
    setBusy(s.slug)
    setError('')
    const { error } = await supabase.rpc('set_active_salon', { p_slug: s.slug })
    if (error) setError(error.message || 'No se pudo cambiar el salón')
    else setActiveSalon(s.slug)
    setBusy(null)
  }

  // ---- Marcos ----
  function frameOwned(f: Frame) {
    return f.price === 0 || ownedFrames.includes(f.slug)
  }

  async function buyFrame(f: Frame) {
    if (busy) return
    if (!window.confirm(`¿Comprar "${f.name}" por ${f.price.toLocaleString('es-AR')} monedas?`)) return
    setBusy(f.slug)
    setError('')
    const { data, error } = await supabase.rpc('buy_frame', { p_slug: f.slug })
    if (error) {
      setError(error.message || 'No se pudo comprar el marco')
    } else if (data) {
      const res = data as { coins: number; active_frame: string }
      setCoins(res.coins)
      setActiveFrame(res.active_frame)
      setOwnedFrames(prev => [...prev, f.slug])
    }
    setBusy(null)
  }

  async function activateFrame(f: Frame) {
    if (busy || activeFrame === f.slug) return
    setBusy(f.slug)
    setError('')
    const { error } = await supabase.rpc('set_active_frame', { p_slug: f.slug })
    if (error) setError(error.message || 'No se pudo cambiar el marco')
    else setActiveFrame(f.slug)
    setBusy(null)
  }

  return (
    <main className="min-h-screen w-full max-w-4xl mx-auto flex flex-col gap-6 px-4 sm:px-6 py-5 pb-16">
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
              const mine = salonOwned(s)
              const inUse = activeSalon === s.slug
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
                      <Button variant="primary" size="sm" fullWidth onClick={() => activateSalon(s)} disabled={busy != null}>
                        Usar
                      </Button>
                    ) : (
                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth
                        onClick={() => buySalon(s)}
                        disabled={busy != null || !canAfford}
                        title={canAfford ? undefined : 'No te alcanzan las monedas'}
                      >
                        <CoinIcon size={14} />
                        {canAfford ? s.price.toLocaleString('es-AR') : `Te faltan ${(s.price - coins).toLocaleString('es-AR')}`}
                      </Button>
                    )}
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </section>

      {/* Marcos */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-gold">Marcos</h2>
          <p className="text-sm text-muted">
            El aro que rodea tu foto de perfil. Se ve en el lobby, la mesa y tu lista de amigos.
          </p>
        </div>

        {frames.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-muted">
            Todavía no hay marcos. Volvé en un ratito.
          </Panel>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {frames.map(f => {
              const mine = frameOwned(f)
              const inUse = activeFrame === f.slug
              const canAfford = coins >= f.price
              return (
                <Panel
                  key={f.slug}
                  className={`overflow-hidden flex flex-col transition-shadow ${
                    inUse ? 'border-gold shadow-gold-ring' : ''
                  }`}
                >
                  {/* Vista previa: tu propia foto con el marco puesto */}
                  <div className="relative flex items-center justify-center py-6 bg-gradient-to-b from-surface2 to-base">
                    <Avatar url={avatarUrl} name={username} size={84} frame={f.slug} />
                    {inUse && (
                      <span className="absolute top-2 right-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-gold">
                        En uso
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 p-3">
                    <h3 className="font-display font-bold text-cream leading-tight">{f.name}</h3>
                    <p className="text-xs text-muted leading-snug flex-1">{f.description}</p>

                    {inUse ? (
                      <Button variant="secondary" size="sm" fullWidth disabled>
                        En uso
                      </Button>
                    ) : mine ? (
                      <Button variant="primary" size="sm" fullWidth onClick={() => activateFrame(f)} disabled={busy != null}>
                        Usar
                      </Button>
                    ) : (
                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth
                        onClick={() => buyFrame(f)}
                        disabled={busy != null || !canAfford}
                        title={canAfford ? undefined : 'No te alcanzan las monedas'}
                      >
                        <CoinIcon size={14} />
                        {canAfford ? f.price.toLocaleString('es-AR') : `Te faltan ${(f.price - coins).toLocaleString('es-AR')}`}
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
