import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/jugar-truco-con-amigos'
const title = 'Jugar al truco online con amigos: mesa privada'
const description =
  'Creá una mesa privada de truco, compartí el código y jugá 1 contra 1 o en parejas 2 vs 2 desde el navegador, a 15 o 30 puntos.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function ConAmigosPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Jugar al truco online con amigos"
      breadcrumb="Jugar al truco con amigos"
      intro="Creá una mesa privada, elegí sus reglas y compartí el código. Puede ser mano a mano o, si son cuatro, en parejas 2 vs 2. Cuando entran, la partida empieza en el navegador de todos."
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR' }} />
      <JsonLd data={createBreadcrumbJsonLd('Jugar al truco con amigos', path)} />
      <PlayNowBlock text="Entrá al lobby y elegí “Crear mesa” para generar una partida privada." source="con_amigos_hero" />

      <Section title="Cómo crear la partida privada">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>Entrá como invitado o con tu cuenta.</li>
          <li>En el lobby, abrí la opción para crear una mesa.</li>
          <li>Elegí la modalidad: mano a mano o 2 vs 2 en parejas.</li>
          <li>Elegí partida privada, puntaje objetivo y tiempo por jugada.</li>
          <li>Compartí el código que aparece en la sala de espera.</li>
          <li>Tus amigos usan ese código para unirse y comenzar.</li>
        </ol>
      </Section>

      <Section title="Qué puede configurarse">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-semibold text-gold">Puntaje</h3><p className="mt-1 text-sm text-muted">Partida corta a 15 o completa a 30 puntos.</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-semibold text-gold">Tiempo</h3><p className="mt-1 text-sm text-muted">Límite por jugada para mantener el ritmo de la mesa.</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-semibold text-gold">Privacidad</h3><p className="mt-1 text-sm text-muted">El código evita que un desconocido ocupe la mesa por búsqueda pública.</p></div>
          <div className="rounded-2xl border border-line bg-surface p-5"><h3 className="font-semibold text-gold">Apuesta ficticia</h3><p className="mt-1 text-sm text-muted">Las monedas del juego no representan dinero real.</p></div>
        </div>
      </Section>

      <Section title="Cuenta o invitado">
        <p>
          Todos pueden entrar como invitados para una partida rápida. Si quieren guardar
          historial, monedas, amistades o revancha entre visitas, conviene usar cuentas.
          El registro no es necesario para probar el flujo. En una mesa en parejas, los
          lugares que falten se completan con bots.
        </p>
      </Section>

      <Section title="Repasar antes de jugar">
        <p>
          Trucazo se juega sin flor, mano a mano o en parejas. Pueden revisar las{' '}
          <Link href="/truco-dos-jugadores" className="text-gold underline underline-offset-2">reglas para dos jugadores</Link>,
          las del{' '}
          <Link href="/truco-en-parejas" className="text-gold underline underline-offset-2">truco en parejas</Link>{' '}
          y la{' '}
          <Link href="/envido-real-envido-falta-envido" className="text-gold underline underline-offset-2">tabla de cantos del envido</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
