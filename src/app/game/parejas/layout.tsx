import type { Metadata, Viewport } from 'next'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = { title: 'Truco 2vs2', ...privateMetadata }
export const viewport: Viewport = { colorScheme: 'dark', viewportFit: 'auto' }
export default function TeamLayout({ children }: { children: React.ReactNode }) { return children }
