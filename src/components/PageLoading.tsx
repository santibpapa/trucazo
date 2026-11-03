import { Panel } from '@/components/ui'

// Aparece al instante mientras el servidor arma la pantalla, para que tocar un
// botón nunca parezca no haber hecho nada. Sin animación de entrada: tiene que
// verse desde el primer cuadro.
export default function PageLoading({ text }: { text: string }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6" aria-busy="true">
      <Panel className="w-full max-w-sm p-8 text-center flex flex-col items-center gap-4">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:200ms]" />
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:400ms]" />
        </span>
        <p className="text-sm text-muted">{text}</p>
      </Panel>
    </main>
  )
}
