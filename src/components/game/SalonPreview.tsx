'use client'

import { useEffect, useRef } from 'react'
import { getSalonTheme } from '@/lib/salones'
import { SalonBackground, SalonTable } from './SalonScene'
import PlayingCard from './PlayingCard'
import CardBack from './CardBack'
import { getRank } from '@/lib/truco'
import styles from './salon.module.css'

/** Vista decorativa: nunca compra, equipa ni crea una partida. */
export default function SalonPreview({ slug, onClose }: { slug: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const theme = getSalonTheme(slug)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close() }
  }, [])

  return (
    <dialog ref={dialog} onClose={() => { if (dialog.current && !dialog.current.open) onClose() }} aria-labelledby="salon-preview-title" className={styles.previewDialog}>
      <SalonBackground slug={slug} />
      <div className={styles.previewContent}>
        <header className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">Vista previa</p>
            <h2 id="salon-preview-title" className="font-display text-2xl font-bold text-cream">{theme.name}</h2>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} className={styles.toolButton} aria-label="Cerrar vista previa">✕</button>
        </header>
        <div className={styles.previewStage}>
          <SalonTable slug={slug} />
          <div className="relative z-10 flex justify-center gap-1 pt-14" aria-hidden="true">
            {[0, 1, 2].map(i => <CardBack key={i} className="w-9 aspect-[11/17]" />)}
          </div>
          <div className="relative z-10 flex justify-center my-auto py-5">
            <PlayingCard card={{ suit: 'copa', value: 5, rank: getRank(5, 'copa') }} className="w-16" />
          </div>
          <div className="relative z-10 flex justify-center gap-1 pb-12">
            <PlayingCard card={{ suit: 'espada', value: 1, rank: getRank(1, 'espada') }} className="w-20 -rotate-6 translate-y-1" />
            <PlayingCard card={{ suit: 'oro', value: 7, rank: getRank(7, 'oro') }} className="w-20" />
            <PlayingCard card={{ suit: 'basto', value: 3, rank: getRank(3, 'basto') }} className="w-20 rotate-6 translate-y-1" />
          </div>
        </div>
        <p className="relative text-center text-sm text-cream">{theme.description}</p>
        <button type="button" onClick={() => dialog.current?.close()} className="relative min-h-11 rounded-lg border border-gold/50 bg-black/70 px-4 text-sm text-cream">Volver a la tienda</button>
      </div>
    </dialog>
  )
}
