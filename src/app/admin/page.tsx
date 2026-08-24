import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Tablero, { RANGOS } from './Tablero'
import type { Stats } from './lib'

// Página privada del admin: nunca la indexa Google.
export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pedido = Number(searchParams?.dias)
  const dias = RANGOS.includes(pedido) ? pedido : 30

  // La función se defiende sola: si no sos admin, tira error y te vas al lobby.
  const { data, error } = await supabase.rpc('admin_stats', { p_days: dias })
  if (error || !data) redirect('/lobby')

  return <Tablero stats={data as Stats} dias={dias} />
}
