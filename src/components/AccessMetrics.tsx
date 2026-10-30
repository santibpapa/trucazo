'use client'

import { usePathname } from 'next/navigation'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'

// Las URLs de retorno contienen códigos de un solo uso: no van a métricas.
export default function AccessMetrics() {
  const path = usePathname()
  if (path.startsWith('/auth/') || path === '/recuperar-cuenta') return null
  return <><SpeedInsights /><Analytics /></>
}
