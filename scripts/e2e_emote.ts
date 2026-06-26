/**
 * Prueba del chat rápido (broadcast): un cliente envía un emote y el otro lo recibe.
 * No toca la DB. Correr: npx tsx scripts/e2e_emote.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const nc = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const sub = (ch: any) => new Promise<void>((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout al suscribir')), 8000)
  ch.subscribe((s: string) => { if (s === 'SUBSCRIBED') { clearTimeout(t); res() } })
})

async function main() {
  console.log('Prueba de chat rápido (broadcast) ...\n')
  const chan = `chat-test-${Math.random().toString(36).slice(2, 8)}`
  const A = nc(), B = nc()

  const received = new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('B no recibió el emote en 6s')), 6000)
    B.channel(chan).on('broadcast', { event: 'emote' }, ({ payload }: any) => {
      clearTimeout(t); resolve(payload?.text)
    })
  })
  // re-suscribir el mismo canal de B (el .on de arriba creó la instancia; suscribimos)
  const bChannel = (B as any).getChannels().find((c: any) => c.topic === `realtime:${chan}`)
  await sub(bChannel)

  const aChannel = A.channel(chan)
  await sub(aChannel)

  aChannel.send({ type: 'broadcast', event: 'emote', payload: { text: '👏' } })

  const got = await received
  console.log(got === '👏' ? '  ✓ B recibió el emote enviado por A (👏)' : `  ✗ B recibió "${got}" (esperaba 👏)`)

  await A.removeAllChannels(); await B.removeAllChannels()
  console.log('\n' + (got === '👏' ? '✅ Chat rápido OK.' : '❌ Falló.'))
  process.exit(got === '👏' ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
