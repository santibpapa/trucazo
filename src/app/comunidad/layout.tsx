import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Comunidad', ...privateMetadata }

export default function ComunidadLayout({ children }: { children: React.ReactNode }) {
  return children
}
