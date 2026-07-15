import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

// Aviso por Telegram cuando alguien abre una mesa pública.
// El token del bot vive SOLO en el servidor (variables de Vercel), nunca en el
// navegador. El navegador solo "toca timbre" acá y este endpoint le habla a
// Telegram. Es best-effort: si algo falla, no rompe nada del juego.
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  // Si todavía no configuraste el bot, no hace nada (no molesta).
  if (!token || !chatId) return NextResponse.json({ ok: false, reason: 'sin-config' })

  // Solo alguien con sesión iniciada puede disparar el aviso (evita que un
  // random te llene el Telegram de spam desde afuera).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { name, bet, creator, targetScore } = await req.json().catch(() => ({}))

  const text =
    '🃏 Nueva mesa en Trucazo\n' +
    `Mesa: ${name ?? '—'}\n` +
    `La abrió: ${creator ?? '—'}\n` +
    `Apuesta: ${bet ?? '—'} monedas · a ${targetScore ?? '—'} puntos\n\n` +
    `Entrá a jugar: ${SITE_URL}/lobby`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
