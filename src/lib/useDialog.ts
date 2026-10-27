'use client'

import { useEffect, useRef, type RefObject } from 'react'

const dialogs: HTMLElement[] = []
const hiddenElements = new Map<HTMLElement, { count: number; inert: boolean }>()
const controls = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'

/** Foco, Escape y fondo inaccesible compartidos por las ventanas web y Android. */
export function useDialog(ref: RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const root = ref.current
    if (!open || !root) return
    const dialog = root.matches('[role="dialog"]') ? root : root.querySelector<HTMLElement>('[role="dialog"]')!
    const previous = document.activeElement as HTMLElement | null
    const hidden: HTMLElement[] = []
    for (let branch: HTMLElement | null = dialog; branch?.parentElement; branch = branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          const state = hiddenElements.get(sibling) || { count: 0, inert: sibling.inert }
          state.count++
          hiddenElements.set(sibling, state)
          hidden.push(sibling); sibling.inert = true
        }
      }
      if (branch.parentElement === document.body) break
    }
    dialogs.push(dialog)
    const items = () => Array.from(dialog.querySelectorAll<HTMLElement>(controls)).filter(el => el.getClientRects().length && !el.closest('[inert]'))
    dialog.tabIndex = -1
    ;(items()[0] || dialog).focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== dialog) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); return }
      if (event.key !== 'Tab') return
      const list = items(), first = list[0] || dialog, last = list.at(-1) || dialog
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', keydown, true)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      dialogs.splice(dialogs.indexOf(dialog), 1)
      for (const element of hidden) {
        const state = hiddenElements.get(element)!
        if (--state.count === 0) { element.inert = state.inert; hiddenElements.delete(element) }
      }
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true })
    }
  }, [open, ref])
}
