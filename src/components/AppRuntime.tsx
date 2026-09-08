'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import RegisterSW from '@/components/RegisterSW'
import AnalyticsTracker from '@/components/AnalyticsTracker'

const GuestSessionGuard = dynamic(() => import('@/components/GuestSessionGuard'), {
  ssr: false,
})

const APP_PATHS = [
  '/lobby',
  '/profile',
  '/ranking',
  '/tienda',
  '/comunidad',
  '/historia',
  '/game',
  '/resena',
]

export default function AppRuntime() {
  const pathname = usePathname()
  const needsGuestGuard = APP_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  )

  return (
    <>
      <AnalyticsTracker />
      {needsGuestGuard ? <GuestSessionGuard /> : null}
      <RegisterSW />
    </>
  )
}
