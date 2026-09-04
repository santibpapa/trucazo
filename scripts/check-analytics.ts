import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  classifyAcquisition,
  describeUserAgent,
  isLikelyBot,
} from '../src/lib/analytics/source'
import { isTrustedAnalyticsRequest } from '../src/lib/analytics/request'

assert.deepEqual(classifyAcquisition({ siteHost: 'trucazo.com.ar' }), {
  source: 'Directo / sin identificar',
  medium: 'directo',
  campaign: null,
  content: null,
  referrerHost: null,
})

assert.equal(classifyAcquisition({
  referrerHost: 'www.google.com.ar',
  siteHost: 'trucazo.com.ar',
}).source, 'Google')

assert.deepEqual(classifyAcquisition({
  utmSource: 'trucazo_email',
  utmMedium: 'email',
  utmCampaign: 'reactivacion-primera-partida',
  siteHost: 'trucazo.com.ar',
}), {
  source: 'Email de Trucazo',
  medium: 'email',
  campaign: 'reactivacion-primera-partida',
  content: null,
  referrerHost: null,
})

assert.equal(classifyAcquisition({
  referrerHost: 'chatgpt.com',
  siteHost: 'trucazo.com.ar',
}).source, 'ChatGPT')

assert.deepEqual(describeUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
), { device: 'Celular', browser: 'Safari', operatingSystem: 'iOS / iPadOS' })

assert.equal(isLikelyBot('Mozilla/5.0 Googlebot/2.1'), true)
assert.equal(isLikelyBot('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile Safari/604.1'), false)

assert.equal(isTrustedAnalyticsRequest({
  requestUrl: 'https://www.trucazo.com.ar/api/analytics',
  origin: 'https://www.trucazo.com.ar',
  fetchSite: 'same-origin',
}), true)
assert.equal(isTrustedAnalyticsRequest({
  requestUrl: 'https://www.trucazo.com.ar/api/analytics',
  origin: 'https://sitio-ajeno.example',
  fetchSite: 'cross-site',
}), false)
assert.equal(isTrustedAnalyticsRequest({
  requestUrl: 'https://www.trucazo.com.ar/api/analytics',
  origin: null,
  fetchSite: null,
}), false)

const objectiveEvents = [
  'objectives_viewed',
  'objective_progressed',
  'objective_completed',
  'objective_reward_claimed',
  'weekly_challenge_completed',
  'streak_continued',
  'streak_protection_used',
]
const clientSource = readFileSync(new URL('../src/lib/analytics/client.ts', import.meta.url), 'utf8')
const routeSource = readFileSync(new URL('../src/app/api/analytics/route.ts', import.meta.url), 'utf8')
const migrationSource = readFileSync(
  new URL('../supabase/migrations/20260904150348_ciclo_retorno.sql', import.meta.url),
  'utf8',
)
for (const eventName of objectiveEvents) {
  assert.ok(clientSource.includes(`'${eventName}'`), `${eventName} falta en el cliente`)
  assert.ok(routeSource.includes(`'${eventName}'`), `${eventName} falta en la API`)
  assert.ok(migrationSource.includes(`'${eventName}'`), `${eventName} falta en la base`)
}

console.log('Analítica: atribución, dispositivos, bots y eventos de objetivos correctos.')
