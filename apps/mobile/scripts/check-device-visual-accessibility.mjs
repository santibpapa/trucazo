// Comparación con la web local y árbol accesible real. Sólo QA3 y lecturas.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { deviceCDP } from './device-cdp.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
const c=await deviceCDP(),qa=(await loadQaAccounts()).registrationAccount,report={scope:'APK Android 11 + web Next local, misma QA3; sin publicaciones ni mensajes',screens:[]}
const pause=ms=>new Promise(r=>setTimeout(r,ms))
async function wait(expression){for(let i=0;i<100;i++){if(await c.evaluate(expression))return;await pause(150)}throw Error('No apareció '+expression)}
const viewport=await c.evaluate('({width:innerWidth,height:innerHeight})')
const browser=await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true})
const context=await browser.newContext({viewport}),page=await context.newPage()
const style=()=>{const h=document.querySelector('h1,h2'),s=h&&getComputedStyle(h);return h?{title:h.textContent.trim(),fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,lineHeight:s.lineHeight}:null}
try{
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"),qa.id)
  await page.goto('http://localhost:3000/login')
  await page.getByLabel('Email o usuario').fill(qa.email);await page.getByLabel('Contraseña',{exact:true}).fill(qa.password)
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/lobby**')
  for(const [path,text,name,web] of [['/lobby','Mesas disponibles','lobby',true],['/profile','androidqa3','profile',true],['/ranking','Ranking','ranking',true],
    ['/tienda','Tienda','shop',true],['/comunidad','Comunidad','community',true],['/torneos','Torneos','tournaments',true],
    ['/historia','Jugar sin internet','history',true],['/como-se-juega-al-truco','Cómo se juega','help',true],['/notificaciones','Notificaciones','notifications',false]]){
    await c.evaluate('location.hash='+JSON.stringify('#'+path));await wait('document.body.innerText.includes('+JSON.stringify(text)+')');await pause(500)
    await c.evaluate('document.fonts.ready')
    const tree=(await c.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored)
    const nameless=tree.filter(n=>['button','link','textbox','spinbutton','combobox','switch','checkbox'].includes(n.role?.value)&&!n.name?.value?.trim()).map(n=>n.role.value)
    assert.deepEqual(nameless,[],path+' tiene controles sin nombre')
    const nativeStyle=await c.evaluate('('+style.toString()+')()')
    await writeFile('android/generated/android-14-visual-'+name+'-native.png',Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).data,'base64'))
    let webStyle
    if(web){await page.goto('http://localhost:3000'+path);await page.getByText(text,{exact:false}).first().waitFor();await page.evaluate(()=>document.fonts.ready);webStyle=await page.evaluate(style)
      assert.deepEqual(nativeStyle,webStyle,path+' cambió la presentación compartida');await page.screenshot({path:'android/generated/android-14-visual-'+name+'-web.png'})}
    report.screens.push({path,viewport,namedControls:tree.filter(n=>['button','link','textbox','spinbutton','combobox','switch','checkbox'].includes(n.role?.value)).length,nameless,nativeStyle,webStyle})
  }
  // Abrir opciones sobre otra QA sólo consulta su perfil: no envía denuncias ni bloquea.
  await c.evaluate("location.hash='#/convivencia'");await wait("!!document.querySelector('input[name=safety-username]')")
  await c.evaluate("(()=>{const f=document.querySelector('input[name=safety-username]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(f,'androidqa1');f.dispatchEvent(new Event('input',{bubbles:true}))})()")
  await pause(100);await c.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Buscar persona').click()")
  await wait("!!document.querySelector('button[aria-label=\"Opciones de androidqa1\"]')")
  await c.evaluate("document.querySelector('button[aria-label=\"Opciones de androidqa1\"]').click()")
  await wait("!!document.querySelector('[role=dialog]')")
  report.communityWindowZ=await c.evaluate("Number(getComputedStyle(document.querySelector('[role=dialog]').parentElement).zIndex)")
  assert.ok(report.communityWindowZ>1000)
  await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
  await writeFile('android/generated/android-14-visual-accessibility.json',JSON.stringify(report,null,2));console.log('OK comparación app/web, nueve familias con controles nombrados y ventana de convivencia sobre el chat.')
}catch(error){throw Error(error.message.replaceAll(qa.password,'[privado]').replaceAll(qa.email,'[correo QA]'))}
finally{await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));location.hash='#/lobby'").catch(()=>{});c.close();await context.close();await browser.close()}
