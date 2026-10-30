// Formulario web real y almacenamiento real; identidad y respuesta de borrado aisladas.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Form from './src/app/eliminar-cuenta/AccountDeletionForm';createRoot(document.getElementById('root')).render(<Form/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'web-fixture',setup(b){
 b.onResolve({filter:/^@\/lib\/supabase\/client$|^next\/link$|^@\/components\/GoogleButton$/},a=>({path:a.path,namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'tsx',resolveDir:process.cwd(),contents:a.path.includes('supabase')?`export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.fixtureUser}}),getSession:async()=>({data:{session:{user:window.currentUser}}}),signOut:async()=>{window.signedOut=true}}});`:`export default function Link(p){return <a href={p.href}>{p.children}</a>}` }))
}}]})
const browser=await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true}),results=[]
try{
 for(const switchAccount of [false,true]){
  const c=await browser.newContext(),page=await c.newPage()
  await c.route('https://web.fixture.invalid/**',r=>r.request().url().endsWith('/api/account/delete')?r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,status:'deleted'})}):r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}))
  await page.goto('https://web.fixture.invalid/')
  await page.evaluate(async({A,B})=>{
   window.fixtureUser={id:A,email:'fixture@invalid.test',identities:[{provider:'email'}]};window.currentUser=window.fixtureUser
   localStorage.setItem('sb-test-auth-token','keep-until-own-signout')
   for(const [name,stores]of [['trucazo-historia-local-v1',['meta','campaigns']],['trucazo-tobias-v1',['meta','games','results']]])await new Promise(resolve=>{
    const r=indexedDB.open(name,1);r.onupgradeneeded=()=>stores.forEach(s=>r.result.createObjectStore(s));r.onsuccess=()=>{
     const db=r.result,tx=db.transaction(stores,'readwrite');tx.objectStore('meta').put(A,'active')
     for(const s of stores.filter(s=>s!=='meta')){tx.objectStore(s).put({owner:A},s==='results'?A+':result':A);tx.objectStore(s).put({owner:B},s==='results'?B+':result':B)}
     tx.oncomplete=()=>{db.close();resolve()}
    }
   })
  },{A,B})
  await page.addScriptTag({content:bundle.outputFiles[0].text})
  await page.getByLabel('Confirmá tu contraseña').fill('fixture')
  await page.getByLabel('Escribí ELIMINAR para confirmar').fill('ELIMINAR')
  if(switchAccount)await page.evaluate(B=>{window.currentUser={id:B}},B)
  await page.getByRole('button',{name:'Eliminar mi cuenta definitivamente',exact:true}).click()
  await page.getByRole('heading',{name:'Tu cuenta fue eliminada'}).waitFor()
  await page.waitForFunction(async()=>{
   return await new Promise(resolve=>{const r=indexedDB.open('trucazo-tobias-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('results','readonly'),q=tx.objectStore('results').get('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:result');tx.oncomplete=()=>{resolve(!q.result);db.close()}}})
  })
  const result=await page.evaluate(async({A,B})=>{
   const rows=[]
   for(const name of ['trucazo-historia-local-v1','trucazo-tobias-v1'])rows.push(await new Promise(resolve=>{const r=indexedDB.open(name,1);r.onsuccess=()=>{const db=r.result,tx=db.transaction([...db.objectStoreNames],'readonly'),data={name};for(const s of [...db.objectStoreNames].filter(s=>s!=='meta')){const a=tx.objectStore(s).get(s==='results'?A+':result':A),b=tx.objectStore(s).get(s==='results'?B+':result':B);a.onsuccess=()=>data[s+'OwnRemoved']=!a.result;b.onsuccess=()=>data[s+'OtherKept']=b.result?.owner===B}tx.oncomplete=()=>{db.close();resolve(data)}}}))
   return{rows,signedOut:!!window.signedOut,sessionValue:localStorage.getItem('sb-test-auth-token')}
  },{A,B})
  for(const row of result.rows)for(const [key,value]of Object.entries(row))if(key!=='name')assert.equal(value,true)
  assert.equal(result.signedOut,!switchAccount);assert.equal(!!result.sessionValue,switchAccount)
  results.push({switchAccount,...result});await c.close()
 }
 await writeFile('android/generated/android-15-web-deletion-browser.json',JSON.stringify({scope:'Formulario web y dos IndexedDB reales; Auth/respuesta aislados',results},null,2))
 console.log('OK web: campaña y prueba antigua eliminadas sólo del dueño; cuenta B y su sesión se conservan incluso si cambia durante el borrado.')
}finally{await browser.close()}
