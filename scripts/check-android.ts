import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { androidAssetLinks, parseProbeSubscription } from '../src/lib/android-probe'
import { isAndroidEntry, loginDestination } from '../src/lib/android-entry'

test('asociación vacía sin certificado y huellas reales normalizadas', () => {
  const fingerprint = Array(32).fill('ab').join(':')
  assert.deepEqual(androidAssetLinks('ar.com.trucazo.prototype', undefined), [])
  assert.deepEqual(androidAssetLinks('ar.com.trucazo.prototype', 'inventado'), [])
  const links = androidAssetLinks('ar.com.trucazo.prototype', `${fingerprint}, ${fingerprint}`)
  assert.equal(links[0].target.package_name, 'ar.com.trucazo.prototype')
  assert.deepEqual(links[0].target.sha256_cert_fingerprints, [fingerprint.toUpperCase()])
})

test('push de prueba rechaza URLs arbitrarias, puertos, credenciales y claves inválidas', () => {
  const subscription = { endpoint: 'https://fcm.googleapis.com/wp/example:token', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } }
  assert.deepEqual(parseProbeSubscription(subscription), subscription)
  for (const endpoint of [
    'http://fcm.googleapis.com/wp/a', 'https://127.0.0.1/wp/a',
    'https://fcm.googleapis.com.evil.test/wp/a', 'https://fcm.googleapis.com:8443/wp/a',
    'https://name:pass@fcm.googleapis.com/wp/a', 'https://fcm.googleapis.com/wp/a?redirect=1',
    'https://fcm.googleapis.com/wp/a#bad', 'https://fcm.googleapis.com/other',
  ]) assert.equal(parseProbeSubscription({ ...subscription, endpoint }), null, endpoint)
  assert.equal(parseProbeSubscription({ ...subscription, keys: { auth: 'a', p256dh: 'b' } }), null)
  assert.equal(parseProbeSubscription(null), null)
})

test('la entrada Android queda por pestaña; la web conserva destino y modo invitado', () => {
  const state = new Map<string, string>()
  const tab = { location: { pathname: '/', search: '' }, sessionStorage: {
    setItem: (key: string, value: string) => state.set(key, value),
    getItem: (key: string) => state.get(key),
  } }
  Object.assign(globalThis, { window: tab, document: { referrer: '' }, sessionStorage: tab.sessionStorage })
  try {
    assert.equal(isAndroidEntry(), false)
    assert.equal(loginDestination(), '/lobby')
    tab.location.pathname = '/login'; tab.location.search = '?android=1'
    assert.equal(isAndroidEntry(), true)
    tab.location.pathname = '/register'; tab.location.search = ''
    assert.equal(loginDestination(), '/android')
    state.clear()
    assert.equal(loginDestination(), '/lobby')
  } finally {
    Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'document')
    Reflect.deleteProperty(globalThis, 'sessionStorage')
  }
})

test('el worker muestra solo la notificación de prueba y abre su destino fijo', async () => {
  const listeners = new Map<string, (event: any) => void>()
  const notifications: Array<{ title: string; options: any }> = []
  const opened: string[] = []
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
      registration: { showNotification: async (title: string, options: any) => { notifications.push({ title, options }) } },
      clients: { openWindow: async (url: string) => { opened.push(url) } } },
  })
  let pending: Promise<unknown> | undefined
  for (const payload of [{ type: 'other' }, { type: 'android-probe', url: 'https://evil.test' }]) {
    listeners.get('push')!({ data: { json: () => payload }, waitUntil: (promise: Promise<unknown>) => { pending = promise } })
    await pending
  }
  listeners.get('push')!({ data: { json: () => { throw new Error('malformed') } } })
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0].title, 'Trucazo · prueba Android')
  let closed = false
  listeners.get('notificationclick')!({ notification: { data: notifications[0].options.data, close: () => { closed = true } },
    waitUntil: (promise: Promise<unknown>) => { pending = promise } })
  await pending
  assert.equal(closed, true)
  assert.deepEqual(opened, ['/android/probe.html'])
})
