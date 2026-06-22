'use client'

import { useEffect, useId } from 'react'
import Panel from './Panel'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/** Modal centrado, mobile-first. Cierra con Escape o click en el backdrop. */
export default function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="w-full max-w-sm p-6 flex flex-col gap-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={titleId} className="font-display text-xl font-bold text-cream">{title}</h2>
        )}
        {children}
      </Panel>
    </div>
  )
}
