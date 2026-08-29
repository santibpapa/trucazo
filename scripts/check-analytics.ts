import assert from 'node:assert/strict'
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

console.log('Analítica: atribución, dispositivos y filtro de bots correctos.')
