import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import EmailCampaigns, { type AdminCampaign } from './EmailCampaigns'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Emails de re-engagement',
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

  const { data, error } = await admin
    .from('reengagement_campaigns')
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .order('delay_days', { ascending: true })
  if (error) redirect('/admin')

  const campaigns = await Promise.all((data ?? []).map(async campaign => {
    const [sentResult, failedResult] = await Promise.all([
      admin
        .from('email_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'sent'),
      admin
        .from('email_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'failed'),
    ])
    return {
      ...campaign,
      sent: sentResult.count ?? 0,
      failed: failedResult.count ?? 0,
    }
  })) as AdminCampaign[]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-1 inline-block text-sm font-medium text-muted transition-colors hover:text-gold">
            ← Volver a estadísticas
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-cream sm:text-3xl">
            Emails para volver a jugar
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Creá campañas automáticas para quienes todavía no jugaron o dejaron de jugar.
            Todas salen desde {sender}.
          </p>
        </div>
      </header>

      <EmailCampaigns initialCampaigns={campaigns} />
    </main>
  )
}
