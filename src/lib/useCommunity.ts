'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CommunityData } from '@/lib/types'

// Estado compartido de la comunidad (amigos, solicitudes, invitaciones a jugar).
// Lo usan la página Comunidad y el panel rápido del lobby. Se encarga de:
// - latido de presencia ("estoy conectado") cada 30s
// - refresco periódico de get_community (+ realtime cuando me llega una invitación)
// - mientras espero que respondan mi invitación: si la mesa arranca, entro a la
//   partida; si desapareció, avisar que no la aceptaron.
export function useCommunity(myId: string, initial: CommunityData | null = null) {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<CommunityData | null>(initial)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Mesa de mi invitación en curso (para detectar cómo se resolvió).
  const waitingRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const { data: d, error: e } = await supabase.rpc('get_community')
    if (!e && d) setData(d as CommunityData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Latido de presencia + refresco periódico.
  useEffect(() => {
    supabase.rpc('touch_online')
    if (!initial) refresh()
    const hb = setInterval(() => { supabase.rpc('touch_online') }, 30000)
    const poll = setInterval(refresh, 15000)
    return () => { clearInterval(hb); clearInterval(poll) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Invitación nueva para mí (a jugar o a un grupo) → refrescar al toque.
  useEffect(() => {
    const channel = supabase
      .channel(`invites-${myId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_id=eq.${myId}` },
        () => { refresh() },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_invites', filter: `to_id=eq.${myId}` },
        () => { refresh() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId])

  // Los avisos se autodescartan.
  useEffect(() => {
    if (!notice && !error) return
    const t = setTimeout(() => { setNotice(''); setError('') }, 4000)
    return () => clearTimeout(t)
  }, [notice, error])

  // Seguimiento de mi invitación: la mesa arranca → entro; la mesa ya no está →
  // no la aceptaron. Si la invitación desapareció del estado (refresco), se hace
  // un chequeo final para saber cómo terminó.
  useEffect(() => {
    const out = data?.invite_out ?? null
    if (!out) {
      const tid = waitingRef.current
      if (!tid) return
      waitingRef.current = null
      ;(async () => {
        const { data: t } = await supabase.from('tables').select('id,status').eq('id', tid).maybeSingle()
        if (t?.status === 'playing') { router.push(`/game/${tid}`); router.refresh() }
        else setNotice('No aceptaron tu invitación.')
      })()
      return
    }
    waitingRef.current = out.table_id
    const iv = setInterval(async () => {
      const { data: t } = await supabase.from('tables').select('id,status').eq('id', out.table_id).maybeSingle()
      if (t?.status === 'playing') {
        waitingRef.current = null
        router.push(`/game/${out.table_id}`)
        router.refresh()
      } else if (!t && waitingRef.current === out.table_id) {
        waitingRef.current = null
        setNotice(`${out.to_username} no aceptó la invitación.`)
        refresh()
      }
    }, 2500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.invite_out?.table_id])

  async function sendRequest(username: string): Promise<boolean> {
    const name = username.trim()
    if (!name) return false
    setBusy(true); setError(''); setNotice('')
    const { data: res, error: e } = await supabase.rpc('send_friend_request', { p_username: name })
    setBusy(false)
    if (e) { setError(e.message); return false }
    const status = (res as { status?: string })?.status
    setNotice(status === 'accepted' ? '¡Ya son amigos!' : 'Solicitud enviada.')
    refresh()
    return true
  }

  async function respondRequest(friendshipId: string, accept: boolean) {
    setBusy(true)
    const { error: e } = await supabase.rpc('respond_friend_request', {
      p_friendship_id: friendshipId, p_accept: accept,
    })
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  async function removeFriend(friendshipId: string) {
    setBusy(true)
    const { error: e } = await supabase.rpc('remove_friend', { p_friendship_id: friendshipId })
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  async function invite(friendId: string) {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('invite_friend', { p_friend_id: friendId })
    setBusy(false)
    if (e) setError(e.message)
    else setNotice('Invitación enviada. Esperando respuesta…')
    refresh()
  }

  async function cancelInvite() {
    const id = data?.invite_out?.invite_id
    if (!id) return
    waitingRef.current = null // la cancelo yo: sin cartel de "no aceptó"
    setBusy(true)
    await supabase.rpc('cancel_game_invite', { p_invite_id: id })
    setBusy(false)
    refresh()
  }

  async function respondInvite(inviteId: string, accept: boolean) {
    setBusy(true); setError('')
    const { data: tableId, error: e } = await supabase.rpc('respond_game_invite', {
      p_invite_id: inviteId, p_accept: accept,
    })
    setBusy(false)
    if (e) { setError(e.message); refresh(); return }
    if (accept && tableId) {
      router.push(`/game/${tableId}`)
      router.refresh()
    } else {
      refresh()
    }
  }

  // --- Grupos ---
  async function createGroup(name: string, description: string): Promise<boolean> {
    if (!name.trim()) return false
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('create_group', {
      p_name: name.trim(), p_description: description.trim(),
    })
    setBusy(false)
    if (e) { setError(e.message); return false }
    await refresh()
    return true
  }

  async function inviteToGroup(friendId: string) {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('invite_to_group', { p_friend_id: friendId })
    setBusy(false)
    if (e) setError(e.message)
    else setNotice('Invitación al grupo enviada.')
    refresh()
  }

  async function respondGroupInvite(inviteId: string, accept: boolean) {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('respond_group_invite', {
      p_invite_id: inviteId, p_accept: accept,
    })
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  async function leaveGroup() {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('leave_group')
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  async function kickMember(userId: string) {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('kick_group_member', { p_user_id: userId })
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  async function deleteGroup() {
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('delete_group')
    setBusy(false)
    if (e) setError(e.message)
    refresh()
  }

  return {
    data, notice, error, busy,
    refresh, sendRequest, respondRequest, removeFriend,
    invite, cancelInvite, respondInvite,
    createGroup, inviteToGroup, respondGroupInvite, leaveGroup, kickMember, deleteGroup,
  }
}
