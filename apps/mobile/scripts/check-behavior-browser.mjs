// Ventanas reales, teclado y audio. Identidad y contenido ficticios; sin servidor remoto.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
  import {useState} from 'react'; import {createRoot} from 'react-dom/client';
  import Modal from './src/components/ui/Modal'; import CommunityDialog from './src/components/CommunityDialog';
  import Button from './src/components/ui/Button';
  import LoginScreen from './src/components/LoginScreen';
  import {androidBack} from './apps/mobile/src/android-behavior';
  import {playSound,setMuted} from './src/lib/sounds';
  window.androidBack=androidBack; window.playSound=playSound; window.setMuted=setMuted;
  function Test(){const [open,S]=useState(false),[nested,N]=useState(false),[portals,P]=useState(false);window.showPortals=()=>P(true);window.leaveScreen=()=>{P(false);N(false)};return <>
    <button id="trigger" onClick={()=>S(true)}>Abrir</button><a href="#otra">Fondo</a>
    <div className="bg-surface2"><span id="subtle" className="text-subtle">Texto terciario</span><span id="negative" className="text-negative">Error</span></div>
    <Button id="danger" variant="danger">Peligro</Button><Button id="positive" variant="positive">Aceptar</Button><Button id="info" variant="info">Información</Button>
    <LoginScreen identifier="" password="" error="" loading={false} onIdentifierChange={()=>{}} onPasswordChange={()=>{}} onLogin={()=>{window.loginCount=(window.loginCount||0)+1}} registration={null}>{null}</LoginScreen>
    <Modal open={open} title="Ventana de prueba" onClose={()=>S(false)}>
      <input aria-label="Texto"/><button id="nested" onClick={()=>N(true)}>Otra ventana</button>
      <button id="close" onClick={()=>S(false)}>Cerrar</button>
      {nested&&<CommunityDialog title="Ventana superior" onClose={()=>N(false)}><button id="nested-close" onClick={()=>N(false)}>Cerrar superior</button></CommunityDialog>}
    </Modal>
    {portals&&<CommunityDialog title="Ventana de ruta" onClose={()=>P(false)}><button id="portal-nested" onClick={()=>N(true)}>Otra ventana de ruta</button>{nested&&<CommunityDialog title="Ventana de ruta superior" onClose={()=>N(false)}><button>Cerrar ruta</button></CommunityDialog>}</CommunityDialog>}
    </>}; createRoot(document.getElementById('root')).render(<Test/>);` },
  bundle: true, write: false, jsx: 'automatic', alias: { '@': path.resolve('src') },
  define: { 'process.env.NODE_ENV': '"production"' }, target: 'chrome100',
})
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  if (p === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/test.js"></script></body></html>'); return }
  if (p === '/test.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return }
  try { res.setHeader('Content-Type', p.endsWith('.css') ? 'text/css' : 'audio/wav'); res.end(await readFile(path.join('apps/mobile/dist', p.slice(1)))) }
  catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 400 } }), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:' + server.address().port)
  await page.locator('#trigger').click()
  await page.getByLabel('Texto', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Texto')
  assert.equal(await page.getByRole('link', { name: 'Fondo' }).evaluate(el => el.inert), true)
  const ax = await page.context().newCDPSession(page)
  const names = async () => (await ax.send('Accessibility.getFullAXTree')).nodes.filter(n => !n.ignored).map(n => n.name?.value)
  assert.ok(!(await names()).includes('Fondo'))
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'close')
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Texto')
  await page.locator('#nested').click()
  await page.getByRole('dialog', { name: 'Ventana superior' }).waitFor()
  assert.ok(await page.getByRole('dialog',{name:'Ventana superior'}).evaluate(el=>Number(getComputedStyle(el.parentElement).zIndex)>1000),'La ventana de convivencia debe quedar por encima del chat de mesa')
  assert.ok(!(await names()).includes('Ventana de prueba'))
  await page.evaluate(() => window.androidBack(true))
  await page.getByRole('dialog', { name: 'Ventana de prueba' }).waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'nested')
  await page.evaluate(() => window.androidBack(true))
  await page.getByRole('link', { name: 'Fondo' }).waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'trigger')
  await page.getByLabel('Email o usuario',{exact:true}).press('Enter')
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('name')),'password')
  assert.equal(await page.evaluate(()=>window.loginCount||0),0)
  await page.getByLabel('Contraseña',{exact:true}).press('Enter')
  assert.equal(await page.evaluate(()=>window.loginCount),1)
  await page.evaluate(()=>window.showPortals())
  await page.locator('#portal-nested').click()
  await page.getByRole('dialog',{name:'Ventana de ruta superior'}).waitFor()
  assert.ok((await names()).includes('Ventana de ruta superior'))
  await page.evaluate(()=>window.leaveScreen())
  await page.getByRole('button',{name:'Abrir',exact:true}).click({timeout:1500})
  await page.getByRole('dialog',{name:'Ventana de prueba'}).waitFor()
  await page.evaluate(()=>window.androidBack(true))
  const audio = await page.evaluate(async () => {
    const Original = window.Audio, played = []
    window.Audio = class { currentTime = 0; paused = true; constructor(src) { this.src = src; played.push(this) } play() { this.paused = false; return Promise.resolve() } pause() { this.paused = true } }
    window.setMuted(false); window.playSound('gano'); window.setMuted(true)
    const mutedStopped = played[0].paused && played[0].currentTime === 0
    window.setMuted(false); window.playSound('perdi')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))
    window.playSound('carta')
    const hiddenStopped = played.every(audio => audio.paused) && played.length === 2
    delete document.hidden; window.Audio = Original
    return { mutedStopped, hiddenStopped }
  })
  assert.deepEqual(audio, { mutedStopped: true, hiddenStopped: true }); assert.deepEqual(errors, [])
  const contrast=await page.evaluate(()=>{
    const luminance=rgb=>{const s=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*s[0]+.7152*s[1]+.0722*s[2]}
    return ['subtle','negative','danger','positive','info'].map(id=>{const el=document.getElementById(id),style=getComputedStyle(el),a=luminance(style.color),b=luminance(getComputedStyle(id==='subtle'||id==='negative'?el.parentElement:el).backgroundColor);return {id,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})
  })
  for(const pair of contrast)assert.ok(pair.ratio>=4.5,JSON.stringify(pair))
  await writeFile('android/generated/android-14-behavior-browser.json', JSON.stringify({ scope: 'Componentes reales + audio simulado; sin backend', focus: true, nestedBack: true, backgroundInert: true, focusReturned: true, simultaneousCloseRestoresBackground: true, loginNextFocusesPassword: true, loginGoSubmits: true, audio, contrast, errors }, null, 2))
  console.log('OK foco y ventanas anidadas, Atrás, teclado del acceso, fondo inaccesible y pausa de audio.')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
