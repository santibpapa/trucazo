import Link from 'next/link'
import NewsCampaign from './NewsCampaign'
import RankingCampaign from './RankingCampaign'
import EmailCampaigns from './EmailCampaigns'
import type { loadEmailAdmin } from '@/lib/email/admin-data'

export default function EmailAdminScreen({ sender, campaigns, newsState, rankingState, request }: Awaited<ReturnType<typeof loadEmailAdmin>> & { sender: string; request?: typeof fetch }) {

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
            Novedades, movimientos del ranking y recordatorios para volver a jugar.
            Todas salen desde {sender}.
          </p>
        </div>
      </header>

      <NewsCampaign state={newsState} request={request} />
      <RankingCampaign state={rankingState} request={request} />
      <EmailCampaigns initialCampaigns={campaigns} request={request} />
    </main>
  )
}
