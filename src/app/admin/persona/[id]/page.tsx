import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import FichaPersona from './Ficha'
import type { Ficha } from '../../lib'

// Página privada del admin: nunca la indexa Google.
export const metadata: Metadata = {
  title: 'Ficha',
  robots: { index: false, follow: false },
}

/** Un identificador con la forma correcta. Sin esto, una dirección inventada
 *  hace fallar la consulta con un error feo en vez de mostrar "no existe". */
const ES_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PersonaPage({ params }: { params: { id: string } }) {
  if (!ES_ID.test(params.id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // La función se defiende sola: si no sos admin, tira error y te vas al lobby.
  const { data, error } = await supabase.rpc('admin_player', { p_id: params.id })

  // "Esa persona no existe" es un 404 de verdad; cualquier otro error (no sos
  // admin, la sesión venció) te devuelve al lobby, igual que el panel.
  if (error?.message?.includes('no existe')) notFound()
  if (error || !data) redirect('/lobby')

  return <FichaPersona datos={data as Ficha} />
}
