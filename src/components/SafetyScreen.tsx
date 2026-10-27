'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { COMMUNITY_RULES, ensureCommunityRules, safetyChanged, type SafetyState } from '@/lib/community-safety'
import { Button, Panel, Input } from '@/components/ui'
import SafetyActions, { reportReasons } from './SafetyActions'

export default function SafetyScreen() {
  const [data, setData] = useState<SafetyState | null>(null), [error, setError] = useState(''), [name, setName] = useState('')
  const [found, setFound] = useState<{ id: string; username: string } | null>(null)
  async function load() {
    const result = await createClient().rpc('community_safety_state')
    if (result.error) setError('No pudimos cargar Convivencia. Reintentá con conexión.')
    else { setData(result.data); setError('') }
  }
  useEffect(() => {
    void load(); window.addEventListener('community:safety-changed', load)
    return () => window.removeEventListener('community:safety-changed', load)
  }, [])
  async function search() {
    setFound(null); setError('')
    // eq evita interpretar comodines del nombre como una búsqueda de otros usuarios.
    const result = await createClient().from('profiles').select('id,username').eq('username', name.trim()).eq('is_bot', false).maybeSingle()
    if (result.error || !result.data) setError('No encontramos ese nombre exacto.')
    else setFound(result.data)
  }
  return <main className="w-full max-w-xl mx-auto p-4 flex flex-col gap-4 min-h-dvh">
    <Link href="/comunidad" className="text-gold">← Volver a Comunidad</Link><h1 className="font-display text-2xl font-bold">Convivencia</h1>
    <Panel className="p-4 flex flex-col gap-3"><h2 className="font-bold">Normas de la comunidad</h2><p className="text-sm text-muted">{COMMUNITY_RULES}</p><Link href="/terminos" className="text-gold text-sm underline">Términos y alcance del bloqueo</Link>
      {data && !data.accepted && <Button onClick={() => void ensureCommunityRules().then(load).catch(e => setError(e.message))}>Leer y aceptar las normas</Button>}
      {data?.restricted_until && <p role="status" className="text-sm text-negative">Participación social restringida hasta {new Date(data.restricted_until).toLocaleString('es-AR')}. Podés seguir jugando.</p>}
    </Panel>
    <Panel className="p-4 flex flex-col gap-3"><h2 className="font-bold">Denunciar o bloquear a una persona</h2><Input name="safety-username" label="Nombre de usuario exacto" value={name} onChange={e => { setName(e.target.value); setFound(null) }} /><Button onClick={() => void search()} disabled={!name.trim()}>Buscar persona</Button>
      {found && <div className="flex items-center justify-between gap-2"><span>{found.username}</span><SafetyActions target={found.id} userId={found.id} label={'Opciones de ' + found.username} /></div>}
    </Panel>
    <Panel className="p-4 flex flex-col gap-3"><h2 className="font-bold">Personas bloqueadas</h2>{data?.blocks.length === 0 && <p className="text-sm text-muted">No bloqueaste a nadie.</p>}
      {data?.blocks.map(person => <div key={person.id} className="flex items-center justify-between gap-2"><span className="truncate">{person.username}</span><Button size="sm" variant="ghost" onClick={async () => {
        const r = await createClient().rpc('set_player_block', { p_target: person.id, p_blocked: false })
        if (r.error) setError(r.error.message); else safetyChanged()
      }}>Desbloquear</Button></div>)}
    </Panel>
    <Panel className="p-4 flex flex-col gap-3"><h2 className="font-bold">Tus denuncias</h2>{data?.reports.length === 0 && <p className="text-sm text-muted">No enviaste denuncias.</p>}
      {data?.reports.map(report => <article key={report.id} className="border-t border-line pt-2 text-sm"><p>{reportReasons[report.reason as keyof typeof reportReasons]} · {report.resolved_at ? 'Resuelta' : 'Pendiente de revisión'}</p>{report.resolution && <p className="text-muted">{report.resolution}</p>}</article>)}
    </Panel>
    {error && <p role="alert" className="text-sm text-negative">{error}</p>}{!data && <Button onClick={() => void load()}>Reintentar</Button>}
  </main>
}
