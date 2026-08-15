import type { Metadata } from 'next'
import { noIndexFollowMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Enviar una reseña',
  description: 'Contanos cómo fue tu partida en Trucazo.',
  ...noIndexFollowMetadata,
}

export default function ResenaLayout({ children }: { children: React.ReactNode }) {
  return children
}
