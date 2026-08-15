import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Tienda', ...privateMetadata }

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children
}
