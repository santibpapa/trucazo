import type { ComponentProps } from 'react'
import type WebGuestButton from '../../../src/components/GuestButton'
import type WebTrackedLink from '../../../src/components/TrackedLink'
import { buttonClass } from '../../../src/components/ui/Button'
import { Link } from './navigation'

export function GuestButton({ variant = 'ghost', size = 'lg', fullWidth = true }: ComponentProps<typeof WebGuestButton>) {
  return <Link href="/lobby" className={buttonClass(variant, size, fullWidth)}>Volver al lobby</Link>
}
export function TrackedLink({ href, className, children }: ComponentProps<typeof WebTrackedLink>) {
  return <Link className={className} href={href === '/register' ? '/lobby' : href}>{children}</Link>
}
