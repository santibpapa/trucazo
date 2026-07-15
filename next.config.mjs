/** @type {import('next').NextConfig} */

// Cabeceras de seguridad que se aplican a todas las páginas. Son señales de
// seguridad que Google valora y que protegen a los jugadores (evitan que el
// sitio se meta en un iframe ajeno, que el navegador adivine tipos de archivo,
// que se filtre la dirección de dónde venís, etc.).
// No incluimos Content-Security-Policy a propósito: mal configurada rompería
// Supabase, Google Login o las métricas de Vercel. Se puede sumar más adelante
// con cuidado.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
