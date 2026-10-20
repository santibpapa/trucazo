'use client'

import Link from 'next/link'
import { Button, Panel } from '@/components/ui'

export default function TournamentsError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <Panel className="w-full max-w-md p-6 text-center">
        <h1 className="font-display text-xl font-extrabold text-cream">No pudimos cargar los torneos</h1>
        <p className="mt-2 text-sm text-muted">Puede ser un corte momentáneo. Reintentá sin perder tu sesión.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/lobby" className="rounded-xl border border-line px-4 py-2.5 font-semibold text-cream hover:border-gold">
            Ir al lobby
          </Link>
          <Button onClick={reset}>Reintentar</Button>
        </div>
      </Panel>
    </main>
  )
}
