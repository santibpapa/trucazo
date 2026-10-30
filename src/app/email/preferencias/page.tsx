import Link from 'next/link'
import PreferencesScreen from './PreferencesScreen'
import { Panel, Logo } from '@/components/ui'
import { createEmailAdminClient } from '@/lib/email/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Preferencias de email | Trucazo', robots: { index: false } }

type Props = { searchParams: Promise<{ token?: string; guardado?: string }> }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function EmailPreferencesPage({ searchParams: query }: Props) {
  const searchParams = await query
  const token = searchParams.token ?? ''
  const supabase = createEmailAdminClient()
  const result = supabase && UUID_PATTERN.test(token)
    ? await supabase
        .from('email_preferences')
        .select('news_enabled, reengagement_enabled, ranking_enabled, tournaments_enabled')
        .eq('unsubscribe_token', token)
        .maybeSingle()
    : { data: null }
  const fallback = result.data || !supabase || !UUID_PATTERN.test(token)
    ? null : await supabase.from('email_preferences')
      .select('news_enabled, reengagement_enabled, ranking_enabled')
      .eq('unsubscribe_token', token).maybeSingle()
  const data = result.data ?? (fallback?.data ? { ...fallback.data, tournaments_enabled: false } : null)

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Panel className="w-full max-w-md p-8 text-center">
          <Logo size="md" />
          <h1 className="mt-5 font-display text-2xl font-bold text-cream">El enlace no es válido</h1>
          <p className="mt-2 text-sm text-muted">Puede haber vencido o estar incompleto.</p>
          <Link href="/" className="mt-5 inline-block font-semibold text-gold hover:underline">Volver a Trucazo</Link>
        </Panel>
      </main>
    )
  }

  return <PreferencesScreen data={data} token={token} initiallySaved={searchParams.guardado === '1'} />
}
