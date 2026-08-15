import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Modo Historia', ...privateMetadata }

export default function HistoriaLayout({ children }: { children: React.ReactNode }) {
  return children
}
