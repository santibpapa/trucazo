import { ImageResponse } from 'next/og'

// Imagen que se ve al compartir el link (WhatsApp, redes, resultados de Google).
// Se genera sola con los colores de la marca; no depende de ningún archivo.
export const runtime = 'edge'
export const alt = 'Trucazo — Truco argentino online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          background:
            'radial-gradient(120% 120% at 50% 0%, #2E191B 0%, #1A0F10 55%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Marca de cartas */}
        <div style={{ display: 'flex', position: 'relative', width: 150, height: 190 }}>
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 10,
              width: 100,
              height: 140,
              borderRadius: 16,
              background: '#FFFFFF',
              transform: 'rotate(-10deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 45,
              top: 20,
              width: 100,
              height: 140,
              borderRadius: 16,
              background: '#FFFFFF',
              transform: 'rotate(8deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 999, background: '#C9A24B' }} />
          </div>
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>
          <span style={{ color: '#EFE6DA' }}>Truc</span>
          <span style={{ color: '#C9A24B' }}>azo</span>
        </div>

        <div style={{ display: 'flex', fontSize: 40, color: '#A78A86' }}>
          Truco argentino online · gratis · 1 contra 1
        </div>
      </div>
    ),
    { ...size },
  )
}
