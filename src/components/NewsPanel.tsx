'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NewsItem } from '@/lib/types'
import { Button, Input, Alert, cn } from '@/components/ui'

// Novedades: foro solo-lectura. Todos leen; solo el admin publica y borra.
export default function NewsPanel({ isAdmin }: { isAdmin: boolean }) {
  const supabase = createClient()
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [composing, setComposing] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data as NewsItem[]) ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 3500)
    return () => clearTimeout(t)
  }, [error])

  async function publish() {
    if (!title.trim() || !body.trim()) return
    setBusy(true); setError('')
    const { error: e } = await supabase.rpc('publish_news', { p_title: title.trim(), p_body: body.trim() })
    setBusy(false)
    if (e) { setError(e.message); return }
    setTitle(''); setBody(''); setComposing(false)
    load()
  }

  async function remove(id: string) {
    setItems(prev => prev?.filter(n => n.id !== id) ?? prev)
    await supabase.rpc('delete_news', { p_id: id })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-cream">Novedades</h2>
        {isAdmin && !composing && (
          <Button size="sm" onClick={() => setComposing(true)}>Publicar</Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Redactar (solo admin) */}
      {isAdmin && composing && (
        <div className="rounded-2xl border border-gold/40 bg-surface2 p-4 flex flex-col gap-3 animate-fade-up">
          <Input placeholder="Título" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} />
          <textarea
            placeholder="Contenido de la novedad…"
            value={body}
            maxLength={4000}
            onChange={e => setBody(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-line bg-base p-3 text-sm text-cream placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-gold resize-y"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" fullWidth onClick={() => { setComposing(false); setTitle(''); setBody('') }}>
              Cancelar
            </Button>
            <Button size="sm" fullWidth onClick={publish} disabled={busy || !title.trim() || !body.trim()}>
              {busy ? 'Publicando…' : 'Publicar'}
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {items === null ? (
        <p className="text-sm text-subtle">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="w-12 h-12 rounded-full bg-surface2 border border-line flex items-center justify-center text-gold">
            <MegaphoneIcon />
          </span>
          <p className="text-sm text-subtle max-w-xs">Todavía no hay novedades. Acá vas a ver las actualizaciones del juego.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(n => (
            <article
              key={n.id}
              className={cn('rounded-2xl border border-line bg-surface2 p-4 flex flex-col gap-1.5 animate-fade-up')}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-cream leading-tight">{n.title}</h3>
                {isAdmin && (
                  <button
                    onClick={() => remove(n.id)}
                    aria-label="Borrar novedad"
                    className="text-subtle hover:text-negative transition-colors p-1 shrink-0"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
              <p className="text-sm text-cream/90 whitespace-pre-wrap break-words">{n.body}</p>
              <p className="text-[11px] text-subtle mt-1">
                {fmtDate(n.created_at)} · por {n.author_username}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function MegaphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
