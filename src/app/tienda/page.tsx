import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadShop } from '@/lib/player-data'
import TiendaClient from './TiendaClient'

export default async function TiendaPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  return <TiendaClient {...await loadShop(client, user.id)} />
}
