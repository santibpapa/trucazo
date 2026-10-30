'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Panel from '@/components/ui/Panel'
import { useDialog } from '@/lib/useDialog'

export default function CommunityDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const close = useRef(onClose)
  close.current = onClose
  const overlay = useRef<HTMLDivElement>(null)
  const portalRoot = useRef(document.activeElement?.closest('dialog[open]') ?? document.body)
  useDialog(overlay, true, onClose)
  useEffect(() => {
    const dismiss = () => close.current()
    window.addEventListener('community:close-dialog', dismiss)
    return () => { window.removeEventListener('community:close-dialog', dismiss) }
  }, [])
  return createPortal(<div ref={overlay} className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
    <Panel role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md max-h-[90dvh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col gap-2">{children}</div>
    </Panel>
  </div>, portalRoot.current)
}
