import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Objetivos', ...privateMetadata }

export default function ObjectivesLayout({ children }: { children: React.ReactNode }) {
  return children
}
