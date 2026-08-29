'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackFirstParty } from '@/lib/analytics/client'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    trackFirstParty('page_view')
  }, [pathname])

  return null
}
