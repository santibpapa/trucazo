import { createRoot } from 'react-dom/client'
import OfflineApp from './OfflineApp'
import { step, botStep, type Action } from '../lib/offline-trial/engine'
import { BOTS_VERSION } from '../lib/offline-trial/bots'
import { CAMPAIGN_VERSION, canonical, startDuel, applyTurn, type Catalog, type Campaign, type Snapshot } from '../lib/offline-campaign/model'
import { campaignOwner, hideCampaign, loadCampaign, prepareCampaign, saveCampaign } from '../lib/offline-campaign/storage'
import { playSound } from '../lib/sounds'
import { botThinkMs } from '../lib/bot-presentation'
import { synchronize } from '../lib/offline-campaign/sync'

declare const CAMPAIGN_CATALOG: Catalog, CATALOG_HASH: string
const root = createRoot(document.getElementById('root')!)
let campaign: Campaign | undefined, running = false, busy = true, status = ''
let timer: ReturnType<typeof setTimeout> | undefined
function message(text: string) { status = text; render() }
function render() {
  clearTimeout(timer)
  root.render(<OfflineApp campaign={campaign} running={running} busy={busy} status={status} onPrepare={() => void prepare()}
    onSync={() => void sync(true)}
    onStart={start} onResume={() => { if (!busy) { running = true; render() } }}
    onLeave={() => { running = false; render() }} onAction={act} />)
  const trial = campaign?.trial
  if (busy || !running || !trial || document.hidden || trial.game.status !== 'playing') return
  const g = trial.game
  if (g.awaiting_deal) timer = setTimeout(() => void act({ player: trial.owner, type: 'advance_hand' }), g.envido_reveal ? 2600 : 1800)
  else if (g.envido_state.status === 'declaring' ? g.envido_state.declare_turn === g.player2_id : g.current_turn === g.player2_id) timer = setTimeout(() => void act(), botThinkMs(g, trial.owner))
}
async function act(action?: Action) {
  if (!campaign?.trial || busy || !running || document.hidden) return
  busy = true; render()
  try {
    const trial = action ? step(campaign.trial, action) : botStep(campaign.trial)
    const next = applyTurn(campaign, trial, new Date().toISOString())
    await saveCampaign(next, campaign); campaign = next
    if (trial.result) playSound(trial.result.winner === campaign.owner ? 'gano' : 'perdi')
    else if (action?.type === 'play_card' || trial.actions.at(-1)?.action.type === 'play_card') playSound('carta')
    savedMessage()
  } catch (error) { running = false; campaign = await loadCampaign(campaign.owner); message('No avanzamos: ' + errorText(error)) }
  finally { busy = false; render() }
  if (campaign?.trial?.game.status === 'finished') void sync()
}
function errorText(error: unknown) {
  if (error instanceof DOMException) return error.name === 'QuotaExceededError'
    ? 'No hay espacio para guardar. Liberá espacio y reintentá.' : 'No se pudo completar la operación. Reintentá.'
  if (error instanceof TypeError) return 'No se pudo cargar Historia. Conectate y reintentá.'
  return error instanceof Error ? error.message : 'No se pudo guardar. Reintentá.'
}
function savedMessage() { message('Avance guardado en este dispositivo · ' + (campaign?.pending.length ?? 0) + ' partidas por sincronizar.'
  + (campaign?.legacy_results?.length ? ' Ensayos del prototipo conservados sin premios oficiales.' : '')) }
