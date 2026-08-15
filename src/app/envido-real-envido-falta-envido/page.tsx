import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { createArticleJsonLd, createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/envido-real-envido-falta-envido'
const title = 'Envido, real envido y falta envido: puntos y respuestas'
const description =
  'Qué vale el envido, el real envido y la falta envido; cómo se suman, qué pasa al no querer y ejemplos de puntaje.'

export const metadata = createPublicMetadata({ title, description, path })

const rows = [
  ['Envido', '2', '1'],
  ['Real envido directo', '3', '1'],
  ['Envido + envido', '4', '2 si se rechaza el segundo'],
  ['Envido + real envido', '5', '2 si se rechaza el real'],
  ['Envido + envido + real envido', '7', '4 si se rechaza el real'],
  ['Falta envido', 'Lo que le falta al puntero', '1 si fue directa; si hubo cantos, lo previamente aceptado'],
]

export default function EnvidoPage() {
  return (
    <SeoPageLayout
      title="Envido, real envido y falta envido"
      breadcrumb="Envido, real envido y falta envido"
      intro="El envido compara los tantos de cada mano. Los cantos pueden aceptarse, rechazarse o subirse, y su valor cambia según la cadena. Acá usamos la modalidad 1 contra 1 implementada por Trucazo."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Envido, real envido y falta envido', path)} />

      <Section title="Respuesta corta">
        <p>
          Un envido aceptado vale 2 puntos y un real envido directo vale 3. Si se
          encadenan, sus valores se suman. La falta envido aceptada vale lo que le falta
          al jugador que va adelante para ganar la partida. Un primer canto rechazado
          entrega 1 punto; una subida rechazada entrega el valor que ya estaba aceptado.
        </p>
      </Section>

      <Section title="Tabla de cantos y puntajes">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-surface2 text-cream">
              <tr><th className="p-3">Cadena</th><th className="p-3">Si se quiere</th><th className="p-3">Si no se quiere</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(row => (
                <tr key={row[0]}><th scope="row" className="p-3 font-medium text-cream">{row[0]}</th><td className="p-3">{row[1]}</td><td className="p-3 text-muted">{row[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Qué respuestas existen">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li><strong>Quiero:</strong> acepta el valor actual y pasa a comparar tantos.</li>
          <li><strong>No quiero:</strong> cierra el envido y concede los puntos correspondientes.</li>
          <li><strong>Envido:</strong> puede repetir el desafío una vez sobre un envido.</li>
          <li><strong>Real envido:</strong> sube un envido pendiente en 3 puntos.</li>
          <li><strong>Falta envido:</strong> es la subida máxima y sólo admite quiero o no quiero.</li>
        </ul>
      </Section>

      <Section title="Ejemplos completos">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Envido — quiero</h3>
            <p className="mt-1">Se comparan los tantos y quien gana suma 2 puntos.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Envido — real envido — no quiero</h3>
            <p className="mt-1">Quien cantó el real suma 2 puntos: el envido anterior ya estaba aceptado por la subida.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Falta envido en una mesa a 30</h3>
            <p className="mt-1">Si el marcador es 22 a 17, la falta aceptada vale 8: es lo que le falta al puntero para llegar a 30.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Falta envido en una mesa a 15</h3>
            <p className="mt-1">Con marcador 10 a 7, vale 5: la distancia entre el puntero y el objetivo corto.</p>
          </div>
        </div>
      </Section>

      <Section title="Cuándo puede cantarse">
        <p>
          Se canta en la primera baza antes de jugar la propia carta. Si alguien cantó
          truco y el envido todavía era válido, el rival puede llamar envido antes de
          responder; primero se resuelve el tanto y después continúa el truco.
        </p>
      </Section>

      <Section title="Cómo se comparan los tantos">
        <p>
          La mano declara primero. El pie puede superar ese número o decir “son buenas”.
          Si ambos tienen el mismo tanto, gana la mano. Quien gana debe poder mostrar las
          cartas que forman el puntaje.
        </p>
        <p>
          Usá la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>{' '}
          para probar ejemplos o volvé a las{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">reglas completas</Link>.
        </p>
      </Section>

      <Section title="Variantes de mesa">
        <p>
          La falta envido tiene variantes tradicionales, en especial al distinguir malas
          y buenas. Trucazo usa una regla única y verificable: resta al objetivo de 15 o
          30 el puntaje del jugador que va adelante.
        </p>
      </Section>

      <Section title="Fuente">
        <p>
          Contenido contrastado con la lógica pública de Trucazo y el{' '}
          <a href="https://www.pagat.com/put/truco_ar.html" className="text-gold underline underline-offset-2" rel="noopener noreferrer">reglamento de truco argentino de Pagat</a>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
