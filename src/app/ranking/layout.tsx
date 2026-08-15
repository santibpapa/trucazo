import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Ranking', ...privateMetadata }

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return children
}