async function identity() {
  const response = await fetch('/api/android/historia?identity=1', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (response.status === 401 || response.status === 403) { await hideCampaign(); campaign = undefined; running = false; return null }
  if (!response.ok) throw new Error('No se pudo comprobar la cuenta.')
  const data = await response.json(), active = await campaignOwner()
  if (typeof data.userId !== 'string') throw new Error('Cuenta no compatible.')
  if (active && active !== data.userId) { await hideCampaign(); campaign = undefined; running = false }
  return data.userId as string
}
async function prepare() {
  if (busy) return
  busy = true; clearTimeout(timer); render(); message('Preparando Historia…')
  try {
    const owner = await identity(); render()
    if (!owner) throw new Error('Entrá con tu cuenta para descargar Historia.')
    const response = await fetch('/api/android/historia', { cache: 'no-store', signal: AbortSignal.timeout(30000) })
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { await hideCampaign(); campaign = undefined; running = false }
      const data = await response.json(); throw new Error(data.error ?? 'No se pudo descargar el avance.')
    }
    const snapshot = await response.json() as Snapshot
    if (snapshot.userId !== owner) { await hideCampaign(); campaign = undefined; running = false; throw new Error('La cuenta cambió. Volvé a preparar Historia.') }
    if (snapshot.version !== CAMPAIGN_VERSION || snapshot.engine_version !== BOTS_VERSION
      || canonical(snapshot.catalog) !== canonical(CAMPAIGN_CATALOG)) throw new Error('El catálogo cambió. Actualizá Historia.')
    await navigator.serviceWorker.register('/sw.js')
    const registration = await navigator.serviceWorker.ready
    const digest = await new Promise<string>((resolve, reject) => {
      const channel = new MessageChannel()
      let timeout: ReturnType<typeof setTimeout>
      const tick = () => { clearTimeout(timeout); timeout = setTimeout(() => { channel.port1.close(); reject(new Error('La descarga no terminó. Reintentá.')) }, 30000) }
      tick()
      channel.port1.onmessage = ({ data }) => {
        if (data.progress) { message('Descargando Historia · ' + Math.round(data.progress / data.total * 100) + '%'); tick(); return }
        clearTimeout(timeout); channel.port1.close()
        if (data.ok) resolve(data.digest); else reject(new Error('La descarga no terminó. Se conserva el guardado anterior.'))
      }
      registration.active!.postMessage({ type: 'HISTORIA_PREPARE', catalogHash: CATALOG_HASH }, [channel.port2])
    })
    // Confirmar de nuevo la identidad después de una descarga larga.
    if (await identity() !== owner) throw new Error('La cuenta cambió durante la descarga. Volvé a preparar Historia.')
    campaign = await prepareCampaign(snapshot, digest); running = false
    await navigator.storage?.persist?.().catch(() => false); message('Historia lista para jugar sin internet. ' + campaign.pending.length + ' partidas pendientes conservadas.')
  } catch (error) { message(errorText(error)) }
  finally { busy = false; render() }
  void sync()
}
async function sync(manual = false) {
  if (busy || !navigator.onLine || !campaign?.pending.length || campaign.trial?.game.status === 'playing') return
  if (!manual && campaign.pending.some(p => !p.grant_id)) return
  busy = true; render(); const previous = campaign
  try {
    if (await identity() !== previous.owner) throw new Error('Entrá con la cuenta de estas partidas para sincronizar.')
    message('Confirmando partidas y premios…')
    const next = await synchronize(previous, async (records, complete) => {
      const response = await fetch('/api/android/historia', { method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records, complete }), signal: AbortSignal.timeout(60000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'No se pudo confirmar el avance. Reintentá.')
      if (data.snapshot && canonical(data.snapshot.catalog) !== canonical(CAMPAIGN_CATALOG)) throw new Error('El catálogo cambió. Actualizá Historia; se conservan las partidas.')
      return data
    })
    if (await identity() !== previous.owner) throw new Error('La cuenta cambió. Conservamos la cola para su dueño.')
    await saveCampaign(next, previous); campaign = next
    message('Partidas confirmadas. Tus puntos y monedas ya están acreditados.')
  } catch (error) { message(errorText(error)) }
  finally { busy = false; render() }
}
async function start(rivalId: string) {
  if (!campaign || busy) return
  busy = true; render()
  try {
    const next = startDuel(campaign, rivalId, crypto.getRandomValues(new Uint32Array(1))[0], crypto.randomUUID())
    await saveCampaign(next, campaign); campaign = next; running = true; savedMessage()
  } catch (error) { message(errorText(error)); throw error }
  finally { busy = false; render() }
}
async function reload() {
  if (busy) return
  busy = true; clearTimeout(timer); render()
  try {
    if (navigator.onLine) { try { await identity() } catch { /* Continuar con la identidad preparada si no hay red. */ } }
    const owner = await campaignOwner()
    if (owner !== campaign?.owner) { running = false }
    campaign = owner ? await loadCampaign(owner) : undefined
    if (campaign && (campaign.version !== CAMPAIGN_VERSION || campaign.official.engine_version !== BOTS_VERSION)) {
      campaign = undefined; running = false; message('El guardado necesita su versión anterior. Se conserva en este dispositivo.'); return
    }
    if (campaign) savedMessage(); else message('Conectate una vez y descargá Historia con tu cuenta.')
  } finally { busy = false; render() }
  void sync()
}
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else void reload() })
window.addEventListener('focus', () => void reload()); window.addEventListener('online', () => void reload())
window.addEventListener('storage', event => { if (event.key?.includes('auth-token')) void reload() })
busy = false; void reload().catch(() => { message('No se pudo abrir el guardado. Reintentá antes de jugar.'); render() })
