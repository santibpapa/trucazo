import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const harness=(await build({stdin:{contents:"import {loadCampaign} from './apps/mobile/src/campaign-storage';globalThis.compatibilityProbe=loadCampaign",resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
const c=await deviceCDP()
try {
  await c.evaluate(harness)
  const result=await c.evaluate(`(async()=>{
    const owner=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id;
    const before=await Capacitor.Plugins.CampaignStore.read({owner}),original=Capacitor.nativePromise,errors=[];
    try {
      for(const kind of ['format','engine','trial','pending']) {
        const saved=JSON.parse(before.body);
        if(kind==='format')saved.version='future-format';
        if(kind==='engine')saved.official.engine_version='future-engine';
        if(kind==='trial')saved.trial.version='future-engine';
        if(kind==='pending')saved.pending=[{trial:{version:'future-engine'}}];
        // Simular una lectura incompatible sin escribir nunca la base real.
        Capacitor.nativePromise=(plugin,method,options)=>plugin==='CampaignStore'&&method==='read'?Promise.resolve({...before,body:JSON.stringify(saved)}):original(plugin,method,options);
        try{await compatibilityProbe(owner);throw Error('Versión incompatible abierta')}catch(error){if(!error.message.includes('Se conserva'))throw error;errors.push({kind,message:error.message})}
      }
    }finally{Capacitor.nativePromise=original}
    const after=await Capacitor.Plugins.CampaignStore.read({owner});
    return {scope:'APK real/SQLite real; incompatibilidades simuladas sólo en la respuesta de lectura',unchanged:before.body===after.body,errors};
  })()`)
  assert.ok(result.unchanged);assert.equal(result.errors.length,4)
  await writeFile('android/generated/android-06-native-compatibility.json',JSON.stringify(result,null,2))
  console.log(result)
}finally{c.close()}
