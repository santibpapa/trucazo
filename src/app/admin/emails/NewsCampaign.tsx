'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export type NewsCampaignState = {
  active: boolean
  latest: { title: string; body: string; completed: boolean; sent: number; failed: number; skipped: number; queued: boolean; error: string | null } | null
}

export default function NewsCampaign({ state }: { state: NewsCampaignState | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function toggle() {
    if (!state) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/news-campaign', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !state.active }),
      })
      if (!response.ok) throw new Error('No se pudo cambiar el estado.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.')
    } finally { setBusy(false) }
  }
  return (
    <section className="mb-5 rounded-2xl border border-gold/40 bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-cream">Novedades</h2>
          <p className="text-sm text-muted">{state ? state.active ? 'Activa · al publicar' : 'Pausada' : 'Pendiente de configuración'}</p>
        </div>
        {state && <Button variant="secondary" size="sm" disabled={busy} onClick={() => void toggle()}>
          {busy ? 'Guardando…' : state.active ? 'Pausar' : 'Activar'}
        </Button>}
      </div>
      <p className="mt-3 text-sm text-muted">Cada novedad nueva inicia su envío al publicarse. El asunto y el contenido son los de la publicación, para quienes ya estaban registrados y tienen los emails de novedades habilitados.</p>
      <p className="mt-2 text-sm text-muted">El envío avanza por tandas y respeta las bajas. Los límites del proveedor pueden demorar su finalización.</p>
      {error && <p role="alert" className="mt-3 text-sm text-negative">{error}</p>}
      {state?.latest && <details className="mt-4 rounded-xl border border-line bg-surface2 p-4">
        <summary className="cursor-pointer font-semibold text-cream">Última novedad: {state.latest.title}</summary>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-cream">{state.latest.body}</p>
        <p className="mt-3 text-sm text-muted">{state.latest.sent} enviados · {state.latest.failed} fallidos · {state.latest.skipped} omitidos</p>
        <p className="mt-1 text-sm text-muted">{state.latest.completed ? 'Envío completado' : state.latest.queued ? 'Pendiente de completar' : 'Sin envío automático pendiente'}</p>
        {state.latest.error && <p role="status" className="mt-2 text-sm text-muted">{state.latest.error}</p>}
      </details>}
      <Link href="/comunidad" className="mt-4 inline-block text-sm font-semibold text-gold hover:underline">Ir a publicar una novedad →</Link>
    </section>
  )
}
