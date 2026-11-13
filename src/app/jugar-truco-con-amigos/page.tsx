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
          <li>En la sala de espera, compartí el enlace o el código de la mesa.</li>
          <li>Tus amigos entran con el enlace o con el código y la partida empieza.</li>
        </ol>
      </Section>

      <Section title="Tres formas de sumar a tus amigos">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-cream">Por enlace</h3>
            <p className="mt-1">
              En la sala de espera tocá <strong>Invitar por enlace</strong>. Con{' '}
              <strong>Compartir</strong> se abre el menú de tu celular para mandarlo por
              el chat que uses; con <strong>Copiar enlace</strong> lo pegás donde
              quieras. Quien lo abre ve quién creó la mesa, la apuesta, los puntos y el
              tiempo por jugada antes de aceptar. Puede entrar con su cuenta o como
              invitado, eligiendo un nombre.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">Por código</h3>
            <p className="mt-1">
              La sala de espera muestra el código de la mesa. Tu amigo lo escribe en el
              lobby, en <strong>Unirse con código</strong>. Sirve para pasarlo de palabra
              o por mensaje.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">Desde tu lista de amigos</h3>
            <p className="mt-1">
              Con cuenta podés agregar amigos por su nombre de usuario. La lista muestra
              quién está conectado o jugando, y el botón <strong>Invitar</strong> le
              manda la invitación sin salir del juego.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Cuándo empieza la partida">
        <p>
          En el mano a mano, la partida arranca sola cuando entra tu rival. En parejas,
          cada persona elige su lugar en la mesa: el de enfrente es su compañero. Cuando
          los cuatro lugares están ocupados, quien creó la mesa toca{' '}
          <strong>Empezar partida</strong>. Si son menos de cuatro, el creador puede
          poner bots en los lugares libres con <strong>Añadir bot</strong>, y sacarlos
          con <strong>Quitar bot</strong> si después llega alguien.
        </p>
        <p>
          El enlace y el código sirven mientras la mesa espera. Una mesa llena, ya
          empezada o cancelada no deja entrar a nadie más. Quien ya estaba sentado puede
          volver a su lugar sin pagar de nuevo.
        </p>
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
        <p>
          Una diferencia en la mesa: todos leen el chat, pero sólo quienes tienen cuenta
          pueden escribir. Los invitados se comunican con las frases rápidas.
        </p>
      </Section>

      <Section title="Monedas y revancha">
        <p>
          Cada persona pone la apuesta de la mesa, como mínimo 10 monedas, y el que gana
          se lleva el pozo. Son monedas ficticias: no valen plata ni se pueden pasar de
          una cuenta a otra. En el mano a mano, al terminar pueden pedir{' '}
          <strong>revancha</strong>: si los dos aceptan, arranca otra partida con la
          misma apuesta.
        </p>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-semibold text-cream">¿Mis amigos tienen que crear una cuenta?</h3>
            <p className="mt-1">
              No. Pueden entrar como invitados desde el enlace, eligiendo un nombre. La
              cuenta sólo hace falta para escribir en el chat y para guardar monedas e
              historial entre visitas.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">¿Cuánto dura una partida?</h3>
            <p className="mt-1">
              En los mano a mano jugados entre octubre y noviembre de 2026, la mitad de
              las partidas a 15 puntos terminó en menos de 4 minutos, y la mitad de las
              de 30 puntos, en menos de 7.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">¿Qué pasa si alguno se corta?</h3>
            <p className="mt-1">
              La partida sigue. Si a alguien se le vence el tiempo de su jugada, va al
              mazo en esa mano; al tercer vencimiento pierde la partida, y en parejas
              pierde su equipo. En el mano a mano, al volver a entrar, el lobby le ofrece{' '}
              <strong>Volver a la partida</strong>.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">¿Pueden ver la mesa personas desconocidas?</h3>
            <p className="mt-1">
              Una mesa privada no aparece en la lista del lobby. Sólo entra quien tenga
              el enlace o el código, mientras queden lugares libres.
            </p>
          </div>
        </div>
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
