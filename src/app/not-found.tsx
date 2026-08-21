import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import { routesInGroup } from '@/lib/routes'
import { noIndexFollowMetadata } from '@/lib/seo'

// Página que se muestra cuando alguien entra a una dirección que no existe.
//
// Next devuelve el código 404 solo; lo que faltaba era el contenido. Antes salía
// la pantalla de fábrica de Next, en inglés y sin un solo enlace, así que ni una
// persona ni un agente de IA tenían por dónde seguir. Ahora ofrece salidas.
//
// No se indexa (es una página de error), pero sí se siguen sus enlaces.
export const metadata = noIndexFollowMetadata

const guias = routesInGroup('guia').filter(route => route.path !== '')

export default function NotFound() {
  return (
    <SeoPageLayout
      title="Esta página no existe"
      intro="La dirección que abriste no corresponde a ninguna página de Trucazo. Puede que el enlace esté mal escrito o que la página haya cambiado de lugar. Abajo están las salidas."
      showByline={false}
    >
      <Section title="Guías del truco">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          {guias.map(route => (
            <li key={route.path}>
              <Link
                href={route.path}
                className="text-gold underline underline-offset-2"
              >
                {route.label}
              </Link>
              : {route.blurb}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Para programas y agentes">
        <p>
          Si llegaste acá de forma automática, el índice completo del sitio está en{' '}
          <a href="/sitemap.xml" className="text-gold underline underline-offset-2">
            /sitemap.xml
          </a>{' '}
          y hay un resumen legible en{' '}
          <a href="/llms.txt" className="text-gold underline underline-offset-2">
            /llms.txt
          </a>
          , que explica qué contiene cada página y cuándo conviene usar Trucazo.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
