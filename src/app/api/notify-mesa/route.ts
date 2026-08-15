import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

// Aviso por Telegram cuando alguien abre una mesa pública.
// El token del bot vive SOLO en el servidor (variables de Vercel), nunca en el
// navegador. El navegador solo "toca timbre" acá y este endpoint le habla a
// Telegram. Es best-effort: si algo falla, no rompe nada del juego.
//
// El navegador manda ÚNICAMENTE el id de la mesa. Antes mandaba el texto del
// mensaje (nombre, apuesta, quién la abrió), así que cualquiera con sesión podía
// inventarlo y repetirlo. Ahora los datos salen de la base, y la propia base
// decide si corresponde avisar: solo el creador, solo mesas públicas que están
// esperando rival, recientes, y una sola vez por mesa.
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  // Si todavía no configuraste el bot, no hace nada (no molesta).
  if (!token || !chatId) return NextResponse.json({ ok: false, reason: 'sin-config' })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const tableId = typeof body?.tableId === 'string' ? body.tableId : ''
  if (!/^[0-9a-f-]{36}$/i.test(tableId)) {
    return NextResponse.json({ ok: false, reason: 'mesa-invalida' }, { status: 400 })
  }

  // Reclama el aviso: devuelve los datos la primera vez y null después.
  const { data: mesa, error } = await supabase.rpc('claim_table_notification', {
    p_table_id: tableId,
  })
  if (error || !mesa) {
    return NextResponse.json({ ok: false, reason: 'sin-aviso' })
  }

  const m = mesa as { name: string; creator: string; bet: number; target_score: number }
  const text =
    '🃏 Nueva mesa en Trucazo\n' +
    `Mesa: ${m.name}\n` +
    `La abrió: ${m.creator}\n` +
    `Apuesta: ${m.bet} monedas · a ${m.target_score} puntos\n\n` +
    `Entrá a jugar: ${SITE_URL}/lobby`

  // Si Telegram falla, no mentimos con un ok: se informa, sin exponer el token
  // ni el chat. El juego sigue igual pase lo que pase.
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
    if (!res.ok) {
      console.error('notify-mesa: Telegram respondió', res.status)
      return NextResponse.json({ ok: false, reason: 'telegram-error' }, { status: 502 })
    }
  } catch {
    console.error('notify-mesa: no se pudo contactar a Telegram')
    return NextResponse.json({ ok: false, reason: 'telegram-error' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
