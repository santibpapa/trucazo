import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync('src/lib/campaign-rewarded-ad.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

function setup({ supported = true } = {}) {
  const listeners = new Map()
  const timers = new Map()
  let timerId = 0
  let destroyed = 0
  let shown = 0
  let granted = 0
  const slot = { addService() {} }
  const service = {
    addEventListener(name, fn) { listeners.set(name, fn) },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name) },
  }
  const tag = {
    cmd: { push(fn) { fn() } },
    enums: { OutOfPageFormat: { REWARDED: 'rewarded' } },
    defineOutOfPageSlot(unit, format) {
      assert.equal(unit, '/123456/campaign_life')
      assert.equal(format, 'rewarded')
      return supported ? slot : null
    },
    pubads() { return service }, enableServices() {}, display() { shown++ }, destroySlots() { destroyed++ },
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports, window: { googletag: tag }, document: { getElementById() { return {} } },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
  })
  return {
    start: () => exports.showCampaignRewardedAd('/123456/campaign_life', () => { granted++ }),
    event: (name, fields = {}) => listeners.get(name)?.({ slot, ...fields }),
    timeout: () => { for (const fn of [...timers.values()]) fn() },
    state: () => ({ destroyed, shown, granted, listeners: listeners.size }),
  }
}

let sdk = setup()
assert.equal(sdk.state().shown, 0, 'no carga anuncio sin elección')
let result = sdk.start()
let visible = 0
sdk.event('rewardedSlotReady', { makeRewardedVisible() { visible++ } })
assert.equal(visible, 1)
sdk.event('rewardedSlotGranted')
sdk.event('rewardedSlotGranted')
assert.equal(sdk.state().granted, 1, 'callback duplicado acredita una vez')
sdk.event('rewardedSlotClosed')
assert.equal(await result, true)
assert.equal(sdk.state().listeners, 0)
assert.equal(sdk.state().destroyed, 1)

sdk = setup(); result = sdk.start()
sdk.event('rewardedSlotClosed')
assert.equal(await result, false)
assert.equal(sdk.state().granted, 0, 'cerrar no acredita')

sdk = setup(); result = sdk.start()
sdk.event('slotRenderEnded', { isEmpty: true })
await assert.rejects(result, /No hay un anuncio/)
assert.equal(sdk.state().granted, 0)

sdk = setup({ supported: false })
await assert.rejects(sdk.start(), /no admite/)

sdk = setup(); result = sdk.start(); sdk.timeout()
await assert.rejects(result, /No hay un anuncio/)
assert.equal(sdk.state().listeners, 0)
assert.equal(sdk.state().granted, 0, 'esperar no acredita una vista')
console.log('Anuncios de vidas: elección, recompensa, duplicados, cierre, sin inventario, incompatibilidad y timeout OK.')
