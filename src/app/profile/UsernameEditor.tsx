'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Button } from '@/components/ui'
import { ensureCommunityRules } from '@/lib/community-safety'

/** Nombre de usuario con su único cambio permitido. Las reglas viven en change_username. */
export default function UsernameEditor({ username, changedAt }: { username: string; changedAt?: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(username)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      await ensureCommunityRules()
      const { error: rpcError } = await createClient().rpc('change_username', { p_username: value })
      if (rpcError) throw new Error(rpcError.message)
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el nombre, probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) return (
    <div className="flex flex-col gap-1 border-b border-line pb-3 mb-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-subtle">Nombre de usuario</p>
          <p className="font-semibold text-cream truncate">{username}</p>
        </div>
        {!changedAt && <Button variant="secondary" size="sm" onClick={() => { setValue(username); setError(''); setEditing(true) }}>Cambiar</Button>}
      </div>
      {changedAt && <p className="text-xs text-subtle">Ya usaste tu cambio. Para otro, escribinos a hola@trucazo.com.ar.</p>}
    </div>
  )

  return (
    <form className="flex flex-col gap-2 border-b border-line pb-3 mb-1" onSubmit={e => { e.preventDefault(); void save() }}>
      <Input label="Nuevo nombre de usuario" name="new-username" value={value} onChange={e => setValue(e.target.value)}
        maxLength={20} autoComplete="username" autoFocus disabled={saving} />
      <p className="text-xs text-subtle">Lo podés cambiar una sola vez. Vas a entrar con el nombre nuevo o con tu correo.</p>
      {error && <p role="alert" className="text-xs text-negative">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || value.trim().length < 3}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setEditing(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
