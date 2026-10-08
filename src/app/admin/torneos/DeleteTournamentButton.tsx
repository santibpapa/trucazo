'use client'

import { useState } from 'react'
import { Alert, Button } from '@/components/ui'
import { type Tournament, type tournamentApi } from '@/lib/tournaments'

export default function DeleteTournamentButton({ tournament, api, onDeleted }: {
  tournament: Tournament
  api: ReturnType<typeof tournamentApi>
  onDeleted: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (tournament.status !== 'completed' && tournament.status !== 'cancelled') return null

  const remove = async () => {
    if (busy || !window.confirm(`¿Eliminar “${tournament.name}”? Dejará de aparecer en las listas de torneos. Se conservan los premios y las estadísticas de los jugadores.`)) return
    setBusy(true)
    setError('')
    try {
      const result = await api.adminDelete(tournament.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      onDeleted(tournament.id)
    } catch {
      setError('No pudimos eliminar el torneo. Volvé a intentarlo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}
        aria-label={`Eliminar torneo ${tournament.name}`}>
        {busy ? 'Eliminando…' : 'Eliminar torneo'}
      </Button>
      {error && <Alert className="mt-2">{error}</Alert>}
    </div>
  )
}
