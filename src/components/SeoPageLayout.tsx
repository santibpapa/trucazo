import Link from 'next/link'
import { Logo, buttonClass } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import TrackedLink from '@/components/TrackedLink'
import { CONTENT_UPDATED_AT, EDITOR_NAME } from '@/lib/seo'

// Marco de las páginas públicas de contenido (las que Google indexa):
// una barra arriba con el logo y un botón para jugar, el contenido, y un
// cierre invitando a registrarse. Mismo look que el resto del sitio.
export default function SeoPageLayout({
  title,
  intro,
  children,
  breadcrumb,
  showPlayCta = true,
  showByline = true,
}: {
  title: string
  intro: string
  children: React.ReactNode
  breadcrumb?: string
  showPlayCta?: boolean
  showByline?: boolean
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-line">
        <Link href="/" aria-label="Ir al inicio de Trucazo">
          <Logo size="sm" />
        </Link>
        <GuestButton
          variant="primary"
          size="sm"
          label="Jugar ahora"
          source="seo_header"
          fullWidth={false}
        />
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {breadcrumb ? (
          <nav aria-label="Migas de pan" className="mb-5 text-sm text-subtle">
            <Link href="/" className="hover:text-gold transition-colors">
              Inicio
            </Link>{' '}
            <span aria-hidden="true">›</span>{' '}
            <span aria-current="page">{breadcrumb}</span>
          </nav>
        ) : null}
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-cream tracking-tight text-balance">
          {title}
        </h1>
        <p className="mt-4 text-lg text-muted text-balance">{intro}</p>
        {showByline ? (
          <p className="mt-3 text-xs text-subtle">
            Revisado por {EDITOR_NAME} · Actualizado el{' '}
            <time dateTime={CONTENT_UPDATED_AT}>15 de agosto de 2026</time>
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-10">{children}</div>

        {/* Cierre: invitación a jugar */}
        {showPlayCta ? <section className="mt-14 rounded-2xl border border-gold/30 bg-gold-soft/40 px-6 py-8 text-center">
          <h2 className="font-display font-bold text-2xl text-cream">
            ¿Listo para la mesa?
          </h2>
          <p className="mt-2 text-muted">
            Jugá al truco 1 contra 1, gratis y sin descargar nada. Cada jugador
            nuevo arranca con 1.000 monedas.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="w-full sm:w-auto sm:min-w-56">
              <GuestButton
                variant="primary"
                size="lg"
                label="Jugar sin registrarme"
                source="seo_footer"
              />
            </div>
            <TrackedLink
              href="/register"
              event="register_cta_click"
              source="seo_footer"
              className={buttonClass('ghost', 'lg')}
            >
              Crear cuenta
            </TrackedLink>
          </div>
        </section> : null}
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
          <Link href="/orden-cartas-truco" className="hover:text-gold transition-colors">
            Orden de cartas
          </Link>
          <Link href="/calculadora-envido" className="hover:text-gold transition-colors">
            Calculadora de envido
          </Link>
          <Link href="/acerca-de-trucazo" className="hover:text-gold transition-colors">
            Acerca de
          </Link>
          <Link href="/contacto" className="hover:text-gold transition-colors">
            Contacto
          </Link>
          <Link href="/privacidad" className="hover:text-gold transition-colors">
            Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-gold transition-colors">
            Términos
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
