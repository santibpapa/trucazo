import { NextResponse } from 'next/server'
import { processEmails } from '@/lib/email/process'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const result = await processEmails()
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
