'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export type RankingCampaignState = {
  active: boolean
  pending: number
  sent: number
  failed: number
  skipped: number
}

export default function RankingCampaign({ state }: { state: RankingCampaignState | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (!state) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/ranking-campaign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !state.active }),
      })
      if (!response.ok) throw new Error('No se pudo cambiar el estado.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-gold/40 bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-cream">Movimientos del ranking</h2>
          <p className="text-sm text-muted">
            {state ? state.active ? 'Activa · envío inmediato' : 'Pausada' : 'Pendiente de configuración'}
          </p>
        </div>
        {state && (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void toggle()}>
            {busy ? 'Guardando…' : state.active ? 'Pausar' : 'Activar'}
          </Button>
        )}
      </div>

      <p className="mt-3 text-sm text-muted">
        Avisa al jugador que entra o sube en el top 3 online y a quien baja de puesto o sale del podio.
        Cada persona recibe como máximo un aviso de ranking cada 24 horas.
      </p>
      <p className="mt-2 text-sm text-muted">
        Los correos llevan al ranking, respetan la baja individual y se reintentan automáticamente si el proveedor falla.
      </p>

      {state && (
        <p className="mt-4 text-sm text-muted">
          {state.sent} enviados · {state.pending} pendientes · {state.failed} fallidos · {state.skipped} omitidos
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-negative">{error}</p>}
    </section>
  )
}
