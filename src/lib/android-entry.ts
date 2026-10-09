// Marcador por pestaña: una visita a la app no cambia la política de invitados
// en las otras pestañas del navegador. No es una credencial ni autorización.
const KEY = 'trucazo:android-entry:v1'

export function isAndroidEntry(): boolean {
  if (typeof window === 'undefined') return false
  const entry = window.location.pathname === '/android'
    || new URLSearchParams(window.location.search).get('android') === '1'
    || document.referrer.startsWith('android-app://ar.com.trucazo.')
  try {
    if (entry) sessionStorage.setItem(KEY, '1')
    return entry || sessionStorage.getItem(KEY) === '1'
  } catch { return entry }
}

export function loginDestination(): string {
  return isAndroidEntry() ? '/android' : '/lobby'
}

export async function clearAndroidProbe() {
  try {
    await caches.delete('trucazo-android-probe-v1')
    indexedDB.deleteDatabase('trucazo-android-probe-v1')
    if (localStorage.getItem('trucazo:android-probe-subscribed:v1')) {
      const reg = await navigator.serviceWorker.getRegistration('/')
      await (await reg?.pushManager.getSubscription())?.unsubscribe()
      localStorage.removeItem('trucazo:android-probe-subscribed:v1')
    }
  } catch { /* No impedir salir de la cuenta por un error de almacenamiento. */ }
}
