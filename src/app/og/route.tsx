import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

function clean(value: string | null, fallback: string, max: number) {
  return (value?.trim() || fallback).slice(0, max)
}

export async function GET(request: NextRequest) {
  const title = clean(
    request.nextUrl.searchParams.get('title'),
    'Trucazo — Truco argentino online',
    90,
  )
  const subtitle = clean(
    request.nextUrl.searchParams.get('subtitle'),
    'Aprendé, practicá y jugá al truco desde el navegador.',
    170,
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 88px',
          color: '#EFE6DA',
          background:
            'radial-gradient(circle at 82% 4%, #4c3522 0%, transparent 38%), linear-gradient(145deg, #2E191B 0%, #1A0F10 58%, #100809 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 66,
              height: 66,
              borderRadius: 18,
              border: '2px solid #C9A24B',
              color: '#C9A24B',
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>
            TRUCAZO
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 980 }}>
          <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.04, fontWeight: 800 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.35, color: '#CBB8AD' }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#C9A24B', fontSize: 24 }}>
          <span>El de siempre, como siempre.</span>
          <span>trucazo.com.ar</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
