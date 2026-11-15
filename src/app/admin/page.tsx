import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Tablero, { RANGOS } from './Tablero'
import type { PaginaPersonas, Stats } from './lib'

// Página privada del admin: nunca la indexa Google.
export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

export default async function AdminPage({
  searchParams: query,
}: {
  searchParams: Promise<{ dias?: string }>
}) {
  const searchParams = await query
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pedido = Number(searchParams?.dias)
  const dias = RANGOS.includes(pedido) ? pedido : 30

  // Las dos funciones se defienden solas: si no sos admin, tiran error y te vas
  // al lobby. Los números y la primera página de personas se piden a la vez; el
  // resto de la lista la pide el buscador cuando hace falta.
  const [stats, personas] = await Promise.all([
    supabase.rpc('admin_stats', { p_days: dias, p_personas: false }),
    supabase.rpc('admin_people'),
  ])
  if (stats.error || !stats.data) redirect('/lobby')

  return (
    <Tablero
      stats={stats.data as Stats}
      dias={dias}
      personas={personas.error ? undefined : (personas.data as PaginaPersonas)}
    />
  )
}
