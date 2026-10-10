'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import RegisterSW from '@/components/RegisterSW'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { isAndroidEntry } from '@/lib/android-entry'

const AndroidSessionGuard = dynamic(() => import('@/components/AndroidSessionGuard'), {
  ssr: false,
})

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
  const [android, setAndroid] = useState(false)
  useEffect(() => { setAndroid(isAndroidEntry()) }, [pathname])
  const needsGuestGuard = APP_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  )

  return (
    <>
      <AnalyticsTracker />
      {android ? <AndroidSessionGuard /> : null}
      {needsGuestGuard ? <GuestSessionGuard /> : null}
      <RegisterSW />
    </>
  )
}
