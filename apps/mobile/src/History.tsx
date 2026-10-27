import { useEffect, useState } from 'react'
import OfflineApp from '../../../src/offline-campaign/OfflineApp'
import { step, botStep, type Action } from '../../../src/lib/offline-trial/engine'
import { BOTS_VERSION } from '../../../src/lib/offline-trial/bots'
import { CAMPAIGN_VERSION, canonical, startDuel, applyTurn, type Catalog, type Campaign, type Snapshot, type Receipt } from '../../../src/lib/offline-campaign/model'
import { activateCampaign, loadCampaign, prepareCampaign, saveCampaign } from './campaign-storage'
import { apiRequest, cachedSession } from './services'
import { playSound } from '../../../src/lib/sounds'
import { botThinkMs } from '../../../src/lib/bot-presentation'
import { synchronize } from '../../../src/lib/offline-campaign/sync'
import { Link } from './navigation'

declare const MOBILE_CAMPAIGN_CATALOG: Catalog
type Manifest = { digest: string; assets: { path: string; sha256: string }[] }
type View = React.ComponentProps<typeof OfflineApp>
const hash = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')

export default function History({ owner }: { owner: string }) {
  const [view, setView] = useState<View>()
  useEffect(() => {
    let campaign: Campaign | undefined, running = false, busy = true, disposed = false, status = 'Abriendo tu Historia…', error = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const isOwner = () => !disposed && cachedSession()?.user.id === owner
    function render() {
      clearTimeout(timer)
      if (disposed) return
      setView({ campaign, running, busy, status, error, BackLink: Link, lobbyHref: '#/lobby', onlineHref: navigator.onLine ? '#/historia' : undefined,
        onPrepare: () => { void prepare() }, onSync: () => { void sync() }, onStart: start, onAction: act,
        onResume: () => { if (!busy) { running = true; render() } }, onLeave: () => { running = false; render() } })
      const trial = campaign?.trial
      if (busy || !running || !trial || document.hidden || trial.game.status !== 'playing') return
      const g = trial.game
      if (g.awaiting_deal) timer = setTimeout(() => { void act({ player: owner, type: 'advance_hand' }) }, g.envido_reveal ? 2600 : 1800)
      else if (g.envido_state.status === 'declaring' ? g.envido_state.declare_turn === g.player2_id : g.current_turn === g.player2_id) timer = setTimeout(() => { void act() }, botThinkMs(g, owner))
    }
    function saved() { status = 'Avance guardado en este dispositivo · ' + (campaign?.pending.length ?? 0) + ' partidas por confirmar.'
      + (campaign?.pending.length && campaign.trial?.game.status === 'playing' ? ' Terminá la partida abierta para confirmar los premios.' : '') }
    function failed(failure: unknown) { error = failure instanceof Error ? failure.message : 'No se pudo guardar. La jugada no avanzó.'; status = error }
    async function act(action?: Action) {
      if (!campaign?.trial || busy || !running || document.hidden || !isOwner()) return
      busy = true; error = ''; render()
      try {
        const trial = action ? step(campaign.trial, action) : botStep(campaign.trial)
        const next = applyTurn(campaign, trial, new Date().toISOString())
        await saveCampaign(next, campaign)
        if (!isOwner()) return
        campaign = next; saved()
        if (trial.result) playSound(trial.result.winner === owner ? 'gano' : 'perdi')
        else if (action?.type === 'play_card' || trial.actions.at(-1)?.action.type === 'play_card') playSound('carta')
      } catch (failure) { running = false; failed(failure); try { campaign = await loadCampaign(owner) } catch { /* Conservar el estado anterior visible. */ } }
      finally { busy = false; render() }
      if (campaign?.trial?.result) void sync()
    }
    async function start(id: string) {
      if (!campaign || busy || !isOwner()) return
      busy = true; error = ''; render()
      try {
        const next = startDuel(campaign, id, crypto.getRandomValues(new Uint32Array(1))[0], crypto.randomUUID())
        await saveCampaign(next, campaign)
        if (isOwner()) { campaign = next; running = true; saved() }
      } catch (failure) { failed(failure); throw failure }
      finally { busy = false; render() }
    }
    async function sync() {
      if (busy || !isOwner() || !navigator.onLine || !campaign?.pending.length || campaign.trial?.game.status === 'playing') return
      busy = true; error = ''; status = 'Confirmando partidas y premios…'; render()
      const previous = campaign
      try {
        const next = await synchronize(previous, async (records, complete) => {
          if (!isOwner()) throw new Error('La cuenta cambió. Conservamos las partidas de su dueño.')
          const reply = await apiRequest<{ receipts: Receipt[]; snapshot: Snapshot | null }>('/api/android/historia', { records, complete })
          if (!isOwner()) throw new Error('La cuenta cambió. Conservamos las partidas de su dueño.')
          if (reply.snapshot && (reply.snapshot.userId !== owner || reply.snapshot.version !== CAMPAIGN_VERSION
            || reply.snapshot.engine_version !== BOTS_VERSION || !reply.snapshot.grant
            || canonical(reply.snapshot.catalog) !== canonical(MOBILE_CAMPAIGN_CATALOG))) {
            throw new Error('La confirmación necesita otra versión. Conservamos las partidas; actualizá la app.')
          }
          return reply
        })
        if (!isOwner()) return
        await saveCampaign(next, previous)
        if (!isOwner()) return
        campaign = next; status = 'Partidas confirmadas. Tus puntos y monedas ya están acreditados.'
      } catch (failure) {
        failed(failure)
        try { campaign = await loadCampaign(owner) } catch { /* Conservar la cola anterior si no se pudo leer. */ }
      } finally { busy = false; render() }
    }
    async function prepare() {
      if (busy || !isOwner()) return
      busy = true; error = ''; status = 'Preparando Historia…'; render()
      try {
        if (!navigator.onLine) throw new Error('Conectate una vez para descargar Historia.')
        // Los recursos ya viajan en el APK. Verificar todos antes de cambiar el guardado.
        const response = await fetch('/historia-manifest.json')
        if (!response.ok) throw new Error('Faltan recursos de Historia. Reinstalá la actualización sin borrar datos.')
        const manifest = await response.json() as Manifest
        for (const asset of manifest.assets) {
          const file = await fetch(asset.path)
          if (!file.ok || await hash(await file.arrayBuffer()) !== asset.sha256) throw new Error('Historia está incompleta. Conservamos el guardado anterior.')
        }
        const snapshot = await apiRequest<Snapshot>('/api/android/historia')
        if (!isOwner() || snapshot.userId !== owner) throw new Error('La cuenta cambió. Conservamos el guardado anterior.')
        if (snapshot.version !== CAMPAIGN_VERSION || snapshot.engine_version !== BOTS_VERSION || !snapshot.grant
          || canonical(snapshot.catalog) !== canonical(MOBILE_CAMPAIGN_CATALOG)) throw new Error('El catálogo cambió. Actualizá la app; se conserva el guardado.')
        campaign = await prepareCampaign(snapshot, manifest.digest); running = false
        status = 'Historia lista para jugar sin internet. ' + campaign.pending.length + ' partidas pendientes conservadas.'
      } catch (failure) { failed(failure) }
      finally { busy = false; render() }
      void sync()
    }
    async function reload() {
      if (busy || !isOwner()) return
      busy = true; render()
      try { campaign = await activateCampaign(owner); if (campaign) saved(); else status = 'Descargá Historia una vez con tu cuenta.' }
      catch (failure) { running = false; failed(failure) }
      finally { busy = false; render() }
      void sync()
    }
    const visibility = () => { if (document.hidden) clearTimeout(timer); else { void reload() } }
    const back = (event: Event) => { if (running) { event.preventDefault(); running = false; render() } }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('mobile:back', back)
    window.addEventListener('mobile:refresh', reload)
    window.addEventListener('online', reload)
    busy = false; void reload()
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('mobile:back', back); window.removeEventListener('mobile:refresh', reload); window.removeEventListener('online', reload) }
  }, [owner])
  return view ? <OfflineApp {...view} /> : <main className="flex min-h-dvh items-center justify-center" role="status">Abriendo tu Historia…</main>
}
