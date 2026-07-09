import type { Viewport } from 'next'

// La mesa maneja su propio alto (fixed inset-0) y layout delicado, así que NO usa
// viewport-fit:cover: se queda dentro de la zona segura del teléfono, como antes.
// (El resto de la app sí usa cover; ver src/app/layout.tsx.)
export const viewport: Viewport = { colorScheme: 'dark', viewportFit: 'auto' }

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children
}
