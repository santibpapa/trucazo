'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Alert, Panel } from '@/components/ui'
import TournamentCard from '@/components/tournaments/TournamentCard'
import { createClient } from '@/lib/supabase/client'
import { tournamentApi, type Tournament, type TournamentListData } from '@/lib/tournaments'

export default function TournamentsHub({
  initialData,
  isGuest,
}: {
  initialData: TournamentListData
  isGuest: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [data, setData] = useState(initialData)
  const [refreshError, setRefreshError] = useState('')

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await api.list()
    if (result.error || !result.data) {
      setRefreshError('No pudimos actualizar la lista. Vamos a volver a intentar.')
      return
    }
    setData(result.data as TournamentListData)
    setRefreshError('')
  }, [api])

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 15_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const hasAny = data.upcoming.length + data.active.length + data.past.length > 0

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-7">
        <Link href="/lobby" className="text-sm font-semibold text-muted hover:text-gold">
          ← Volver al lobby
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="text-4xl">🏆</span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-cream">Torneos</h1>
            <p className="text-sm text-muted">Anotate, confirmá tu presencia y seguí cada competencia.</p>
          </div>
        </div>
      </header>

      {isGuest && (
        <Panel className="mb-6 border-gold/40 bg-gold/5 p-4">
          <p className="font-bold text-cream">Podés mirar todos los torneos</p>
          <p className="mt-1 text-sm text-muted">
            Para inscribirte necesitás una cuenta real. Tu progreso de invitado no se pierde al registrarte.
          </p>
          <Link href="/register" className="mt-3 inline-block font-bold text-gold hover:underline">
            Crear mi cuenta →
          </Link>
        </Panel>
      )}

      {refreshError && <Alert className="mb-5">{refreshError}</Alert>}

      {!hasAny ? (
        <Panel className="p-8 text-center">
          <p className="text-4xl" aria-hidden="true">🗓️</p>
          <h2 className="mt-3 font-display text-xl font-extrabold text-cream">Todavía no hay torneos publicados</h2>
          <p className="mt-1 text-sm text-muted">Cuando aparezca el próximo, lo vas a encontrar acá.</p>
        </Panel>
      ) : (
        <div className="space-y-9">
          <TournamentSection
            title="En juego"
            description="Competencias que ya llegaron a su hora de inicio."
            tournaments={data.active}
          />
          <TournamentSection
            title="Próximos"
            description="Elegí uno para ver el cupo, las reglas y anotarte."
            tournaments={data.upcoming}
          />
          <TournamentSection
            title="Anteriores"
            description="Resultados y torneos cancelados."
            tournaments={data.past}
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {refreshError || 'La lista de torneos está actualizada.'}
      </p>
    </main>
  )
}

function TournamentSection({
  title,
  description,
  tournaments,
}: {
  title: string
  description: string
  tournaments: Tournament[]
}) {
  if (tournaments.length === 0) return null
  return (
    <section aria-labelledby={`torneos-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h2
        id={`torneos-${title.toLowerCase().replaceAll(' ', '-')}`}
        className="font-display text-xl font-extrabold text-cream"
      >
        {title}
      </h2>
      <p className="mb-3 text-sm text-muted">{description}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map(tournament => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </section>
  )
}
