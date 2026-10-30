'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button, Panel } from '@/components/ui'
import SafetyActions, { reportReasons, contentLabels, type ContentKind } from './SafetyActions'
import { appRequest } from '@/lib/app-request'

type Case = { id: string; kind: string; subject_name: string | null; reason: string; detail: string; evidence: Record<string, unknown>; image_count: number; created_at: string; resolved_at: string | null; resolution: string | null }
type Feedback = { id: string; username: string | null; comment: string | null; image_count: number; created_at: string }
export default function ModerationScreen() {
  const [cases, setCases] = useState<Case[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  async function load() {
    setLoading(true)
    const client = createClient()
    const [r, reviews] = await Promise.all([client.rpc('moderation_reports'), client.rpc('moderation_feedback')])
    setLoading(false)
    if (r.error || reviews.error) { setCases([]); setFeedback([]); setError(r.error?.message || reviews.error!.message) } else { setCases(r.data); setFeedback(reviews.data); setError('') }
  }
  useEffect(() => { void load(); window.addEventListener('community:safety-changed', load); return () => window.removeEventListener('community:safety-changed', load) }, [])
  return <main className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-4 min-h-dvh">
    <Link href="/admin" className="text-gold">← Volver al panel</Link><h1 className="text-2xl font-display font-bold">Denuncias de convivencia</h1>
    <p className="text-sm text-muted">Contenido privado. Revisá el contexto antes de actuar. Retirar elimina o reemplaza el contenido señalado; restringir también impide aportes sociales durante 7 días. Las partidas siguen.</p>
    <Button variant="ghost" onClick={() => void load()}>Actualizar denuncias</Button>
    {error && <p role="alert" className="text-negative">{error}</p>}{loading && <p role="status">Cargando…</p>}
    {!loading && !error && cases.length === 0 && <p>No hay denuncias.</p>}
    {cases.map(item => <ModerationCase key={item.id} item={item} reload={load} />)}
    {feedback.length > 0 && <details><summary className="font-bold text-gold cursor-pointer">Reseñas privadas recientes</summary><div className="flex flex-col gap-3 mt-3">{feedback.map(review => <Panel key={review.id} className="p-4 text-sm flex flex-col gap-2"><p className="font-bold">{review.username || 'Cuenta eliminada'} · {new Date(review.created_at).toLocaleDateString('es-AR')}</p><p className="whitespace-pre-wrap break-words">{review.comment || 'Sin comentario'}</p><p className="text-muted">{review.image_count} imágenes adjuntas</p><SafetyActions kind="feedback" target={review.id} label="Denunciar reseña" /></Panel>)}</div></details>}
  </main>
}
function ModerationCase({ item, reload }: { item: Case; reload: () => Promise<void> }) {
  const [action, setAction] = useState('dismiss'), [resolution, setResolution] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [images, setImages] = useState<{ type: string; data: string }[]>([])
  async function loadImages() {
    try {
      const r = await appRequest('/api/community/report-images?id=' + item.id), body = await r.json()
      if (!r.ok) throw new Error(body.error)
      setImages(body.images)
    } catch { setError('No pudimos abrir las copias privadas.') }
  }
  async function resolve() {
    setBusy(true); setError('')
    const r = await createClient().rpc('resolve_community_report', { p_report: item.id, p_action: action, p_resolution: resolution })
    setBusy(false)
    if (r.error) setError(r.error.message); else await reload()
  }
  return <Panel className="p-4 flex flex-col gap-3">
    <h2 className="font-bold">{item.subject_name || 'Cuenta eliminada'} · {contentLabels[item.kind as ContentKind]}</h2><p className="text-sm">{reportReasons[item.reason as keyof typeof reportReasons]} · {new Date(item.created_at).toLocaleString('es-AR')}</p>
    <p className="text-sm whitespace-pre-wrap break-words">{item.detail}</p>
    <details><summary className="text-gold cursor-pointer">Ver copia del contenido denunciado</summary><dl className="text-sm bg-surface2 rounded-xl p-3 mt-2 flex flex-col gap-2">{Object.entries({ username: 'Nombre', sender_name: 'Nombre al enviar', author_username: 'Autor', title: 'Título', name: 'Nombre', body: 'Texto', description: 'Descripción', comment: 'Comentario', avatar_url: 'Foto original' }).map(([key, label]) => typeof item.evidence[key] === 'string' && <div key={key}><dt className="font-bold">{label}</dt><dd className="whitespace-pre-wrap break-words">{item.evidence[key] as string}</dd></div>)}</dl></details>
    {item.image_count > 0 && <Button variant="ghost" size="sm" onClick={() => void loadImages()}>Ver imágenes privadas ({item.image_count})</Button>}
    {images.map((image, i) => <Image key={i} src={'data:' + image.type + ';base64,' + image.data} width={1280} height={1280} alt={'Copia del contenido denunciado ' + (i + 1)} className="max-w-full h-auto rounded-xl" />)}
    {item.resolved_at ? <p className="text-sm text-muted">Resuelta: {item.resolution}</p> : <>
      <label className="text-sm">Decisión<select className="block w-full bg-surface2 border border-line p-3 rounded-xl" value={action} onChange={e => setAction(e.target.value)}><option value="dismiss">Cerrar sin sanción</option><option value="remove">Retirar contenido</option><option value="restrict">Retirar y restringir 7 días</option></select></label>
      <label className="text-sm">Respuesta para quien denunció<textarea rows={3} maxLength={500} className="block w-full rounded-xl bg-surface2 p-3 border border-line" value={resolution} onChange={e => setResolution(e.target.value)} /></label>
      <Button disabled={busy || resolution.trim().length < 5} onClick={() => void resolve()}>Resolver denuncia</Button>
    </>}{error && <p role="alert" className="text-negative text-sm">{error}</p>}
  </Panel>
}
