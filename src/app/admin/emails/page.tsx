import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import EmailAdminScreen from './EmailAdminScreen'
import { loadEmailAdmin } from '@/lib/email/admin-data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Campañas de email',
  robots: { index: false, follow: false },
}

export default async function AdminEmailsPage() {
  const sender = process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>'
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) redirect('/login')

  const admin = createEmailAdminClient()
  if (!admin) redirect('/admin')

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) redirect('/lobby')

  let data
  try { data = await loadEmailAdmin(admin) }
  catch { redirect('/admin') }
  return <EmailAdminScreen sender={sender} {...data} />
}
