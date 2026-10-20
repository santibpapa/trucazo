import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Panel, Logo } from '@/components/ui'
import { INVITE_TOKEN, type TableInvitePreview } from '@/lib/table-invites'
import { teamModeEnabled } from '@/lib/team-game'
import InviteClient from './InviteClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Invitación a jugar',
  description: 'Te invitaron a jugar un truco. Mirá la mesa y confirmá para sumarte.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const [{ data: preview, error }, { data: { user } }] = await Promise.all([
    INVITE_TOKEN.test(params.token)
      ? supabase.rpc('preview_table_invite', { p_token: params.token }).abortSignal(AbortSignal.timeout(8000))
      : Promise.resolve({ data: null, error: null }),
    supabase.auth.getUser(),
  ])
  const invite = preview as TableInvitePreview | null
  const enabled = invite?.mode !== '2v2' || teamModeEnabled

  return <main className="min-h-dvh flex items-center justify-center p-5">
    <Panel className="w-full max-w-sm p-6 flex flex-col gap-5">
      <div className="flex justify-center"><Logo size="md" /></div>
      {error ? <>
        <h1 className="font-display text-2xl font-bold text-cream">No pudimos cargar la invitación</h1>
        <p className="text-sm text-muted">Revisá tu conexión y volvé a intentar.</p>
        <a href={`/invitar/${params.token}`} className="text-gold font-semibold">Reintentar</a>
      </> : !invite || !enabled ? <>
        <h1 className="font-display text-2xl font-bold text-cream">Esta invitación ya no está disponible</h1>
        <p className="text-sm text-muted">Pedile un enlace nuevo a quien te invitó.</p>
      </> : <InviteClient token={params.token} invite={invite} signedIn={!!user} />}
      <Link href="/lobby" className="text-center text-sm text-subtle hover:text-cream">Ir al inicio</Link>
    </Panel>
  </main>
}
