'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import { invitationPath } from '@/lib/table-invites'
import { appOrigin } from '@/lib/app-request'

export default function ShareTableInvite({ tableId, mode }: { tableId: string; mode: '1v1' | '2v2' }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(false)

  async function prepareLink() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await createClient().rpc('get_table_invite', { p_table_id: tableId, p_mode: mode })
        .abortSignal(AbortSignal.timeout(8000))
      const path = invitationPath(data)
      if (error || !path) throw new Error('No pudimos preparar el enlace. Revisá que la mesa siga abierta y reintentá.')
      setLink(`${appOrigin()}${path}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos preparar el enlace. Reintentá.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setMessage('Enlace copiado') }
    catch { setMessage('Mantené pulsado el enlace o seleccionalo para copiarlo.') }
  }

  async function share() {
    // Se llama desde un toque nuevo: los navegadores requieren ese gesto para compartir.
    if (!navigator.share) { await copy(); return }
    try { await navigator.share({ title: 'Jugamos un truco', text: '¡Sumate a mi mesa en Trucazo!', url: link }) }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage('No se pudo compartir. Podés copiar el enlace.') }
  }

  return <div className="flex flex-col gap-2">
    {!link ? <Button variant="secondary" fullWidth disabled={busy} onClick={() => { void prepareLink() }}>
      {busy ? 'Preparando enlace…' : 'Invitar por enlace'}
    </Button> : <>
      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={() => { void share() }}>Compartir</Button>
        <Button variant="ghost" fullWidth onClick={() => { void copy() }}>Copiar enlace</Button>
      </div>
      <input aria-label="Enlace de invitación" readOnly value={link} onFocus={event => event.target.select()}
        className="w-full rounded-lg border border-line bg-base p-2 text-xs text-muted" />
    </>}
    {message && <p role="status" className="text-sm text-muted text-center">{message}</p>}
  </div>
}
