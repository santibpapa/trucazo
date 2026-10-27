import { Browser } from '@capacitor/browser'
import { createClient, cachedSession, SESSION_KEY } from './services'
import { WEB_ORIGIN, RELEASE } from './config'
import { authDestination, parseAppLink } from '../../../src/lib/auth-links'

const FLOW_KEY = 'trucazo:mobile:auth-flow:v1'
const DESTINATION_KEY = 'trucazo:mobile:auth-next:v1'
type Flow = { kind: 'google' | 'signup' | 'recovery'; nonce: string; started: number; owner: string | null; verified?: boolean }
function pending(): Flow | null {
  const value = localStorage.getItem(FLOW_KEY)
  return value ? JSON.parse(value) as Flow : null
}
export function rememberDestination(path: string) {
  const safe = authDestination(path)
  if (safe) localStorage.setItem(DESTINATION_KEY, safe)
}
export function takeDestination() {
  const value = authDestination(localStorage.getItem(DESTINATION_KEY)) || '/lobby'
  localStorage.removeItem(DESTINATION_KEY)
  return value
}
export function cancelAuth() {
  localStorage.removeItem(FLOW_KEY)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(SESSION_KEY) && key.endsWith('-code-verifier')) localStorage.removeItem(key)
  }
}
export function googlePending() { return pending()?.kind === 'google' }
function begin(kind: Flow['kind']) {
  if (!navigator.onLine) throw new Error('Necesitás internet para continuar.')
  const flow: Flow = { kind, nonce: crypto.randomUUID(), started: Date.now(), owner: cachedSession()?.user.id ?? null }
  localStorage.setItem(FLOW_KEY, JSON.stringify(flow))
  return WEB_ORIGIN + '/auth/mobile?flow=' + kind + '&nonce=' + flow.nonce + (RELEASE ? '&app=release' : '')
}
export async function googleSignIn() {
  const redirectTo = begin('google')
  const { data, error } = await createClient().auth.signInWithOAuth({ provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } })
  if (error || !data.url) { cancelAuth(); throw new Error('No pudimos abrir Google. Reintentá.') }
  try { await Browser.open({ url: data.url }) }
  catch { cancelAuth(); throw new Error('No pudimos abrir el navegador. Reintentá.') }
}
export async function register(email: string, password: string, username: string) {
  const emailRedirectTo = begin('signup')
  const client = createClient()
  const { data: existing, error: lookupError } = await client.from('profiles').select('username').ilike('username', username).maybeSingle()
  if (lookupError) throw new Error('No pudimos comprobar el nombre. Reintentá.')
  if (existing) throw new Error('Ese nombre de usuario ya está en uso')
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { username, community_rules_version: '2026-10-15' }, emailRedirectTo } })
  if (error) throw new Error('No pudimos crear la cuenta. Revisá los datos o intentá ingresar si ya tenés una.')
  if (data.session) cancelAuth()
  return !!data.session
}
export async function requestRecovery(email: string) {
  const redirectTo = begin('recovery')
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error('No pudimos enviar el correo. Esperá un minuto y reintentá.')
}
export function recoveryReady() {
  const flow = pending()
  return flow?.kind === 'recovery' && flow.verified === true && !!flow.owner && flow.owner === cachedSession()?.user.id && Date.now() - flow.started < 3600000
}
let completing = false
export async function completeAppAuth(value: string): Promise<'recovery' | 'login' | null> {
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('')
  if (localStorage.getItem(FLOW_KEY + ':completed') === fingerprint) return null
  const link = parseAppLink(value), flow = pending()
  if (!link || link.path !== '/auth/mobile' || !flow || completing
    || Date.now() - flow.started > 3600000 || link.params.get('nonce') !== flow.nonce
    || link.params.get('flow') !== flow.kind || flow.owner !== (cachedSession()?.user.id ?? null)) {
    throw new Error('Este enlace no corresponde al acceso iniciado en esta app. Pedí uno nuevo.')
  }
  if (link.params.has('error') || link.params.has('error_code')) { cancelAuth(); throw new Error('El acceso se canceló o el enlace venció. Volvé a intentarlo.') }
  const code = link.params.get('code')
  if (!code) throw new Error('El enlace está incompleto. Pedí uno nuevo.')
  const flowId = link.params.get('sb_flow_id')
  if (flowId && !/^[0-9a-f]{32}$/.test(flowId)) throw new Error('El enlace está incompleto. Pedí uno nuevo.')
  const verifier = localStorage.getItem(flowId ? SESSION_KEY + '-flow-' + flowId + '-code-verifier' : SESSION_KEY + '-code-verifier')
  if (flow.kind === 'recovery' && !verifier?.includes('/recovery')) throw new Error('Este enlace no permite cambiar la contraseña.')
  completing = true
  try {
    const { data, error } = await createClient().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
    if (error || !data.session || data.user?.is_anonymous) throw new Error('El enlace venció o ya fue usado. Pedí uno nuevo.')
    if (flow.owner && data.user?.id !== flow.owner) {
      await createClient().auth.signOut({ scope: 'local' })
      cancelAuth()
      throw new Error('Elegí la misma cuenta con la que iniciaste la confirmación.')
    }
    if (flow.kind === 'recovery') {
      localStorage.setItem(FLOW_KEY, JSON.stringify({ ...flow, owner: data.user!.id, verified: true }))
      localStorage.setItem(FLOW_KEY + ':completed', fingerprint)
      return 'recovery'
    }
    cancelAuth()
    localStorage.setItem(FLOW_KEY + ':completed', fingerprint)
    // Igual que el callback web: la foto sólo se agrega si no hay una propia.
    const photo = data.user?.user_metadata?.avatar_url || data.user?.user_metadata?.picture
    if (typeof photo === 'string' && photo.startsWith('https://')) {
      const { data: profile } = await createClient().from('profiles').select('avatar_url').eq('id', data.user!.id).maybeSingle()
      if (profile && !profile.avatar_url) await createClient().rpc('set_avatar_url', { p_url: photo })
    }
    return 'login'
  } finally { completing = false }
}
export async function changePassword(password: string) {
  if (!recoveryReady()) throw new Error('Abrí un enlace de recuperación vigente para cambiar la contraseña.')
  const { error } = await createClient().auth.updateUser({ password })
  if (error) throw new Error('No pudimos cambiar la contraseña. Probá otra o pedí un enlace nuevo.')
  cancelAuth()
}
