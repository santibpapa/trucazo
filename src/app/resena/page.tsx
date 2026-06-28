'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Panel, Button, Logo, Alert } from '@/components/ui'

// Genera un nombre único de archivo (con fallback por si crypto.randomUUID no
// está disponible en contextos no seguros, p.ej. http en la red local).
function uniqueName(ext: string) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${id}.${ext}`
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} de 5`}
          className={`text-3xl leading-none transition-transform hover:scale-110 ${
            n <= value ? 'text-gold' : 'text-line hover:text-muted'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (b: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-xl border py-2.5 font-display font-bold transition-colors ${
          value === true ? 'border-positive bg-positive/15 text-positive' : 'border-line bg-surface2 text-muted hover:text-cream'
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-xl border py-2.5 font-display font-bold transition-colors ${
          value === false ? 'border-negative bg-negative/15 text-negative' : 'border-line bg-surface2 text-muted hover:text-cream'
        }`}
      >
        No
      </button>
    </div>
  )
}

const MAX_IMAGES = 3
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export default function ResenaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [general, setGeneral] = useState(0)
  const [aesthetics, setAesthetics] = useState(0)
  const [understood, setUnderstood] = useState<boolean | null>(null)
  const [hadProblem, setHadProblem] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Vuelve a la pantalla de fin de la partida (donde están Revancha / Volver al
  // lobby). Si no vino el id de la partida, cae al lobby. thanks=true agrega el
  // saludo de gracias en esa pantalla.
  function goBack(thanks = false) {
    const gameId = new URLSearchParams(window.location.search).get('game')
    if (gameId) router.push(`/game/${gameId}${thanks ? '?gracias=1' : ''}`)
    else router.push('/lobby')
    router.refresh()
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    const imgs = picked.filter(f => f.type.startsWith('image/') && f.size <= MAX_SIZE)
    if (imgs.length < picked.length) {
      setError('Algunas no se agregaron: solo imágenes de hasta 5 MB.')
    }
    setFiles(imgs.slice(0, MAX_IMAGES))
  }

  async function handleSubmit() {
    if (general === 0 || aesthetics === 0) {
      setError('Poné las dos puntuaciones (las estrellitas).')
      return
    }
    if (understood === null || hadProblem === null) {
      setError('Respondé las dos preguntas de Sí/No.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Subir imágenes (si hay) al depósito privado
      const paths: string[] = []
      for (const f of files) {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = uniqueName(ext || 'jpg')
        const { error: upErr } = await supabase.storage.from('feedback-images').upload(path, f)
        if (upErr) throw upErr
        paths.push(path)
      }
      const { error: rpcErr } = await supabase.rpc('submit_feedback', {
        p_rating_general: general,
        p_rating_aesthetics: aesthetics,
        p_understood: understood,
        p_had_problem: hadProblem,
        p_comment: comment,
        p_image_paths: paths,
      })
      if (rpcErr) throw rpcErr

      // Aviso por mail (best-effort vía Web3Forms). Si no está la clave, se saltea.
      // La reseña ya quedó guardada en Supabase, así que esto nunca bloquea el envío.
      const w3fKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
      if (w3fKey) {
        try {
          // Enlaces temporales (7 días) a las imágenes del depósito privado
          const links: string[] = []
          for (const p of paths) {
            const { data: signed } = await supabase.storage
              .from('feedback-images').createSignedUrl(p, 60 * 60 * 24 * 7)
            if (signed?.signedUrl) links.push(signed.signedUrl)
          }
          await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: w3fKey,
              subject: 'Nueva reseña de Trucazo',
              from_name: 'Trucazo',
              'Puntuación general': `${general}/5`,
              'Estética': `${aesthetics}/5`,
              'Entendió el desarrollo': understood ? 'Sí' : 'No',
              'Tuvo problemas': hadProblem ? 'Sí' : 'No',
              'Comentario': comment.trim() || '(sin comentario)',
              'Imágenes': links.length ? links.join('\n') : '(ninguna)',
            }),
          })
        } catch {
          // el mail es opcional; la reseña ya está guardada en Supabase
        }
      }

      // Vuelve a la pantalla de fin de la partida (con el saludo de gracias)
      goBack(true)
    } catch (e) {
      setError((e as { message?: string })?.message || 'No se pudo enviar la reseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col min-h-screen p-4 sm:p-6 gap-5 max-w-lg mx-auto w-full">
      <header className="flex flex-col items-center gap-2 text-center pt-1">
        <Logo size="md" />
        <p className="text-sm text-muted">Contanos qué te pareció</p>
      </header>

      {error && <Alert>{error}</Alert>}

      <Panel className="p-5 flex flex-col gap-5">
        {/* Puntuación general */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-cream">Puntuación general de la página</label>
          <Stars value={general} onChange={setGeneral} />
        </div>

        {/* Estética */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-cream">¿Cómo calificarías la estética de la página?</label>
          <Stars value={aesthetics} onChange={setAesthetics} />
        </div>

        {/* Entendiste */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-cream">¿Entendiste fácil el desarrollo de la partida?</label>
          <YesNo value={understood} onChange={setUnderstood} />
        </div>

        {/* Problema */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-cream">¿Tuviste algún problema en el transcurso de la partida?</label>
          <YesNo value={hadProblem} onChange={setHadProblem} />
        </div>

        {/* Comentario */}
        <div className="flex flex-col gap-2">
          <label htmlFor="comment" className="text-sm font-medium text-cream">
            Si tuviste algún problema o querés dejarnos alguna sugerencia podés hacerlo acá
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            placeholder="Escribí acá…"
            className="w-full rounded-xl border border-line bg-surface2 p-3 text-sm text-cream placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>

        {/* Imágenes */}
        <div className="flex flex-col gap-2">
          <label htmlFor="images" className="text-sm font-medium text-cream">
            Si querés ser más específico y dejarnos alguna imagen hacelo acá
          </label>
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:font-semibold file:text-ink hover:file:bg-gold-600"
          />
          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((f, i) => (
                <li key={i} className="text-xs text-subtle truncate">📎 {f.name}</li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-subtle">Hasta {MAX_IMAGES} imágenes, máximo 5 MB cada una.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" fullWidth onClick={() => goBack()} disabled={loading}>
            Cancelar
          </Button>
          <Button fullWidth onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </Panel>
    </main>
  )
}
