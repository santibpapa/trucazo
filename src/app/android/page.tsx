import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Trucazo para Android',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AndroidEntry() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) redirect('/login?android=1')

  // La app abre el mismo lobby que la web. El indicador conserva la política
  // de cuenta registrada por pestaña al atravesar la redirección de servidor.
  redirect('/lobby?android=1')
}
