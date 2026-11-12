import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ResenasScreen, { type Resena } from './ResenasScreen'
import type { TipoCuenta } from '../lib'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Reseñas',
  robots: { index: false, follow: false },
}

// Las reseñas viven en `feedback`, que ningún jugador puede leer (RLS). Se leen
// con la llave del servidor después de comprobar que quien entra es admin, como
// en la página de emails. Así no hace falta ninguna función SQL nueva.
const LIMITE = 300

export default async function AdminResenasPage() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  if (!admin) redirect('/admin')

  const { data: perfil } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!perfil?.is_admin) redirect('/lobby')

  const [{ data: filas, error }, { count }] = await Promise.all([
    admin.from('feedback')
      .select('id, user_id, rating_general, rating_aesthetics, understood, had_problem, comment, image_paths, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMITE),
    admin.from('feedback').select('id', { count: 'exact', head: true }),
  ])
  if (error || !filas) redirect('/admin')

  const ids = [...new Set(filas.map(f => f.user_id).filter((id): id is string => !!id))]
  const rutas = filas.flatMap(f => f.image_paths ?? [])

  // Perfil, cuenta (email, tipo, última sesión) y capturas, todo en paralelo.
  const [{ data: perfiles }, cuentas, { data: firmas }] = await Promise.all([
    ids.length
      ? admin.from('profiles').select('id, username, avatar_url, created_at, games_played, coins').in('id', ids)
      : Promise.resolve({ data: [] }),
    Promise.all(ids.map(id => admin.auth.admin.getUserById(id).then(r => r.data.user, () => null))),
    rutas.length
      ? admin.storage.from('feedback-images').createSignedUrls(rutas, 60 * 60)
      : Promise.resolve({ data: [] }),
  ])

  const perfilDe = new Map((perfiles ?? []).map(p => [p.id, p]))
  const cuentaDe = new Map(cuentas.filter(c => !!c).map(c => [c!.id, c!]))
  const firmaDe = new Map((firmas ?? []).map(f => [f.path, f.signedUrl]))
  const cuantasDe = new Map<string, number>()
  for (const f of filas) if (f.user_id) cuantasDe.set(f.user_id, (cuantasDe.get(f.user_id) ?? 0) + 1)

  const resenas: Resena[] = filas.map(f => {
    const p = f.user_id ? perfilDe.get(f.user_id) : undefined
    const c = f.user_id ? cuentaDe.get(f.user_id) : undefined
    const tipo: TipoCuenta | null = !c ? null
      : c.is_anonymous ? 'invitado'
      : c.app_metadata?.provider === 'google' ? 'google' : 'email'
    return {
      id: f.id,
      fecha: f.created_at,
      general: f.rating_general,
      estetica: f.rating_aesthetics,
      entendio: f.understood,
      problema: f.had_problem,
      comentario: f.comment?.trim() || null,
      capturas: (f.image_paths ?? []).map((ruta: string) => firmaDe.get(ruta) ?? null),
      persona: f.user_id && p ? {
        id: f.user_id,
        nombre: p.username,
        avatar_url: p.avatar_url,
        email: c?.email || null,
        tipo,
        creado_at: p.created_at,
        ultima_sesion: c?.last_sign_in_at ?? null,
        partidas: p.games_played,
        monedas: p.coins,
        resenas: cuantasDe.get(f.user_id) ?? 1,
      } : null,
    }
  })

  return <ResenasScreen resenas={resenas} total={count ?? resenas.length} ahora={new Date().toISOString()} />
}
