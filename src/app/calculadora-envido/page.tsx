import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import EnvidoCalculator from './EnvidoCalculator'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/calculadora-envido'
const title = 'Calculadora de envido: calculá tus puntos'
const description =
  'Elegí tus tres cartas y calculá el envido al instante. Incluye explicación de la cuenta, ejemplos y un enlace para compartir la mano.'

export const metadata = createPublicMetadata({ title, description, path })

export default function CalculadoraEnvidoPage() {
  return (
    <SeoPageLayout
      title="Calculadora de envido"
      breadcrumb="Calculadora de envido"
      intro="Elegí las tres cartas de tu mano. La calculadora encuentra automáticamente la mejor combinación válida y te explica de dónde sale el resultado."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Calculadora de envido', path)} />

      <EnvidoCalculator />

      <Section title="Cómo se calcula">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>1, 2, 3, 4, 5, 6 y 7 valen su número.</li>
          <li>10, 11 y 12 valen cero para el envido.</li>
          <li>Dos cartas del mismo palo suman sus valores más 20.</li>
          <li>Con tres del mismo palo se toman las dos que más suman.</li>
          <li>Sin dos del mismo palo, vale la carta numérica más alta.</li>
        </ul>
      </Section>

      <Section title="Ejemplos rápidos">
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="?c1=oro-7&c2=oro-6&c3=espada-1" className="rounded-2xl border border-line bg-surface p-4 hover:border-gold/50">
            <h3 className="font-semibold text-cream">7 y 6 de oro</h3>
            <p className="mt-1 text-sm text-muted">7 + 6 + 20 = 33, el máximo.</p>
          </a>
          <a href="?c1=copa-5&c2=copa-12&c3=basto-7" className="rounded-2xl border border-line bg-surface p-4 hover:border-gold/50">
            <h3 className="font-semibold text-cream">5 y 12 de copa</h3>
            <p className="mt-1 text-sm text-muted">5 + 0 + 20 = 25.</p>
          </a>
          <a href="?c1=espada-7&c2=oro-6&c3=copa-5" className="rounded-2xl border border-line bg-surface p-4 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Tres palos distintos</h3>
            <p className="mt-1 text-sm text-muted">Vale la más alta: 7.</p>
          </a>
          <a href="?c1=basto-10&c2=oro-11&c3=espada-12" className="rounded-2xl border border-line bg-surface p-4 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Tres figuras distintas</h3>
            <p className="mt-1 text-sm text-muted">Todas valen cero: el tanto es 0.</p>
          </a>
        </div>
      </Section>

      <Section title="Después de calcular el tanto">
        <p>
          Tener un envido alto no obliga a cantarlo y tener uno bajo no impide mentir.
          Para entender cuánto vale cada desafío y qué pasa si se rechaza, consultá la{' '}
          <Link href="/envido-real-envido-falta-envido" className="text-gold underline underline-offset-2">
            guía de envido, real envido y falta envido
          </Link>
          .
        </p>
      </Section>

      <Section title="Privacidad de la herramienta">
        <p>
          El cálculo se realiza en tu navegador. Las cartas elegidas se escriben en la
          URL únicamente para que puedas guardar o compartir el ejemplo; no hace falta
          iniciar sesión.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
