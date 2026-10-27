import { useEffect, type ComponentType } from 'react'
import Link from 'next/link'
import { Panel } from '../../../src/components/ui'
import Page0 from '../../../src/app/como-se-juega-al-truco/page'
import Page1 from '../../../src/app/orden-cartas-truco/page'
import Page2 from '../../../src/app/envido-real-envido-falta-envido/page'
import Page3 from '../../../src/app/pardas-truco-reglas/page'
import Page4 from '../../../src/app/calculadora-envido/page'
import Page5 from '../../../src/app/truco-dos-jugadores/page'
import Page6 from '../../../src/app/truco-en-parejas/page'
import Page7 from '../../../src/app/truco-contra-computadora/page'
import Page8 from '../../../src/app/jugar-truco-con-amigos/page'
import Page9 from '../../../src/app/jugar-truco-sin-registrarse/page'
import Page10 from '../../../src/app/modo-historia-truco/page'
import Page11 from '../../../src/app/acerca-de-trucazo/page'
import Page12 from '../../../src/app/contacto/page'
import Page13 from '../../../src/app/privacidad/page'
import Page14 from '../../../src/app/terminos/page'
import ThirdPartyNotices from './ThirdPartyNotices'

export const publicPages: Record<string, ComponentType> = {
  '/licencias': ThirdPartyNotices,
  '/como-se-juega-al-truco': Page0,
  '/orden-cartas-truco': Page1,
  '/envido-real-envido-falta-envido': Page2,
  '/pardas-truco-reglas': Page3,
  '/calculadora-envido': Page4,
  '/truco-dos-jugadores': Page5,
  '/truco-en-parejas': Page6,
  '/truco-contra-computadora': Page7,
  '/jugar-truco-con-amigos': Page8,
  '/jugar-truco-sin-registrarse': Page9,
  '/modo-historia-truco': Page10,
  '/acerca-de-trucazo': Page11,
  '/contacto': Page12,
  '/privacidad': Page13,
  '/terminos': Page14,
}
export default function PublicContent({ path }: { path: string }) {
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>('a[href^="https://"], a[href^="mailto:"]').forEach(anchor => {
      if (anchor.dataset.external) return
      anchor.dataset.external = 'true'
      anchor.append(' · enlace externo')
    })
  }, [path])
  const Page = publicPages[path]
  return <><nav className="flex gap-5 px-5 pt-4 text-sm text-gold"><Link href="/lobby">← Volver al lobby</Link><Link href="/ayuda">Ayuda y soporte</Link></nav>{Page ? <Page /> : <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-5"><h1 className="font-display text-2xl font-bold">Ayuda y soporte</h1><Panel className="flex flex-col gap-4 p-5">{[
    ['/como-se-juega-al-truco', 'Cómo se juega al truco'], ['/orden-cartas-truco', 'Orden de cartas'],
    ['/envido-real-envido-falta-envido', 'Envido, real envido y falta envido'], ['/pardas-truco-reglas', 'Pardas'],
    ['/calculadora-envido', 'Calculadora de envido'], ['/truco-dos-jugadores', 'Truco mano a mano'],
    ['/truco-en-parejas', 'Truco en parejas'], ['/truco-contra-computadora', 'Jugar contra la computadora'],
    ['/jugar-truco-con-amigos', 'Jugar con amigos'], ['/jugar-truco-sin-registrarse', 'Acceso desde la web'],
    ['/modo-historia-truco', 'Modo Historia'], ['/resena', 'Enviar una reseña con imágenes'],
    ['/email/preferencias', 'Preferencias de email'], ['/acerca-de-trucazo', 'Acerca de Trucazo'],
    ['/contacto', 'Contacto y soporte'], ['/convivencia', 'Convivencia, denuncias y bloqueos'], ['/privacidad', 'Privacidad'], ['/terminos', 'Términos'], ['/licencias', 'Licencias de componentes'],
  ].map(([href, label]) => <Link className="text-gold" key={href} href={href}>{label}</Link>)}</Panel></main>}</>
}
