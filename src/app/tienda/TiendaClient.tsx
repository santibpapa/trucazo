'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { Salon, Frame, Accessory } from '@/lib/types'
import { Panel, Button, Coins, CoinIcon, Alert, Avatar } from '@/components/ui'
import { SALON_THEMES } from '@/lib/salones'
import { SalonBackground, SalonTable } from '@/components/game/SalonScene'

const SalonPreview = dynamic(() => import('@/components/game/SalonPreview'), { ssr: false })

interface Props {
  initialCoins: number
  initialActiveSalon: string
  salons: Salon[]
  initialOwnedSalons: string[]
  initialActiveFrame: string
  frames: Frame[]
  initialOwnedFrames: string[]
  initialActiveAccessory: string
  accessories: Accessory[]
  initialOwnedAccessories: string[]
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
  initialActiveAccessory,
  accessories,
  initialOwnedAccessories,
  avatarUrl,
  username,
}: Props) {
  const [coins, setCoins] = useState(initialCoins)
  const [activeSalon, setActiveSalon] = useState(initialActiveSalon)
  const [ownedSalons, setOwnedSalons] = useState<string[]>(initialOwnedSalons)
  const [activeFrame, setActiveFrame] = useState(initialActiveFrame)
  const [ownedFrames, setOwnedFrames] = useState<string[]>(initialOwnedFrames)
  const [activeAccessory, setActiveAccessory] = useState(initialActiveAccessory)
  const [ownedAccessories, setOwnedAccessories] = useState<string[]>(initialOwnedAccessories)
  const [busy, setBusy] = useState<string | null>(null) // slug de la acción en curso
  const [error, setError] = useState('')
  const [previewSalon, setPreviewSalon] = useState<string | null>(null)

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

  // ---- Accesorios ----
  function accessoryOwned(a: Accessory) {
    return a.price === 0 || ownedAccessories.includes(a.slug)
  }

  async function buyAccessory(a: Accessory) {
    if (busy) return
    if (!window.confirm(`¿Comprar "${a.name}" por ${a.price.toLocaleString('es-AR')} monedas?`)) return
    setBusy(a.slug)
    setError('')
    const { data, error } = await supabase.rpc('buy_accessory', { p_slug: a.slug })
    if (error) {
      setError(error.message || 'No se pudo comprar el accesorio')
    } else if (data) {
      const res = data as { coins: number; active_accessory: string }
      setCoins(res.coins)
      setActiveAccessory(res.active_accessory)
      setOwnedAccessories(prev => [...prev, a.slug])
    }
    setBusy(null)
  }

  // Poner en la mesa, o sacar (si ya está puesto) volviendo a 'ninguno'.
  async function activateAccessory(a: Accessory) {
    if (busy) return
    const next = activeAccessory === a.slug ? 'ninguno' : a.slug
    setBusy(a.slug)
    setError('')
    const { error } = await supabase.rpc('set_active_accessory', { p_slug: next })
    if (error) setError(error.message || 'No se pudo cambiar el accesorio')
    else setActiveAccessory(next)
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

      {previewSalon && <SalonPreview slug={previewSalon} onClose={() => setPreviewSalon(null)} />}

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
            {salons.map(original => {
              // La presentación se renueva sin cambiar el slug/precio comprado.
              const theme = SALON_THEMES[original.slug]
              const s = theme ? { ...original, name: theme.name, description: theme.description } : original
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
                  <button
                    type="button"
                    className="relative aspect-[4/3] overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                    onClick={() => setPreviewSalon(s.slug)}
                    aria-label={`Ver mesa: ${s.name}`}
                  >
                    <SalonBackground slug={s.slug} />
                    <div className="absolute inset-x-[10%] top-[28%] bottom-[-20%]">
                      <SalonTable slug={s.slug} />
                    </div>
                    <span className="absolute bottom-2 left-2 rounded-md border border-gold/40 bg-black/80 px-2 py-1 text-xs text-cream">Ver mesa</span>
                    {inUse && (
                      <span className="absolute top-2 right-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-gold">
                        En uso
                      </span>
                    )}
                  </button>

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

      {/* Accesorios */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-gold">Accesorios</h2>
          <p className="text-sm text-muted">
            Un objeto para apoyar sobre la mesa, en tu lado. Elegís uno y tu rival lo ve. Podés sacarlo cuando quieras.
          </p>
        </div>

        {accessories.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-muted">
            Todavía no hay accesorios. Volvé en un ratito.
          </Panel>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {accessories.map(a => {
              const mine = accessoryOwned(a)
              const inUse = activeAccessory === a.slug
              const canAfford = coins >= a.price
              return (
                <Panel
                  key={a.slug}
                  className={`overflow-hidden flex flex-col transition-shadow ${
                    inUse ? 'border-gold shadow-gold-ring' : ''
                  }`}
                >
                  {/* Vista previa: la imagen del accesorio sobre un paño */}
                  <div
                    className="relative flex items-center justify-center p-4"
                    style={{ background: 'radial-gradient(ellipse at 50% 40%, #56262d 0%, #3a1c22 60%, #2a141a 100%)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/accesorios/${a.slug}.webp`}
                      alt={a.name}
                      onError={e => { e.currentTarget.style.visibility = 'hidden' }}
                      className="h-24 w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.55)]"
                    />
                    {inUse && (
                      <span className="absolute top-2 right-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-gold">
                        En la mesa
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5 p-3">
                    <h3 className="font-display font-bold text-cream leading-tight">{a.name}</h3>
                    <p className="text-xs text-muted leading-snug flex-1">{a.description}</p>

                    {inUse ? (
                      <Button variant="secondary" size="sm" fullWidth onClick={() => activateAccessory(a)} disabled={busy != null}>
                        Sacar de la mesa
                      </Button>
                    ) : mine ? (
                      <Button variant="primary" size="sm" fullWidth onClick={() => activateAccessory(a)} disabled={busy != null}>
                        Poner en la mesa
                      </Button>
                    ) : (
                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth
                        onClick={() => buyAccessory(a)}
                        disabled={busy != null || !canAfford}
                        title={canAfford ? undefined : 'No te alcanzan las monedas'}
                      >
                        <CoinIcon size={14} />
                        {canAfford ? a.price.toLocaleString('es-AR') : `Te faltan ${(a.price - coins).toLocaleString('es-AR')}`}
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
