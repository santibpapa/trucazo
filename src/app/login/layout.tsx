import type { Metadata } from 'next'
import { noIndexFollowMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Ingresá a tu cuenta de Trucazo.',
  ...noIndexFollowMetadata,
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
