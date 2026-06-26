import { Panel } from '@/components/ui'

// Se muestra al instante mientras la ruta del juego carga (datos en prod,
// compilación on-demand en dev). Evita la sensación de pantalla congelada.
export default function GameLoading() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
      <Panel className="w-full max-w-sm p-8 text-center flex flex-col items-center gap-4 animate-fade-up">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:200ms]" />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:400ms]" />
        </span>
        <p className="text-sm text-muted">Cargando la mesa…</p>
      </Panel>
    </main>
  )
}
