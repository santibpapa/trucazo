import type { Metadata } from 'next'
import { noIndexFollowMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Creá una cuenta de Trucazo para guardar tu progreso.',
  ...noIndexFollowMetadata,
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
