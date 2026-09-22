'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Alert, buttonClass, Panel } from '@/components/ui'
import TournamentCard from '@/components/tournaments/TournamentCard'
import { createClient } from '@/lib/supabase/client'
import { tournamentApi, type Tournament, type TournamentListData } from '@/lib/tournaments'

export default function AdminTournamentsList({ initialData }: { initialData: TournamentListData }) {
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [data, setData] = useState(initialData)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await api.list()
    if (result.error || !result.data) {
      setError('No pudimos actualizar los torneos. Vamos a reintentar.')
      return
    }
    setData(result.data as TournamentListData)
    setError('')
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

  const total = data.drafts.length + data.upcoming.length + data.active.length + data.past.length

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-muted hover:text-gold">← Volver al panel</Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-cream">Administrar torneos</h1>
          <p className="text-sm text-muted">Creá, publicá y seguí inscripciones y check-ins.</p>
        </div>
        <Link href="/admin/torneos/nuevo" className={buttonClass('primary', 'md')}>
          + Crear torneo
        </Link>
      </header>

      {error && <Alert className="mb-5">{error}</Alert>}

      {total === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-4xl" aria-hidden="true">🏆</p>
          <h2 className="mt-3 font-display text-xl font-extrabold text-cream">Todavía no creaste torneos</h2>
          <p className="mt-1 text-sm text-muted">Podés guardarlo como borrador antes de publicarlo.</p>
          <Link href="/admin/torneos/nuevo" className={buttonClass('primary', 'md', false, 'mt-5')}>
            Crear el primero
          </Link>
        </Panel>
      ) : (
        <div className="space-y-9">
          <AdminSection title="Borradores" tournaments={data.drafts} />
          <AdminSection title="Próximos" tournaments={data.upcoming} />
          <AdminSection title="En curso" tournaments={data.active} />
          <AdminSection title="Anteriores" tournaments={data.past} />
        </div>
      )}
    </main>
  )
}

function AdminSection({ title, tournaments }: { title: string; tournaments: Tournament[] }) {
  if (tournaments.length === 0) return null
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="font-display text-xl font-extrabold text-cream">{title}</h2>
        <span className="text-sm font-semibold text-muted">{tournaments.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map(tournament => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            href={`/admin/torneos/${tournament.id}`}
          />
        ))}
      </div>
    </section>
  )
}
