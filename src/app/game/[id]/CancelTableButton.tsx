'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CancelTableButton({ tableId }: { tableId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function cancel() {
    setLoading(true)
    // cancel_table (security definer) borra la mesa y reembolsa la apuesta al creador
    const { error } = await createClient().rpc('cancel_table', { p_table_id: tableId })
    if (error) {
      console.error('cancel_table RPC:', error)
      setLoading(false)
      return
    }
    router.push('/lobby')
    router.refresh()
  }

  return (
    <button
      onClick={cancel}
      disabled={loading}
      className="text-sm text-subtle hover:text-negative transition-colors disabled:opacity-50"
    >
      {loading ? 'Cancelando…' : 'Cancelar y volver al lobby'}
    </button>
  )
}
