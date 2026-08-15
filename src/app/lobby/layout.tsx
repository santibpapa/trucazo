import type { Metadata } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Lobby', ...privateMetadata }

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children
}
