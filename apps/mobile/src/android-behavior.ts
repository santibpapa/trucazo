import { App } from '@capacitor/app'
import { authDestination } from '../../../src/lib/auth-links'

const routeKey = (owner: string) => 'trucazo:mobile:screen:' + owner

export function restoreScreen(owner?: string) {
  if (!location.hash && owner) {
    const saved = authDestination(localStorage.getItem(routeKey(owner)))
    const resume = saved && (saved.startsWith('/game/') || saved === '/historia/offline')
    history.replaceState(null, '', '#' + (resume ? saved : '/inicio'))
  }
  return location.hash
}

export function rememberScreen(owner: string, route: string) {
  const path = ['', '#/inicio', '#/ajustes'].includes(route) ? '/inicio' : authDestination(route.slice(1))
  if (path && !path.includes('?')) localStorage.setItem(routeKey(owner), path)
}

/** Atrás cierra primero lo que está encima; jamás abandona ni cobra una partida. */
export function androidBack(canGoBack: boolean) {
  const dialog = Array.from(document.querySelectorAll<HTMLElement>('dialog[open],[role="dialog"]'))
    .filter(element => element.getClientRects().length && !element.closest('[inert]')).at(-1)
  if (dialog) {
    if (dialog instanceof HTMLDialogElement) {
      if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close()
    } else dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    return
  }
  const expanded = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]'))
    .find(button => button.getClientRects().length)
  if (expanded) { expanded.click(); return }
  if (!window.dispatchEvent(new Event('mobile:back', { cancelable: true }))) return
  if (['', '#/login', '#/inicio'].includes(location.hash)) { void App.minimizeApp(); return }
  if (['#/lobby', '#/ajustes', '#/historia', '#/historia/offline'].includes(location.hash)) { location.replace('#/inicio'); return }
  if (canGoBack) history.back()
  else location.replace('#/inicio')
}
