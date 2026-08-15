import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Perfil', ...privateMetadata }

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
