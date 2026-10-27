'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { COMMUNITY_RULES } from '@/lib/community-safety'
import { Button } from '@/components/ui'
import CommunityDialog from './CommunityDialog'

export default function CommunityRulesPrompt() {
  const [answer, setAnswer] = useState<((accepted: boolean) => void) | null>(null)
  useEffect(() => {
    const ask = (event: Event) => setAnswer(() => (event as CustomEvent).detail)
    window.addEventListener('community:rules', ask)
    return () => window.removeEventListener('community:rules', ask)
  }, [])
  if (!answer) return null
  const finish = (value: boolean) => { answer(value); setAnswer(null) }
  return <CommunityDialog title="Normas de convivencia" onClose={() => finish(false)}>
      <h2 id="community-rules-title" className="text-lg font-bold">Normas de convivencia</h2>
      <p className="text-sm text-muted">{COMMUNITY_RULES}</p>
      <p className="text-sm text-muted">Podés denunciar contenido y bloquear personas desde Convivencia. Bloquear impide nuevos contactos y oculta sus mensajes; una partida ya iniciada continúa normalmente.</p>
      <Link href="/terminos" target="_blank" className="text-sm text-gold underline">Leer los términos completos</Link>
      <Button autoFocus onClick={() => finish(true)}>Acepto las normas</Button>
      <Button variant="ghost" onClick={() => finish(false)}>Ahora no</Button>
  </CommunityDialog>
}
