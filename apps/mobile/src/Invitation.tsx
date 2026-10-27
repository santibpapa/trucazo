import { useEffect, useState } from 'react'
import InviteClient from '../../../src/app/invitar/[token]/InviteClient'
import { Button, Panel } from '../../../src/components/ui'
import { teamModeEnabled } from '../../../src/lib/team-game'
import type { TableInvitePreview } from '../../../src/lib/table-invites'
import { cachedSession, createClient } from './services'
import { Link } from './navigation'

export default function Invitation({ token, owner, online }: { token: string; owner: string; online: boolean }) {
  const [invite, setInvite] = useState<TableInvitePreview | null>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('mobile:refresh', refresh)
    return () => window.removeEventListener('mobile:refresh', refresh)
  }, [])
  useEffect(() => {
    let disposed = false
    if (!online) return
    setInvite(undefined)
    setError('')
    void (async () => {
      const { data, error } = await createClient().rpc('preview_table_invite', { p_token: token })
        .abortSignal(AbortSignal.timeout(8000))
      if (error) throw error
      if (!disposed && cachedSession()?.user.id === owner) setInvite(data as TableInvitePreview | null)
    })().catch(() => { if (!disposed) setError('No pudimos cargar la invitación. Revisá tu conexión.') })
    return () => { disposed = true }
  }, [token, owner, online, revision])
  return <main className="min-h-dvh flex items-center justify-center p-5">
    <Panel className="w-full max-w-sm p-6 flex flex-col gap-5">
      {!online ? <p role="status">Necesitás conexión para abrir la invitación.</p>
        : error ? <><p role="alert">{error}</p><Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button></>
          : invite === undefined ? <p role="status">Abriendo invitación…</p>
            : !invite || (invite.mode === '2v2' && !teamModeEnabled) ? <p>Esta invitación ya no está disponible. Pedile un enlace nuevo a quien te invitó.</p>
              : <InviteClient token={token} invite={invite} signedIn />}
      <Link href="/lobby" className="text-center text-sm text-gold">Volver al lobby</Link>
    </Panel>
  </main>
}
