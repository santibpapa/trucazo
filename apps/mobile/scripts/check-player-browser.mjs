import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { playerFixture, ids } from './player-fixture.ts'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const f = await playerFixture(), calls = [], errors = [], imageErrors = []
const objectives = await f.rpc('get_my_objectives',{p_game_id:null})
const ready = objectives.daily[0]
await f.db.query('update daily_mission_assignments set progress=999,completed_at=now() where profile_id=$1 and template_slug=$2',[ids.A,ready.identifier])
const server = createServer(async (req,res) => {
  const p = new URL(req.url,'http://localhost').pathname
  if(p==='/api/analytics'){res.writeHead(204).end();return}
  try {
    const bytes = await readFile(path.join('apps/mobile/dist',p==='/'?'index.html':p.slice(1)))
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'})[path.extname(p)] || 'text/html');res.end(bytes)
  } catch { imageErrors.push(p);res.writeHead(404).end() }
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser = await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE})
const context = await browser.newContext({viewport:{width:360,height:640}})
const tokens = new Map()
function token(owner) {
  const access_token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture'
  tokens.set(access_token,owner)
  return {access_token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:user(owner)}
}
const user=owner=>({id:owner,email:owner===ids.A?'a@fixture.test':'b@fixture.test',is_anonymous:false,app_metadata:{},user_metadata:{},aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()})
await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.origin===origin)return route.continue()
  const respond=(data,status=200,headers={})=>route.fulfill({status,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info,prefer,accept','Access-Control-Expose-Headers':'content-range',...headers},contentType:'application/json',body:JSON.stringify(data)})
  if(request.method()==='OPTIONS')return respond({},200)
  const owner=tokens.get(request.headers().authorization?.replace(/^Bearer /,''))
  const args=request.postDataJSON()
  calls.push(url.pathname)
  if(url.pathname==='/auth/v1/token')return respond(token(args.email==='a@fixture.test'?ids.A:ids.B))
  if(url.pathname==='/auth/v1/user')return respond(user(owner))
  if(url.pathname==='/auth/v1/logout')return respond({})
  if(!owner)return respond({message:'Entrá con tu cuenta'},401)
  try {
    if(url.pathname.startsWith('/rest/v1/rpc/')) {
      const name=url.pathname.split('/').at(-1)
      if(name==='team_lobby')return respond({tables:[],mine:[]})
      if(['friends_list','community_groups','pending_friend_requests','get_my_game_invites','tournament_notifications_list'].includes(name))return respond([])
      if(['ensure_lobby_tables','touch_online','get_community'].includes(name))return respond(null)
      if(!f || ['tournament_ready_match'].includes(name))return respond(false)
      return respond(await f.rpc(name,args||{},owner))
    }
    const table=url.pathname.split('/').at(-1)
    if(!['profiles','tables','games','game_hands','game_history','salons','frames','accessories','profile_salons','profile_frames','profile_accessories','campaign_rivals'].includes(table))return respond([])
    const conditions=[],values=[]
    for(const [key,value] of url.searchParams) {
      if(['select','order','limit'].includes(key))continue
      assert.match(key,/^[a-z_]+$/)
      if(value==='is.null')conditions.push(key+' is null')
      else if(value.startsWith('eq.')||value.startsWith('gt.')){values.push(value.slice(3));conditions.push(key+(value.startsWith('eq.')?' = ':' > ')+'$'+values.length)}
      else if(value.startsWith('in.')){values.push(value.slice(4,-1).split(','));conditions.push(key+' = any($'+values.length+'::uuid[])')}
    }
    const order=(url.searchParams.get('order')||'').split(',').filter(Boolean).map(o=>{assert.match(o,/^[a-z_]+\.(asc|desc)$/);return o.replace('.', ' ')}).join(',')
    const rows=await f.asUser(owner,async()=>(await f.db.query('select * from '+table+(conditions.length?' where '+conditions.join(' and '):'')+(order?' order by '+order:'')+(url.searchParams.has('limit')?' limit '+Number(url.searchParams.get('limit')):''),values)).rows)
    return respond(request.headers().accept?.includes('object+json')?(rows[0]??null):rows)
  } catch(error){console.error(url.pathname+': '+error.message);return respond({message:error.message,code:'FIXTURE'},400)}
})
const page=await context.newPage()
page.on('pageerror',error=>errors.push(error.message))
const go=async route=>{await page.evaluate(route=>location.hash='#'+route,route)}
async function login(email) {
  await page.getByLabel('Email o usuario').fill(email);await page.getByLabel('Contraseña').fill('fixture-password')
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByText(email[0]==='a'?'Cuenta A':'Cuenta B',{exact:true}).filter({visible:true}).first().waitFor()
}
try {
  await page.goto(origin);await login('a@fixture.test')
  await page.getByRole('button',{name:/Abrir objetivos/}).click()
  await page.getByRole('button',{name:'Reclamar',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Recompensa recibida'}).waitFor()
  assert.equal((await f.db.query('select coins from profiles where id=$1',[ids.A])).rows[0].coins,2000+ready.reward)
  await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click()
  await go('/profile');await page.getByRole('heading',{name:'Cuenta A'}).waitFor()
  await page.getByText('Ganaste vs Rival QA',{exact:true}).waitFor()
  await page.screenshot({path:'android/generated/android-08-profile-fixture.png',fullPage:true})
  await go('/ranking');await page.getByRole('heading',{name:'Ranking',exact:true}).waitFor()
  await page.getByText('(vos)',{exact:true}).waitFor()
  await go('/tienda');await page.getByRole('heading',{name:'Tienda',exact:true}).waitFor()
  page.on('dialog',dialog=>dialog.accept())
  const panel=name=>page.locator('section > div > div').filter({has:page.getByRole('heading',{name,exact:true})})
  for(const name of ['Cafetín porteño','Dorado','Botella de agua']){
    const card=panel(name).last()
    await card.getByRole('button',{name:'100',exact:true}).click()
    await card.getByRole('button',{name:name==='Botella de agua'?'Sacar de la mesa':'En uso',exact:true}).waitFor()
  }
  const coins=(await f.db.query('select coins from profiles where id=$1',[ids.A])).rows[0].coins
  assert.equal(coins,1700+ready.reward)
  await page.getByRole('button',{name:'Ver mesa: Cafetín porteño',exact:true}).click()
  await page.getByRole('button',{name:'Cerrar vista previa',exact:true}).waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes('pantalla estará disponible'))
  await page.screenshot({path:'android/generated/android-08-shop-preview-fixture.png'})
  await page.getByRole('button',{name:'Cerrar vista previa',exact:true}).click()
  await go('/historia');await page.getByText('Ranking',{exact:true}).first().waitFor()
  await page.waitForTimeout(2500)
  const skip=page.getByRole('button',{name:/Saltar|Entendido|Empezar|A jugar/}).first()
  if(await skip.count())await skip.click()
  // Los tutoriales y avisos quedan separados por identidad, incluso al recargar.
  await page.evaluate(owner=>localStorage.setItem('trucazo:campania:tutorial:'+owner,'1'),ids.A)
  await go('/lobby');await page.getByText('Cuenta A',{exact:true}).filter({visible:true}).first().waitFor()
  await page.getByRole('button',{name:'Perfil',exact:true}).click()
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).filter({visible:true}).click()
  await page.getByLabel('Email o usuario').waitFor();await login('b@fixture.test')
  await go('/profile');await page.getByRole('heading',{name:'Cuenta B'}).waitFor()
  await page.getByText('Todavía no jugaste ninguna partida',{exact:true}).waitFor()
  assert.equal(await page.getByText('Ganaste vs Rival QA',{exact:true}).count(),0)
  assert.equal(await page.evaluate(owner=>localStorage.getItem('trucazo:campania:tutorial:'+owner),ids.B),null)
  await context.setOffline(true);await go('/tienda');await page.getByText('Conectate para consultar tu perfil, ranking y tienda.',{exact:true}).waitFor()
  assert.deepEqual(errors,[]);assert.deepEqual(imageErrors,[])
  await writeFile('android/generated/android-08-player-browser.json',JSON.stringify({scope:'Interfaz empaquetada 360×640 y SQL real aislado; Auth/PostgREST simulados',coinsBefore:2000,objectiveReward:ready.reward,coinsAfter:coins,objectiveClaimFromChest:true,sharedProfile:true,privateHistory:true,ranking:true,shopAndPreview:true,accountTutorialIsolation:true,offlineNotice:true,pageErrors:errors,missingAssets:imageErrors,calls:[...new Set(calls)]},null,2))
  console.log('OK perfil, historial privado, ranking, tres compras, vista previa, cuentas y aviso offline en interfaz empaquetada + SQL aislado.')
} catch(error) {
  console.error({body:await page.locator('body').innerText(),errors,calls:calls.slice(-12)})
  await page.screenshot({path:'android/generated/android-08-player-failure.png'})
  throw error
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await f.db.close()}
