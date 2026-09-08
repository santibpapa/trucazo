import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import NewsCampaign, { type NewsCampaignState } from './NewsCampaign'
import EmailCampaigns, { type AdminCampaign } from './EmailCampaigns'

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

  const { data, error } = await admin
    .from('reengagement_campaigns')
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .order('delay_days', { ascending: true })
  if (error) redirect('/admin')

  const campaigns = await Promise.all((data ?? []).map(async campaign => {
    const [sentResult, failedResult, skippedResult] = await Promise.all([
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
      admin
        .from('email_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'skipped'),
    ])
    return {
      ...campaign,
      sent: sentResult.count ?? 0,
      failed: failedResult.count ?? 0,
      skipped: skippedResult.count ?? 0,
    }
  })) as AdminCampaign[]

  const [newsConfig, latestNews] = await Promise.all([
    admin.from('news_email_campaign').select('is_active').eq('id', true).maybeSingle(),
    admin.from('news').select('id, title, body, email_completed_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  let newsState: NewsCampaignState | null = null
  if (newsConfig.data && !newsConfig.error) {
    newsState = { active: newsConfig.data.is_active, latest: null }
    if (latestNews.data) {
      const item = latestNews.data
      const [counts, job] = await Promise.all([
        Promise.all(['sent', 'failed', 'skipped'].map(status => admin.from('email_deliveries')
          .select('id', { count: 'exact', head: true }).eq('news_id', item.id).eq('status', status))),
        admin.from('news_email_jobs').select('news_id, last_error').eq('news_id', item.id).maybeSingle(),
      ])
      newsState.latest = { title: item.title, body: item.body, completed: Boolean(item.email_completed_at),
        sent: counts[0].count ?? 0, failed: counts[1].count ?? 0, skipped: counts[2].count ?? 0,
        queued: Boolean(job.data), error: job.data?.last_error ?? null }
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-1 inline-block text-sm font-medium text-muted transition-colors hover:text-gold">
            ← Volver a estadísticas
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-cream sm:text-3xl">
            Campañas de email
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Novedades al publicar y recordatorios para volver a jugar.
            Todas salen desde {sender}.
          </p>
        </div>
      </header>

      <NewsCampaign state={newsState} />
      <EmailCampaigns initialCampaigns={campaigns} />
    </main>
  )
}
