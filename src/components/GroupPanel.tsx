'use client'

import { useState } from 'react'
import { Button, Input, Alert, cn } from '@/components/ui'
import type { useCommunity } from '@/lib/useCommunity'

type Community = ReturnType<typeof useCommunity>

// Panel de grupo: si no estás en uno, lo creás o aceptás una invitación; si ya
// estás, ves los miembros e invitás amigos. El líder puede expulsar y disolver.
export default function GroupPanel({ c, myId }: { c: Community; myId: string }) {
  const d = c.data
  const group = d?.group ?? null

  return (
    <div className="flex flex-col gap-4">
      {c.error && <Alert>{c.error}</Alert>}
      {c.notice && (
        <p className="text-xs font-semibold text-gold text-center rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 animate-fade-in">
          {c.notice}
        </p>
      )}

      {group ? <GroupView c={c} myId={myId} /> : <NoGroupView c={c} />}
    </div>
  )
}

// --- Sin grupo: crear uno o aceptar invitaciones ---
function NoGroupView({ c }: { c: Community }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const invites = c.data?.group_invites_in ?? []

  async function create() {
    if (await c.createGroup(name, desc)) { setName(''); setDesc('') }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Invitaciones a grupos */}
      {invites.map(inv => (
        <div
          key={inv.invite_id}
          className="rounded-2xl border border-gold bg-gold/10 shadow-gold-ring p-3 flex items-center justify-between gap-2 animate-fade-up"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cream truncate">{inv.group_name}</p>
            <p className="text-xs text-subtle truncate">te invitó {inv.from_username}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" onClick={() => c.respondGroupInvite(inv.invite_id, true)} disabled={c.busy}>
              Unirme
            </Button>
            <Button size="sm" variant="ghost" onClick={() => c.respondGroupInvite(inv.invite_id, false)} disabled={c.busy}>
              No
            </Button>
          </div>
        </div>
      ))}

      {/* Crear grupo */}
      <div className="rounded-2xl border border-line bg-surface2 p-4 flex flex-col gap-3">
        <div className="flex flex-col items-center gap-1 text-center pb-1">
          <span className="w-11 h-11 rounded-full bg-base border border-line flex items-center justify-center text-gold">
            <ShieldIcon />
          </span>
          <h3 className="font-display font-bold text-cream mt-1">Armá tu grupo</h3>
          <p className="text-xs text-subtle max-w-xs">
            Juntá a tus amigos. Más adelante van a poder competir juntos 2x2 y 3x3.
          </p>
        </div>
        <Input
          placeholder="Nombre del grupo"
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
        />
        <Input
          placeholder="Descripción (opcional)"
          value={desc}
          maxLength={200}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') create() }}
        />
        <Button onClick={create} disabled={c.busy || !name.trim()} fullWidth>
          Crear grupo
        </Button>
      </div>
    </div>
  )
}

// --- Con grupo: miembros + invitar amigos + acciones ---
function GroupView({ c, myId }: { c: Community; myId: string }) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const d = c.data!
  const group = d.group!
  const memberIds = new Set(group.members.map(m => m.user_id))
  // Amigos que puedo invitar (no están ya en el grupo).
  const invitables = d.friends.filter(f => !memberIds.has(f.user_id))

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado del grupo */}
      <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-gold"><ShieldIcon /></span>
          <h3 className="font-display text-lg font-extrabold text-cream truncate">{group.name}</h3>
        </div>
        {group.description && <p className="text-sm text-muted">{group.description}</p>}
        <p className="text-[11px] text-subtle mt-0.5">{group.members.length}/20 integrantes</p>
      </div>

      {/* Miembros */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted">Integrantes</h4>
        {group.members.map(m => (
          <div key={m.user_id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3 py-2">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', m.playing ? 'bg-info' : m.online ? 'bg-positive' : 'bg-line')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cream truncate flex items-center gap-1.5">
                {m.user_id === myId ? 'Vos' : m.username}
                {m.is_leader && <span title="Líder" className="text-gold"><CrownIcon /></span>}
              </p>
              <p className="text-[11px] text-subtle">
                {m.playing ? 'Jugando' : m.online ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
            {group.is_leader && m.user_id !== myId && (
              <button
                onClick={() => c.kickMember(m.user_id)}
                aria-label={`Expulsar a ${m.username}`}
                className="text-subtle hover:text-negative transition-colors p-1 shrink-0"
                title="Expulsar"
              >
                <RemoveIcon />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invitar amigos */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted">Invitar amigos</h4>
        {invitables.length === 0 ? (
          <p className="text-sm text-subtle rounded-xl border border-dashed border-line px-3 py-3 text-center">
            {d.friends.length === 0 ? 'Agregá amigos para poder invitarlos.' : 'Todos tus amigos ya están en el grupo.'}
          </p>
        ) : (
          invitables.map(f => (
            <div key={f.user_id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3 py-2">
              <p className="text-sm font-semibold text-cream truncate">{f.username}</p>
              <Button size="sm" variant="secondary" onClick={() => c.inviteToGroup(f.user_id)} disabled={c.busy}>
                Invitar
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Salir / eliminar */}
      <div className="pt-1">
        {confirmLeave ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" fullWidth onClick={() => { if (group.is_leader) c.deleteGroup(); else c.leaveGroup(); setConfirmLeave(false) }} disabled={c.busy}>
              {group.is_leader && group.members.length > 1 ? 'Salir (pasa el mando)' : group.is_leader ? 'Eliminar grupo' : 'Confirmar salida'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(false)}>Cancelar</Button>
          </div>
        ) : (
          <button onClick={() => setConfirmLeave(true)} className="text-xs text-subtle hover:text-negative transition-colors">
            {group.is_leader ? 'Eliminar grupo' : 'Salir del grupo'}
          </button>
        )}
      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7z" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
