// Guardados finales de 06 y descarga QA3 de 08; no activa ni envía resultados.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const expected = [
  ['testin', '29476689-d94b-4c1f-b7e7-5b23123de001', 299, '3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1'],
  ['santib', '9370e685-9dd0-4fab-a1a4-721a60f7d3dd', 0, '4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e'],
  ['androidqa1', 'b00d207b-8d36-4b59-8479-346b91ce762d', 46, '1c01989ab72beebedd2cea02e3c691d8c42fb635ce09020854e3ca39e531f99a'],
  ['androidqa2', 'ebf2c130-304d-431f-9754-110715ca2892', 45, 'be4d53d687c8880b28d0d3f4b570127f677155becc0e26e89aa012ecb6d4d7d7'],
  ['androidqa3', '2c9dd1e8-a39b-41e7-af2a-f67502691795', 1, '95048fc6d7a300b74df251d1d7c9a657c96b898ae23f4776b67ebe66a73d1f6c'],
]
const c = await deviceCDP()
try {
  const results = []
  for (const [username, owner, revision, sha256] of expected) {
    const result = await c.evaluate(`(async()=>{
      const state=await Capacitor.Plugins.CampaignStore.read({owner:${JSON.stringify(owner)}});
      if(!state.body)throw Error('Falta el guardado');
      const g=JSON.parse(state.body),bytes=new TextEncoder().encode(state.body);
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      return {owner:g.owner,revision:g.revision,sha256:hash,pending:g.pending.length,receipts:g.receipts?.length??0,coins:g.official.coins,points:g.official.points};
    })()`)
    assert.equal(result.revision, revision); assert.equal(result.sha256, sha256); assert.equal(result.pending, 0)
    results.push({ username, ...result })
  }
  await writeFile('android/generated/android-08-preserved.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results))
} finally { c.close() }
