import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/jugar-truco-sin-registrarse'
const title = 'Jugar al truco sin registrarse: modo invitado'
const description =
  'Probá Trucazo sin crear una cuenta. Entrá como invitado, conocé el lobby y jugá al truco argentino desde el navegador.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description,
  url: SITE_URL + path,
  inLanguage: 'es-AR',
}

export default function SinRegistroPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Jugar al truco sin registrarse"
      breadcrumb="Jugar sin registrarse"
      intro="El modo invitado crea un perfil temporal y te lleva al lobby sin pedir email ni contraseña. Sirve para probar una partida antes de decidir si querés una cuenta."
    >
      <JsonLd data={pageJsonLd} />
      <JsonLd data={createBreadcrumbJsonLd('Jugar al truco sin registrarse', path)} />
      <PlayNowBlock
        title="Entrar como invitado"
        text="Se crea una sesión anónima y temporal con 1.000 monedas ficticias."
        source="sin_registro_hero"
      />

      <Section title="Qué podés hacer como invitado">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Entrar al lobby y jugar partidas 1 contra 1 o en parejas 2 vs 2.</li>
          <li>Elegir mesas a 15 o 30 puntos.</li>
          <li>Usar envido, real envido, falta envido y toda la cadena del truco.</li>
          <li>
            Crear una mesa privada y pasarle el enlace a tus amigos, que también pueden
            entrar sin cuenta. Está explicado en{' '}
            <Link href="/jugar-truco-con-amigos" className="text-gold underline underline-offset-2">jugar con amigos</Link>.
          </li>
          <li>
            Practicar contra la computadora y probar el{' '}
            <Link href="/modo-historia-truco" className="text-gold underline underline-offset-2">Modo Historia</Link>.
          </li>
          <li>Leer el chat de la mesa y mandar frases rápidas.</li>
        </ul>
      </Section>

      <Section title="Qué queda para las cuentas">
        <p>
          Algunas funciones necesitan saber quién sos de una visita a la otra, o que
          alguien responda por lo que se escribe. Por eso piden una cuenta registrada:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Escribir mensajes en el chat de la mesa. El invitado los lee, pero no escribe.</li>
          <li>Anotarse en torneos. Como invitado podés verlos, pero no inscribirte.</li>
          <li>Sumar progreso en las misiones del día y cobrar sus premios.</li>
          <li>
            Guardar entre visitas tu nombre, monedas, historial, amistades, grupos,
            personalización, medallas y avance del Modo Historia.
          </li>
        </ul>
      </Section>

      <Section title="Cuánto dura una visita de invitado">
        <p>
          La sesión de invitado sigue abierta mientras uses Trucazo. Si cerrás el
          navegador y volvés más de un minuto y medio después, esa visita se da por
          terminada: entrás como un invitado nuevo, con otras 1.000 monedas y sin el
          historial anterior. Si recargás la página enseguida, seguís siendo el mismo
          invitado.
        </p>
        <p>
          Si estabas en una partida y se te cortó, volvé a entrar cuanto antes: cada
          jugada tiene 15 o 30 segundos, según la mesa. En el mano a mano, el lobby te
          ofrece volver a la partida en curso.
        </p>
      </Section>

      <Section title="Si después querés una cuenta">
        <p>
          Si te registrás durante la misma visita, lo que jugaste como invitado pasa a
          tu cuenta: monedas, historial y avance del Modo Historia. Si tenés menos de
          1.000 monedas, te completamos hasta 1.000, lo mismo que recibe cualquier
          cuenta nueva. Ahí también elegís tu nombre de usuario, en lugar del Invitado
          con número.
        </p>
        <p>
          Podés crearla con email y contraseña o con tu cuenta de Google. Si ese email o
          esa cuenta de Google ya tenían un usuario en Trucazo, no se pueden juntar: al
          entrar con la cuenta vieja, lo jugado como invitado no se suma. Y si la visita
          de invitado ya se cerró, la cuenta arranca de cero con sus 1.000 monedas.
        </p>
      </Section>

      <Section title="Si te quedás sin monedas">
        <p>
          La apuesta mínima de una mesa es de 10 monedas. Si te quedan menos, el lobby
          muestra el botón <strong>Reclamar 100</strong> para que sigas jugando. Las
          monedas son ficticias: no se compran ni se cambian por dinero.
        </p>
      </Section>

      <Section title="Privacidad del modo invitado">
        <p>
          No solicita email ni contraseña. El sistema igualmente necesita crear un
          identificador anónimo y un perfil temporal para ubicarte en una partida,
          actualizar el marcador y aplicar las reglas del juego. Consultá la{' '}
          <Link href="/privacidad" className="text-gold underline underline-offset-2">política de privacidad</Link>{' '}
          para conocer los datos técnicos utilizados.
        </p>
      </Section>

      <Section title="Antes de la primera partida">
        <p>
          Si nunca jugaste, guardá a mano el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>{' '}
          y la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>.
          La guía de{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">reglas completas</Link>{' '}
          explica el resto.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
