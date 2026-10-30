import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const state={exists:true,correct:true,cookieCalls:0,clients:[]}
globalThis.loginFixture=state
const code=`import { POST as native, OPTIONS } from './src/app/api/android/login/route'; import { POST as web } from './src/app/api/login-usuario/route'; import { createApiClient } from './src/lib/supabase/api'; globalThis.handlers={native,web,OPTIONS,createApiClient};`
const mock=`export function createClient(url,key,options){ const f=globalThis.loginFixture; f.clients.push({key,options}); return {rpc:async()=>({data:f.exists?'private@fixture.invalid':null,error:null}),auth:{signInWithPassword:async()=>({data:f.correct?{session:{access_token:'fixture-access',refresh_token:'fixture-refresh'},user:{is_anonymous:false}}:{},error:f.correct?null:{message:'incorrect'}})}} }`
const cookie=`export async function createClient(){globalThis.loginFixture.cookieCalls++;return {auth:{signInWithPassword:async()=>({data:{session:{}},error:null})}}}`
const bundle=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'auth-fixture',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$|^@\/lib\/supabase\/server$|^\.\/server$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.includes('supabase-js')?mock:cookie,loader:'js'}))}}]})
process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='fixture-public';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-private'
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);new Function('require',bundle.outputFiles[0].text)(require)
const {native,web,OPTIONS,createApiClient}=globalThis.handlers
const request=(username='A',origin='https://localhost',authorization)=>new Request('https://www.trucazo.com.ar/api/android/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(authorization?{Authorization:authorization}:{})},body:JSON.stringify({username,password:'fixture-password'})})
const success=await native(request());assert.equal(success.status,200);assert.deepEqual(await success.json(),{access_token:'fixture-access',refresh_token:'fixture-refresh'});assert.equal(success.headers.get('cache-control'),'no-store');assert.equal(success.headers.get('access-control-allow-origin'),'https://localhost');assert.equal(state.cookieCalls,0)
assert.deepEqual(state.clients.map(c=>c.key),['fixture-private','fixture-public'])
state.exists=false;const missing=await native(request());state.exists=true;state.correct=false;const wrong=await native(request());assert.equal(missing.status,401);assert.equal(wrong.status,401);assert.deepEqual(await missing.json(),await wrong.json())
state.correct=true;const old=await web(request());assert.equal(old.status,200);assert.deepEqual(await old.json(),{ok:true});assert.equal(state.cookieCalls,1)
assert.equal((await native(request('A','https://evil.invalid'))).status,403)
assert.equal(OPTIONS(new Request('https://www.trucazo.com.ar/api/android/historia',{headers:{Origin:'https://localhost'}})).status,204)
assert.equal(OPTIONS(new Request('https://www.trucazo.com.ar/api/android/historia',{headers:{Origin:'https://evil.invalid'}})).status,403)
const before=state.cookieCalls;await createApiClient(request('A','https://localhost','Bearer invalid'));assert.equal(state.cookieCalls,before);assert.equal(state.clients.at(-1).options.global.headers.Authorization,'Bearer invalid')
await createApiClient(request());assert.equal(state.cookieCalls,before+1)
await mkdir('android/generated',{recursive:true});await writeFile('android/generated/android-03-server-fixture.json',JSON.stringify({scope:'Handlers reales, proveedor Auth/cookies simulado',sessionOnlyAfterCredentials:true,privateKeyServerOnly:true,noEmailInResponse:true,uniformErrors:true,webCookieContract:true,corsRestricted:true,invalidBearerNeverFallsBackToCookies:true},null,2))
console.log('OK contrato de login real: tokens tras autenticar, errores uniformes, cookies web, CORS y prioridad del token sobre cookies; proveedor simulado.')
