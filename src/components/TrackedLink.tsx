'use client'

import Link from 'next/link'
import { track } from '@vercel/analytics'

export default function TrackedLink({
  href,
  event,
  source,
  className,
  children,
}: {
  href: string
  event: string
  source: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track(event, { source, destination: href })}
    >
      {children}
    </Link>
  )
}
