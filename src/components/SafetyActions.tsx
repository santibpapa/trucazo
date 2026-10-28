'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safetyChanged } from '@/lib/community-safety'
import { Button } from '@/components/ui'
import CommunityDialog from './CommunityDialog'
import { appRequest } from '@/lib/app-request'

export type ContentKind = 'profile' | 'chat' | 'match_chat' | 'group' | 'news' | 'feedback' | 'table' | 'team_table'
export const contentLabels: Record<ContentKind, string> = { profile: 'Perfil', chat: 'Chat global', match_chat: 'Chat de mesa', group: 'Grupo', news: 'Novedad', feedback: 'Reseña', table: 'Nombre de mesa', team_table: 'Nombre de mesa en parejas' }
export const reportReasons = { harassment: 'Acoso o amenazas', hate: 'Discriminación', sexual: 'Contenido sexual', personal_data: 'Datos personales o suplantación', spam: 'Spam', other: 'Otro motivo' }

export default function SafetyActions({ kind = 'profile', target, userId, label = 'Convivencia' }: {
  kind?: ContentKind; target: string; userId?: string; label?: string
}) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState('harassment'), [detail, setDetail] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [changed, setChanged] = useState(false)
  const close = () => { setOpen(false); if (changed) { safetyChanged(); setChanged(false) } }
  async function act(block: boolean) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      let imageWarning = false
      if (block) {
        const result = await createClient().rpc('set_player_block', { p_target: userId, p_blocked: true })
        if (result.error) throw new Error(result.error.message)
      } else {
        const response = await appRequest('/api/community/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, target, reason, detail }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No pudimos guardar la denuncia.')
        imageWarning = result.imageWarning
      }
      setMessage(block ? 'Persona bloqueada. Podés desbloquearla desde Convivencia.' : 'Denuncia recibida. Podés ver su resolución en Convivencia.' + (imageWarning ? ' No pudimos copiar las imágenes; el texto quedó guardado.' : ''))
      setChanged(true)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No pudimos conectar. Reintentá.') }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" onClick={() => { setBlocking(false); setMessage(''); setOpen(true) }}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-surface2 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" />
      </svg>
    </button>
    {open && <CommunityDialog title="Denunciar o bloquear" onClose={close}>
        <h2 className="font-bold text-lg">{blocking ? 'Bloquear persona' : 'Denunciar contenido'}</h2>
        {!blocking ? <>
        <label className="text-sm">Motivo<select autoFocus className="block w-full bg-surface2 rounded-xl border border-line p-3 mt-1" value={reason} onChange={e => setReason(e.target.value)}>{Object.entries(reportReasons).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <label className="text-sm">Detalle (opcional)<textarea className="block w-full bg-surface2 rounded-xl border border-line p-2 mt-1" rows={2} maxLength={1000} value={detail} onChange={e => setDetail(e.target.value)} /></label>
        <p className="text-xs text-muted">La denuncia es privada. No se informa quién denunció a la persona señalada.</p>
        <Button disabled={busy} onClick={() => void act(false)}>Enviar denuncia</Button>
        {userId && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setBlocking(true); setMessage('') }}>Bloquear persona</Button>}
        </> : <><p className="text-sm text-muted">Oculta sus mensajes e impide nuevos contactos y mesas casuales compartidas. La partida actual y los torneos continúan. Perfiles, ranking y grupos actuales siguen visibles.</p><Button disabled={busy} onClick={() => void act(true)}>Confirmar bloqueo</Button></>}
        {message && <p role="status" className="text-sm text-gold">{message}</p>}
        <Button variant="ghost" onClick={close}>Cerrar</Button>
    </CommunityDialog>}
  </>
}
