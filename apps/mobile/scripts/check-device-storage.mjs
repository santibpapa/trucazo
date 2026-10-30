import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'

const harness = (await build({ stdin: { contents: `
  import { registerPlugin } from './apps/mobile/node_modules/@capacitor/core';
  import { createCampaign } from './src/lib/offline-campaign/model';
  globalThis.storageProbe = { store: registerPlugin('CampaignStore'), createCampaign };
`, resolveDir: process.cwd() }, bundle: true, write: false, target: 'chrome100' })).outputFiles[0].text
const c = await deviceCDP(), baseline = 'android/generated/android-04-storage-before.json'
try {
  await c.evaluate(harness)
  const result = await c.evaluate(`(async()=>{
    const owner=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id;
    if(!owner)throw Error('Falta la sesión propia');
    const {store,createCampaign}=storageProbe;
    if(${process.argv.includes('--prepare')}){
      const session=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'));
      const reply=await Capacitor.Plugins.CapacitorHttp.request({url:'http://localhost:3000/api/android/historia',method:'GET',headers:{Authorization:'Bearer '+session.access_token,Origin:'https://localhost'},responseType:'json'});
      if(reply.status!==200||reply.data.userId!==owner)throw Error('Preparación real inválida');
      const previous=await store.activate({owner});
      if(previous.body)throw Error('Ya existe un guardado; no reemplazarlo en este diagnóstico');
      const campaign=createCampaign(reply.data,'android-04-storage-probe');
      await store.commit({owner,body:JSON.stringify(campaign),expectedRevision:-1});
    }
    const state=await store.read({owner});
    if(!state.body)throw Error('Falta el guardado');
    const bytes=new TextEncoder().encode(state.body),digest=await crypto.subtle.digest('SHA-256',bytes);
    const campaign=JSON.parse(state.body);
    return {origin:location.origin,owner,active:state.active,revision:campaign.revision,
      version:campaign.version,engine:campaign.official.engine_version,provinces:campaign.official.catalog.provinces.length,
      rivals:campaign.official.catalog.rivals.length,pending:campaign.pending.length,bytes:bytes.length,
      sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),webDatabases:(await indexedDB.databases()).map(d=>d.name)};
  })()`)
  assert.equal(result.origin, 'https://localhost'); assert.equal(result.owner,result.active)
  assert.equal(result.provinces,15); assert.equal(result.rivals,66)
  assert.deepEqual(result.webDatabases,[])
  await mkdir('android/generated',{recursive:true})
  if(process.argv.includes('--prepare')) await writeFile(baseline,JSON.stringify(result,null,2))
  else { assert.deepEqual(result,JSON.parse(await readFile(baseline,'utf8'))); await writeFile('android/generated/android-04-storage-reopened.json',JSON.stringify(result,null,2)) }
  console.log(JSON.stringify(result))
} finally { c.close() }
