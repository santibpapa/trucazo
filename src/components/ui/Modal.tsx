'use client'

import { useEffect, useId } from 'react'
import Panel from './Panel'
import { cn } from './cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  panelClassName?: string
  showCloseButton?: boolean
  children: React.ReactNode
}

/** Modal centrado, mobile-first. Cierra con Escape o click en el backdrop. */
export default function Modal({
  open,
  onClose,
  title,
  panelClassName,
  showCloseButton = false,
  children,
}: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn('relative flex w-full max-w-sm flex-col gap-5 p-6 animate-scale-in', panelClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={titleId} className={cn('font-display text-xl font-bold text-cream', showCloseButton && 'pr-11')}>
            {title}
          </h2>
        )}
        {showCloseButton && (
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {children}
      </Panel>
    </div>
  )
}
