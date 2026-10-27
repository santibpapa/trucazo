// Sólo WebView debug: enrutar POST propios al puente sin sacar la sesión.
// La reapertura normal del APK también retira este cambio temporal.
import assert from 'node:assert/strict'
import { deviceCDP } from './device-cdp.mjs'
const mode = process.argv[2], owner = process.argv[3]
assert.ok(['enable', 'restore'].includes(mode), 'Usar enable <owner> o restore')
if (mode === 'enable') assert.match(owner || '', /^[0-9a-f-]{36}$/i, 'Indicar la cuenta de la prueba')
const c = await deviceCDP()
try {
  const result = await c.evaluate(`(()=>{
    const owner=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id;
    if(${JSON.stringify(mode)}==='restore'){
      if(window.android06OriginalNativePromise){Capacitor.nativePromise=window.android06OriginalNativePromise;delete window.android06OriginalNativePromise}
      return {owner,routed:false};
    }
    if(owner!==${JSON.stringify(owner)})throw Error('Primero ingresar personalmente con la cuenta de la prueba');
    if(!window.android06OriginalNativePromise){
      const original=Capacitor.nativePromise;window.android06OriginalNativePromise=original;
      Capacitor.nativePromise=function(plugin,method,options){
        if(plugin==='CapacitorHttp'&&method==='request'&&options?.method==='POST'&&options.url.endsWith('/api/android/historia'))
          options={...options,url:'http://localhost:3002/api/android/historia'};
        return original.call(this,plugin,method,options);
      };
    }
    return {owner,routed:true};
  })()`)
  console.log(JSON.stringify(result))
} finally { c.close() }
