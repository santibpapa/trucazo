import Link from 'next/link'
import { Logo, buttonClass } from '@/components/ui'

// Marco de las páginas públicas de contenido (las que Google indexa):
// una barra arriba con el logo y un botón para jugar, el contenido, y un
// cierre invitando a registrarse. Mismo look que el resto del sitio.
export default function SeoPageLayout({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-line">
        <Link href="/" aria-label="Ir al inicio de Trucazo">
          <Logo size="sm" />
        </Link>
        <Link href="/register" className={buttonClass('primary', 'sm')}>
          Jugar gratis
        </Link>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-cream tracking-tight text-balance">
          {title}
        </h1>
        <p className="mt-4 text-lg text-muted text-balance">{intro}</p>

        <div className="mt-10 flex flex-col gap-10">{children}</div>

        {/* Cierre: invitación a jugar */}
        <section className="mt-14 rounded-2xl border border-gold/30 bg-gold-soft/40 px-6 py-8 text-center">
          <h2 className="font-display font-bold text-2xl text-cream">
            ¿Listo para la mesa?
          </h2>
          <p className="mt-2 text-muted">
            Jugá al truco 1 contra 1, gratis y sin descargar nada. Cada jugador
            nuevo arranca con 1.000 monedas.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className={buttonClass('primary', 'lg')}>
              Crear cuenta gratis
            </Link>
            <Link href="/login" className={buttonClass('ghost', 'lg')}>
              Ya tengo cuenta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 sm:px-8 py-6 text-sm text-subtle">
        <nav className="max-w-2xl mx-auto flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/" className="hover:text-gold transition-colors">
            Inicio
          </Link>
          <Link
            href="/como-se-juega-al-truco"
            className="hover:text-gold transition-colors"
          >
            Cómo se juega al truco
          </Link>
          <Link
            href="/jugar-al-truco-online-gratis"
            className="hover:text-gold transition-colors"
          >
            Jugar al truco online gratis
          </Link>
        </nav>
      </footer>
    </div>
  )
}

// Bloques de contenido reutilizables, para que las páginas queden prolijas.
export function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-display font-bold text-2xl text-cream tracking-tight">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-cream/90 leading-relaxed">
        {children}
      </div>
    </section>
  )
}
