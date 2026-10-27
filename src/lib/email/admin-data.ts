import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminCampaign } from '@/app/admin/emails/EmailCampaigns'
import type { NewsCampaignState } from '@/app/admin/emails/NewsCampaign'
import type { RankingCampaignState } from '@/app/admin/emails/RankingCampaign'

// Sólo servidor: el llamador verifica is_admin antes de pasar este cliente.
export async function loadEmailAdmin(admin: SupabaseClient) {
  const { data, error } = await admin
    .from('reengagement_campaigns')
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .order('delay_days', { ascending: true })
  if (error) throw new Error('No pudimos cargar los correos.')

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

  const [newsConfig, latestNews, rankingConfig, rankingCounts] = await Promise.all([
    admin.from('news_email_campaign').select('is_active').eq('id', true).maybeSingle(),
    admin.from('news').select('id, title, body, email_completed_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('ranking_email_campaign').select('is_active').eq('id', true).maybeSingle(),
    Promise.all(['pending', 'sending', 'sent', 'failed', 'skipped'].map(status => admin
      .from('ranking_email_jobs').select('id', { count: 'exact', head: true }).eq('status', status))),
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

  const rankingState: RankingCampaignState | null = rankingConfig.data && !rankingConfig.error
    ? {
        active: rankingConfig.data.is_active,
        pending: (rankingCounts[0].count ?? 0) + (rankingCounts[1].count ?? 0),
        sent: (rankingCounts[2].count ?? 0),
        failed: (rankingCounts[3].count ?? 0),
        skipped: (rankingCounts[4].count ?? 0),
      }
    : null

  return { campaigns, newsState, rankingState }
}
