import Link from 'next/link'
import { Logo, CoinIcon, buttonClass } from '@/components/ui'
import GuestButton from '@/components/GuestButton'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-10 p-6 text-center">
      <div className="flex flex-col items-center gap-5 animate-fade-up">
        <Logo size="lg" />
        <p className="text-muted max-w-xs text-balance">
          Truco argentino 1 contra 1, con monedas ficticias. Sentate a la mesa.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-up">
        <Link href="/login" className={buttonClass('primary', 'lg', true)}>
          Iniciar sesión
        </Link>
        <Link href="/register" className={buttonClass('ghost', 'lg', true)}>
          Crear cuenta
        </Link>

        <div className="flex items-center gap-3 py-1 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
        </div>

        <GuestButton variant="secondary" size="lg" />
      </div>

      <p className="inline-flex items-center gap-2 text-sm text-subtle animate-fade-up">
        Cada jugador nuevo arranca con
        <span className="inline-flex items-center gap-1.5 text-gold font-semibold">
          <CoinIcon size={14} /> 1.000
        </span>
      </p>
    </main>
  )
}
