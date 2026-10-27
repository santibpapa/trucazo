import { Capacitor, registerPlugin } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App } from '@capacitor/app'
import { apiRequest, cachedSession } from './services'
import { navigate } from './navigation'

export type PushPreferences = { invite: boolean; checkin: boolean; match: boolean }
export type PushState = { available: boolean; preferences: PushPreferences }
type BindingState = { installation: string; secret: string; owner: string; binding: string; allowed: boolean; consented: boolean }
const Binding = registerPlugin<{
  state(options: { owner: string }): Promise<BindingState>
  bind(options: { owner: string; binding: string } & PushPreferences): Promise<void>
  clear(options: { owner: string; forget: boolean }): Promise<void>
}>('PushBinding')
let activeOwner = '', epoch = 0
let installed: Promise<void> | null = null
let requestingToken = false
let registering: Promise<void> = Promise.resolve()
let pendingTap: Record<string, string> | null = null
const changed = () => window.dispatchEvent(new Event('mobile:push'))

async function tap(data: Record<string, string>) {
  const owner = cachedSession()?.user.id
  if (!owner) { pendingTap = data; navigate('/login'); return }
  pendingTap = null
  if (owner !== data.user) { window.dispatchEvent(new CustomEvent('mobile:push-message', { detail: 'Ese aviso pertenece a otra cuenta.' })); return }
  const expired = Number(data.expires) * 1000 <= Date.now()
  if (expired) window.dispatchEvent(new CustomEvent('mobile:push-message', { detail: 'Ese aviso ya venció. Podés consultar el estado actual.' }))
  if (data.path === '/comunidad' || /^\/torneos\/[0-9a-f-]{36}$/.test(data.path || '')) navigate(data.path)
}

function installListeners() {
  if (!installed) installed = (async () => {
    await PushNotifications.addListener('pushNotificationActionPerformed', event => { void tap(event.notification.data || {}) })
    await PushNotifications.addListener('pushNotificationReceived', () => window.dispatchEvent(new Event('mobile:refresh')))
    await PushNotifications.addListener('registration', () => {
      if (!requestingToken && activeOwner) void syncPush(activeOwner).catch(() => {})
    })
    await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void syncPush(cachedSession()?.user.id || '').catch(() => {}) })
  })()
  return installed
}

async function token() {
  requestingToken = true
  let received: (value: string) => void, failed: () => void
  const value = new Promise<string>((resolve, reject) => { received = resolve; failed = () => reject(new Error('No pudimos conectar los avisos. Reintentá.')) })
  const timer = setTimeout(() => failed(), 20000)
  const handles = await Promise.all([
    PushNotifications.addListener('registration', next => received(next.value)),
    PushNotifications.addListener('registrationError', failed!),
  ])
  try { await PushNotifications.register(); return await value }
  finally { requestingToken = false; clearTimeout(timer); await Promise.all(handles.map(handle => handle.remove())) }
}

async function register(owner: string, generation: number, enable: boolean) {
  const native = await Binding.state({ owner })
  if (!enable && !native.consented) return
  const state = await apiRequest<PushState>('/api/android/push')
  if (!state.available) throw new Error('Los avisos todavía están en prueba.')
  if (enable) await PushNotifications.requestPermissions()
  const permissions = await PushNotifications.checkPermissions()
  const current = await Binding.state({ owner })
  if (permissions.receive !== 'granted' || !current.allowed) {
    await Binding.clear({ owner, forget: false })
    await apiRequest('/api/android/push', { action: 'unregister', installation: native.installation, secret: native.secret })
    throw new Error('Los avisos están desactivados en Android. Podés seguir jugando igual.')
  }
  const nextToken = await token()
  if (generation !== epoch || cachedSession()?.user.id !== owner) return
  const binding = native.owner === owner && native.binding ? native.binding : crypto.randomUUID()
  await apiRequest('/api/android/push', { action: 'register', installation: native.installation, secret: native.secret, token: nextToken, binding })
  if (generation !== epoch || cachedSession()?.user.id !== owner) return
  await Binding.bind({ owner, binding, ...state.preferences })
}

export async function syncPush(owner: string, enable = false) {
  if (!Capacitor.isNativePlatform()) return
  const generation = owner === activeOwner ? epoch : ++epoch
  const different = owner !== activeOwner
  activeOwner = owner
  if (different) await Binding.clear({ owner, forget: false })
  await installListeners()
  if (pendingTap && owner) await tap(pendingTap)
  if (!owner) return
  const run = registering.catch(() => {}).then(() => generation === epoch ? register(owner, generation, enable) : undefined)
  registering = run
  try { await run } finally { changed() }
}

export async function stopPush(forget = false) {
  if (!Capacitor.isNativePlatform()) return
  const owner = cachedSession()?.user.id || ''
  ++epoch; activeOwner = ''; pendingTap = null
  const native = await Binding.state({ owner })
  // Primero se corta la recepción local, incluso si el teléfono perdió la red.
  await Binding.clear({ owner, forget })
  await PushNotifications.unregister()
  if (owner) await apiRequest('/api/android/push', { action: 'unregister', installation: native.installation, secret: native.secret })
  changed()
}

export async function pushStatus() {
  const owner = cachedSession()?.user.id || ''
  const [state, native] = await Promise.all([apiRequest<PushState>('/api/android/push'), Binding.state({ owner })])
  return { ...state, enabled: native.owner === owner && native.consented && native.allowed }
}

export async function savePushPreferences(preferences: PushPreferences) {
  const owner = cachedSession()?.user.id || '', native = await Binding.state({ owner })
  // Aplicar primero los apagados locales descarta mensajes que ya estén en camino.
  if (native.owner === owner) await Binding.bind({ owner, binding: native.binding, ...preferences })
  await apiRequest('/api/android/push', { action: 'preferences', ...preferences })
  changed()
}
