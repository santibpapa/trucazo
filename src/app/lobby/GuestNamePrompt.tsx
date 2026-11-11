'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal, Input, Button } from '@/components/ui'
import { ensureCommunityRules } from '@/lib/community-safety'

/**
 * Invitado que se hizo cuenta (sobre todo con Google, que no pregunta el
 * nombre) y sigue llamándose Invitado####. Elige su nombre una vez; no gasta
 * el cambio gratis del perfil. Reglas en choose_guest_account_name.
 */
export default function GuestNamePrompt({ username }: { username: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(name: string) {
    setSaving(true)
    setError('')
    try {
      await ensureCommunityRules()
      const { error: rpcError } = await createClient().rpc('choose_guest_account_name', { p_username: name })
      if (rpcError) throw new Error(rpcError.message)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el nombre, probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Elegí tu nombre">
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void save(value) }}>
        <p className="text-sm text-muted">
          Tu cuenta ya guardó lo que jugaste. Ahora elegí cómo te van a ver en la mesa.
        </p>
        <Input label="Nombre de usuario" name="guest-username" value={value} onChange={e => setValue(e.target.value)}
          maxLength={20} autoComplete="username" autoFocus disabled={saving} placeholder="ej: ElTruco99" />
        {error && <p role="alert" className="text-xs text-negative">{error}</p>}
        <Button type="submit" fullWidth disabled={saving || value.trim().length < 3}>{saving ? 'Guardando…' : 'Guardar nombre'}</Button>
        <button type="button" disabled={saving} onClick={() => { void save(username) }}
          className="self-center py-1.5 px-3 text-sm text-subtle hover:text-cream transition-colors disabled:opacity-50">
          Seguir como {username}
        </button>
      </form>
    </Modal>
  )
}
