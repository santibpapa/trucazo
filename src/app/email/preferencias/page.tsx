import Link from 'next/link'
import { Panel, Logo } from '@/components/ui'
import { createEmailAdminClient } from '@/lib/email/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Preferencias de email | Trucazo', robots: { index: false } }

type Props = { searchParams: { token?: string; guardado?: string } }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function EmailPreferencesPage({ searchParams }: Props) {
  const token = searchParams.token ?? ''
  const supabase = createEmailAdminClient()
  const { data } = supabase && UUID_PATTERN.test(token)
    ? await supabase
        .from('email_preferences')
        .select('news_enabled, reengagement_enabled')
        .eq('unsubscribe_token', token)
        .maybeSingle()
    : { data: null }

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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Panel className="w-full max-w-md p-8">
        <div className="text-center"><Logo size="md" /></div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold text-cream">Emails que querés recibir</h1>
        <p className="mt-2 text-center text-sm text-muted">Podés cambiarlo cuando quieras desde cualquier correo.</p>

        {searchParams.guardado === '1' && (
          <p className="mt-5 rounded-xl border border-positive/40 bg-positive/10 p-3 text-center text-sm text-cream">Listo, guardamos tus preferencias.</p>
        )}

        <form action="/api/email/preferences" method="post" className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <Preference
            name="news"
            defaultChecked={data.news_enabled}
            title="Novedades de Trucazo"
            description="Nuevos modos, rivales, mejoras y anuncios importantes."
          />
          <Preference
            name="reengagement"
            defaultChecked={data.reengagement_enabled}
            title="Invitaciones para volver"
            description="Un recordatorio si todavía no jugaste o llevás dos días sin entrar a una partida."
          />
          <button className="mt-2 rounded-xl bg-gold px-5 py-3 font-bold text-base hover:bg-gold-600">Guardar preferencias</button>
          <button name="action" value="all-off" className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-muted hover:text-cream">No quiero recibir ningún email</button>
        </form>
      </Panel>
    </main>
  )
}

function Preference({
  name,
  defaultChecked,
  title,
  description,
}: {
  name: string
  defaultChecked: boolean
  title: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line bg-surface2 p-4">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-gold" />
      <span>
        <span className="block font-semibold text-cream">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
      </span>
    </label>
  )
}
