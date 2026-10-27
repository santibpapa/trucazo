// Renueva la sesión propia de QA1 por Auth real; no exporta tokens ni cambia el reloj.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { connectReleaseDevice } from './release-device.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'

const c = await connectReleaseDevice(), owner = (await loadQaAccounts()).accounts[0].id
const summary = () => c.evaluate(`(async()=>{
  const s=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null');
  if(!s)return null;
  const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s.refresh_token));
  return {owner:s.user.id,expires:s.expires_at,refreshHash:Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join(''),lobby:document.body.innerText.includes('Mesas disponibles')};
})()`)
const before = await summary(); assert.equal(before.owner, owner)
await c.evaluate(`(()=>{const k='trucazo:mobile:auth:v1',s=JSON.parse(localStorage.getItem(k));s.expires_at=1;localStorage.setItem(k,JSON.stringify(s));setTimeout(()=>location.reload(),300);return true})()`)
let after
for (let i = 0; i < 80; i++) {
  await new Promise(r => setTimeout(r, 250))
  after = await summary().catch(() => null)
  if (after?.lobby && after.expires > Date.now() / 1000 && after.refreshHash !== before.refreshHash) break
}
assert.equal(after?.owner, owner); assert.equal(after.lobby, true)
assert.ok(after.expires > Date.now() / 1000); assert.notEqual(after.refreshHash, before.refreshHash)
const report = { scope: 'Release0.17.1/19 físico, Auth Supabase HTTPS real; vencimiento local adelantado, reloj del sistema intacto',
  sameOwner: true, refreshRotated: true, futureExpiry: true, usableLobby: true }
await writeFile('android/generated/android-17-phone-renewal.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
