'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Alert, Avatar, cn } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { useCommunity } from '@/lib/useCommunity'

type Community = ReturnType<typeof useCommunity>

// Panel de amigos: invitaciones a jugar, agregar por nombre, solicitudes y la
// lista con estado (conectado / jugando). Lo usan la pestaña Amigos de
// Comunidad y el panel rápido flotante del lobby (compact).
export default function FriendsPanel({ c, compact = false }: { c: Community; compact?: boolean }) {
  const [name, setName] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const d = c.data

  // Fotos y marcos de los amigos (profiles es de lectura pública).
  const [avatars, setAvatars] = useState<Record<string, string | null>>({})
  const [frames, setFrames] = useState<Record<string, string | null>>({})
  useEffect(() => {
    const ids = Array.from(new Set((d?.friends ?? []).map(f => f.user_id))).filter(id => !(id in avatars))
    if (ids.length === 0) return
    createClient().from('profiles').select('id, avatar_url, active_frame').in('id', ids).then(({ data }) => {
      if (!data) return
      setAvatars(prev => {
        const next = { ...prev }
        for (const p of data as { id: string; avatar_url: string | null }[]) next[p.id] = p.avatar_url
        return next
      })
      setFrames(prev => {
        const next = { ...prev }
        for (const p of data as { id: string; active_frame: string | null }[]) next[p.id] = p.active_frame
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.friends])

  async function add() {
    if (await c.sendRequest(name)) setName('')
  }

  return (
    <div className="flex flex-col gap-4">
      {c.error && <Alert>{c.error}</Alert>}
      {c.notice && (
        <p className="text-xs font-semibold text-gold text-center rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 animate-fade-in">
          {c.notice}
        </p>
      )}

      {/* Invitaciones a jugar que me llegaron */}
      {d?.invites_in.map(inv => (
        <div
          key={inv.invite_id}
          className="rounded-2xl border border-gold bg-gold/10 shadow-gold-ring p-3 flex items-center justify-between gap-2 animate-fade-up"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cream truncate">
              {inv.from_username} te invita a jugar
            </p>
            <p className="text-xs text-subtle">apuesta {inv.bet} · a {inv.target_score}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" onClick={() => c.respondInvite(inv.invite_id, true)} disabled={c.busy}>
              Jugar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => c.respondInvite(inv.invite_id, false)} disabled={c.busy}>
              No
            </Button>
          </div>
        </div>
      ))}

      {/* Mi invitación en curso */}
      {d?.invite_out && (
        <div className="rounded-2xl border border-gold/40 bg-surface2 p-3 flex items-center justify-between gap-2">
          <p className="text-sm text-muted min-w-0 truncate">
            Esperando a <span className="text-cream font-semibold">{d.invite_out.to_username}</span>…
          </p>
          <Button size="sm" variant="ghost" onClick={c.cancelInvite} disabled={c.busy} className="shrink-0">
            Cancelar
          </Button>
        </div>
      )}

      {/* Agregar amigo por nombre de usuario */}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          {/* name/autocomplete elegidos para que el celular NO ofrezca contraseñas
              guardadas acá (no es un formulario de login). */}
          <Input
            placeholder="Nombre de usuario"
            name="buscar-amigo"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            className={compact ? '!py-2.5 text-sm' : ''}
          />
        </div>
        <Button onClick={add} disabled={c.busy || !name.trim()} className="shrink-0">
          Agregar
        </Button>
      </div>

      {/* Solicitudes recibidas */}
      {d && d.incoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Solicitudes</h3>
          {d.incoming.map(r => (
            <div
              key={r.friendship_id}
              className="flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 animate-fade-up"
            >
              <p className="text-sm font-semibold text-cream truncate">{r.username}</p>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" onClick={() => c.respondRequest(r.friendship_id, true)} disabled={c.busy}>
                  Aceptar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => c.respondRequest(r.friendship_id, false)} disabled={c.busy}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de amigos */}
      <div className="flex flex-col gap-2">
        {!compact && (
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Mis amigos</h3>
        )}
        {!d ? (
          <p className="text-sm text-subtle">Cargando…</p>
        ) : d.friends.length === 0 ? (
          <p className="text-sm text-subtle rounded-xl border border-dashed border-line px-3 py-4 text-center">
            Todavía no tenés amigos agregados.
            <br />Buscalos por su nombre de usuario.
          </p>
        ) : (
          d.friends.map(f => (
            <div
              key={f.friendship_id}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-surface2 px-3 py-2"
            >
              <div className="relative shrink-0">
                <Avatar url={avatars[f.user_id]} name={f.username} size={34} frame={frames[f.user_id]} />
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface2',
                    f.playing ? 'bg-info' : f.online ? 'bg-positive' : 'bg-line',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cream truncate">{f.username}</p>
                <p className="text-[11px] text-subtle">
                  {f.playing ? 'Jugando una partida' : f.online ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => c.invite(f.user_id)}
                disabled={c.busy || !!d.invite_out}
              >
                Invitar
              </Button>
              {confirmId === f.friendship_id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-negative shrink-0"
                  onClick={() => { c.removeFriend(f.friendship_id); setConfirmId(null) }}
                >
                  ¿Quitar?
                </Button>
              ) : (
                <button
                  onClick={() => setConfirmId(f.friendship_id)}
                  aria-label={`Quitar a ${f.username}`}
                  className="text-subtle hover:text-negative transition-colors p-1 shrink-0"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Solicitudes que mandé (pendientes) */}
      {d && d.outgoing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-subtle">Enviadas</h3>
          {d.outgoing.map(r => (
            <div key={r.friendship_id} className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm text-muted truncate">
                {r.username} <span className="text-xs text-subtle">· pendiente</span>
              </p>
              <button
                onClick={() => c.removeFriend(r.friendship_id)}
                className="text-xs text-subtle hover:text-negative transition-colors shrink-0"
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
