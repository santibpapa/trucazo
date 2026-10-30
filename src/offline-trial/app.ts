import { createTrial, legalActions, step, botStep, BOT, VERSION, type Trial, type Action } from '../lib/offline-trial/engine'
import { activeOwner, setOwner, loadTrial, saveTrial } from '../lib/offline-trial/storage'
import { getCardImage, type Card } from '../lib/truco'

declare const TRIAL_IMAGES: Record<string, string>
const el = (id: string) => document.getElementById(id)!
const labels: Record<string, string> = { envido: 'Envido', real_envido: 'Real envido', falta_envido: 'Falta envido',
  truco: 'Truco', retruco: 'Retruco', vale_cuatro: 'Vale cuatro', tengo: 'Tengo', son_buenas: 'Son buenas', mazo: 'Al mazo' }
let trial: Trial | undefined, owner: string | undefined, running = false, busy = false
let timer: ReturnType<typeof setTimeout> | undefined
function message(text: string) { el('status').textContent = text }
function button(text: string, run: () => void, parent = el('actions')) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text
  b.disabled = busy; b.onclick = run; parent.append(b)
}
function image(card: Card) {
  const img = document.createElement('img')
  img.src = TRIAL_IMAGES[getCardImage(card)]; img.alt = card.value + ' de ' + card.suit
  return img
}
function actionLabel(a: Action) {
  if (a.type === 'respond_envido' || a.type === 'respond_truco') return a.accept ? 'Quiero' : 'No quiero'
  if (a.type === 'irse_al_mazo') return 'Al mazo'
  if (a.type === 'advance_hand') return 'Siguiente mano'
  if (a.type === 'envido_say' && a.value === 'tengo') {
    // Los tantos los calcula el motor al aceptar, no desde la pantalla.
    return 'Tengo · declarar tantos'
  }
  return labels[a.value!] ?? a.type
}
function render() {
  clearTimeout(timer)
  el('welcome').hidden = running; el('table').hidden = !running
  ;(el('prepare') as HTMLButtonElement).disabled = busy
  ;(el('start15') as HTMLButtonElement).disabled = busy || !owner || !!trial && trial.game.status !== 'finished'
  ;(el('start30') as HTMLButtonElement).disabled = busy || !owner || !!trial && trial.game.status !== 'finished'
  el('resume').hidden = !trial
  ;(el('resume') as HTMLButtonElement).disabled = busy
  el('saved').textContent = trial ? 'Partida guardada: ' + trial.game.player1_score + ' a ' + trial.game.player2_score
    + ' · mano ' + trial.game.hand_number : owner ? 'Ensayo listo en este dispositivo.' : 'Conectate y prepará el ensayo con tu cuenta.'
  if (!running || !trial) return
  const g = trial.game
  el('score').textContent = 'Vos ' + g.player1_score + ' — ' + g.player2_score + ' Tobías'
  el('hand-info').textContent = 'A ' + g.target_score + ' · mano ' + g.hand_number + ' · ' + (g.mano_player === owner ? 'Sos mano' : 'Tobías es mano')
  el('played').replaceChildren()
  for (let round = 1; round <= 3; round++) {
    const pair = document.createElement('div'); pair.className = 'pair'
    for (const player of [BOT, owner]) {
      const c = g.played_cards.find(c => c.round === round && c.player_id === player)
      const slot = document.createElement('div'); slot.className = 'slot'
      if (c) slot.append(image(c.card)); pair.append(slot)
    }
    el('played').append(pair)
  }
  el('reveal').replaceChildren()
  if (g.envido_reveal) {
    const label = document.createElement('span')
    label.textContent = (g.envido_reveal.player_id === owner ? 'Tus' : 'Sus') + ' cartas del envido'
    el('reveal').append(label, ...g.envido_reveal.cards.map(image))
  }
  el('cards').replaceChildren(); el('actions').replaceChildren()
  const actions = legalActions(trial, owner!)
  for (const card of trial.hands[0]) {
    const b = document.createElement('button'); b.className = 'card'; b.type = 'button'
    b.setAttribute('aria-label', 'Jugar ' + card.value + ' de ' + card.suit)
    const action = actions.find(a => a.type === 'play_card' && a.card?.suit === card.suit && a.card.value === card.value)
    b.disabled = busy || !action; b.append(image(card)); b.onclick = () => { if (action) void act(action) }; el('cards').append(b)
  }
  for (const a of actions.filter(a => a.type !== 'play_card')) button(actionLabel(a), () => void act(a))
  const es = g.envido_state, tr = g.truco_state
  let text = 'Tu turno'
  if (g.status === 'finished') text = g.winner_id === owner ? '¡Ganaste el ensayo!' : 'Esta vez ganó Tobías'
  else if (g.awaiting_deal) text = 'Mano terminada · puntos guardados'
  else if (es.status === 'declaring') text = es.mano_declared == null ? 'La mano declara primero'
    : 'La mano tiene ' + es.mano_declared + ' · falta responder'
  else if (['envido', 'real_envido', 'falta_envido'].includes(es.status)) text = labels[es.status] + ' · ' + es.value + ' puntos'
  else if (['truco', 'retruco', 'vale_cuatro'].includes(tr.status)) text = labels[tr.status] + ' · falta responder'
  else if (g.current_turn === BOT) text = 'Tobías está pensando…'
  else if (es.status === 'accepted') text = 'Envido: vos ' + (es.player1_points ?? 'son buenas') + ' · Tobías ' + (es.player2_points ?? 'son buenas')
  el('call').textContent = text
  el('new-game').hidden = g.status !== 'finished'
  if (!busy && !document.hidden && g.status === 'playing' && !g.awaiting_deal
    && (es.status === 'declaring' ? es.declare_turn === BOT : g.current_turn === BOT)) {
    timer = setTimeout(() => void act(), 650)
  }
}
async function act(action?: Action) {
  if (!trial || busy || !running || document.hidden) return
  busy = true; render()
  try {
    const next = action ? step(trial, action) : botStep(trial)
    await saveTrial(next, trial)
    trial = next
    message('Sincronización y premios todavía no habilitados · ensayo guardado')
  } catch (error) {
    running = false
    message('No avanzamos: ' + (error instanceof Error ? error.message : 'falló el guardado'))
    trial = owner ? await loadTrial(owner) : undefined
  } finally { busy = false; render() }
}
async function prepare() {
  busy = true; render(); message('Preparando el ensayo…')
  try {
    const response = await fetch('/api/android/tobias', { cache: 'no-store' })
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { running = false; owner = undefined; trial = undefined; await setOwner(null) }
      throw new Error('Entrá con tu cuenta y volvé a preparar el ensayo.')
    }
    const identity = await response.json()
    if (identity.version !== VERSION || typeof identity.userId !== 'string') throw new Error('Paquete no compatible.')
    if (owner && owner !== identity.userId) { running = false; owner = undefined; trial = undefined; await setOwner(null); render() }
    await navigator.serviceWorker.register('/sw.js')
    const registration = await navigator.serviceWorker.ready
    await new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel()
      const timeout = setTimeout(() => reject(new Error('La descarga no terminó. Reintentá.')), 30000)
      channel.port1.onmessage = ({ data }) => { clearTimeout(timeout); channel.port1.close()
        if (data.ok) resolve(); else reject(new Error('La descarga no terminó. Se conserva el guardado anterior.')) }
      registration.active!.postMessage({ type: 'TOBIAS_PREPARE' }, [channel.port2])
    })
    await setOwner(identity.userId)
    owner = identity.userId; trial = await loadTrial(owner!)
    const persistent = await navigator.storage?.persist?.()
    message(persistent ? 'Ensayo descargado · guardado persistente concedido' : 'Ensayo descargado · guardado local disponible')
  } catch (error) { message(error instanceof Error ? error.message : 'No se pudo preparar el ensayo.') }
  finally { busy = false; render() }
}
async function start(target: 15 | 30) {
  if (!owner || busy || trial && trial.game.status !== 'finished') return
  busy = true; render()
  try {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    const next = createTrial(owner, target, seed, crypto.randomUUID())
    await saveTrial(next, trial); trial = next; running = true; message('Partida guardada en este dispositivo')
  } catch { message('No se pudo guardar. La partida no comenzó.') }
  finally { busy = false; render() }
}
el('prepare').onclick = () => void prepare()
el('start15').onclick = () => void start(15)
el('start30').onclick = () => void start(30)
el('resume').onclick = () => { running = true; render() }
el('pause').onclick = el('new-game').onclick = () => { running = false; render() }
el('portrait').setAttribute('src', TRIAL_IMAGES['/personajes/novato.webp'])
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else void reload() })
window.addEventListener('focus', () => void reload())
async function reload() {
  if (busy) return
  const active = await activeOwner()
  if (active !== owner) { owner = active; running = false }
  trial = owner ? await loadTrial(owner) : undefined
  render()
}
async function boot() {
  // La identidad del servidor se consulta solo al abrir/preparar; nunca en turnos.
  await reload()
  if (navigator.onLine) {
    busy = true; render()
    try {
      const response = await fetch('/api/android/tobias', { cache: 'no-store' })
      if (response.status === 401 || response.status === 403) {
        running = false; owner = undefined; trial = undefined; await setOwner(null); render(); return
      }
      if (response.ok) {
        const identity = await response.json()
        if (owner && owner !== identity.userId) { running = false; owner = undefined; trial = undefined; await setOwner(null); render() }
      }
    } catch { /* Sin red, se conserva la identidad preparada; no autoriza premios. */ }
    finally { busy = false; render() }
  }
}
void boot().catch(() => { message('No se pudo abrir el guardado local. Reintentá antes de jugar.'); render() })
