'use client'

import Link from 'next/link'
import { Button, Panel } from '@/components/ui'

export default function AdminTournamentsError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <Panel className="w-full max-w-md p-6 text-center">
        <h1 className="font-display text-xl font-extrabold text-cream">No pudimos abrir la administración</h1>
        <p className="mt-2 text-sm text-muted">Reintentá. Ningún cambio quedó a mitad de camino.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/admin" className="rounded-xl border border-line px-4 py-2.5 font-semibold text-cream hover:border-gold">
            Ir al panel
          </Link>
          <Button onClick={reset}>Reintentar</Button>
        </div>
      </Panel>
    </main>
  )
}
