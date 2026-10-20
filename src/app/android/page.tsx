import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo, Panel, buttonClass } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Trucazo para Android',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AndroidEntry() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) redirect('/login?android=1')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 text-center">
        <Logo size="md" />
        <p className="text-muted">Ya estás adentro con tu cuenta.</p>
        <Link href="/lobby" className={buttonClass('primary', 'lg', true)}>Entrar a jugar</Link>
        {profile?.is_admin && (
          <a href="/android/probe.html" className={buttonClass('secondary', 'md', true)}>
            Pruebas del prototipo
          </a>
        )}
      </Panel>
    </main>
  )
}
