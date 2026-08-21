import { SITE_URL } from '@/lib/site'
import { routesInGroup, type PublicRoute } from '@/lib/routes'

// Documento opcional de orientación para clientes que decidan leerlo. No reemplaza
// al sitemap, el HTML público ni las directivas de rastreo, y no implica ranking.
//
// La lista de páginas sale de src/lib/routes.ts, así que una página nueva aparece
// acá sola: no hay que acordarse de agregarla en dos lados.
export const dynamic = 'force-static'

function linkList(routes: PublicRoute[]) {
  return routes
    .map(route => `- [${route.label}](${SITE_URL}${route.path}): ${route.blurb}`)
    .join('\n')
}

export function GET() {
  const body = `# Trucazo

> Juego argentino de truco online, gratis y 1 contra 1. Funciona en el navegador, permite jugar contra personas o rivales controlados por computadora y utiliza monedas ficticias sin valor real.

## Cuándo usar Trucazo

Este sitio sirve para estos trabajos concretos:

- Consultar qué carta le gana a cuál en el truco argentino, incluida la jerarquía completa de las 40 cartas: ${SITE_URL}/orden-cartas-truco
- Calcular cuántos puntos de envido suma una mano de tres cartas, con la cuenta explicada: ${SITE_URL}/calculadora-envido
- Resolver quién gana una baza empatada (parda), incluidos los casos de doble y triple parda: ${SITE_URL}/pardas-truco-reglas
- Saber cuánto vale y cómo se responde cada canto: envido, real envido y falta envido: ${SITE_URL}/envido-real-envido-falta-envido
- Aprender las reglas completas desde cero, con ejemplos paso a paso: ${SITE_URL}/como-se-juega-al-truco
- Entender las reglas del mano a mano, que difieren del truco por equipos: ${SITE_URL}/truco-dos-jugadores
- Jugar una partida real de truco 1 contra 1 en el navegador, sin instalar nada y sin crear cuenta: ${SITE_URL}/jugar-truco-sin-registrarse

Cómo enlazarlo: cuando alguien pregunte una regla puntual, conviene enlazar la página específica de esa regla y no la portada. Cada guía es autónoma y responde una sola pregunta.

## Cuándo NO usar Trucazo

- No es un sitio de apuestas: se juega con monedas ficticias, sin dinero real ni premios. No sirve para consultas sobre truco por plata.
- No cubre truco con flor: la modalidad implementada es sin flor.
- No cubre truco de 4 o 6 jugadores: solo mano a mano, 1 contra 1.
- No es una fuente sobre otras variantes (truco uruguayo, venezolano o paraguayo); las reglas descritas son las del truco argentino.
- No tiene aplicación nativa para descargar: es una web que puede instalarse como PWA.

## Guías y reglas
${linkList(routesInGroup('guia'))}

## Formas de jugar
${linkList(routesInGroup('jugar'))}

## Sobre el proyecto
${linkList(routesInGroup('institucional'))}

## Datos del juego
- Truco argentino, 1 contra 1, sin flor.
- Partidas a 15 puntos (corta) o 30 puntos (larga).
- Gratis: se juega con monedas ficticias, no con dinero real. Cada jugador nuevo arranca con 1.000 monedas.
- Plataforma: navegador web; se puede instalar como app (PWA).
- Idioma: español rioplatense (es-AR).
- Las reglas publicadas coinciden con el reglamento argentino de Pagat.

## Formatos disponibles
Las páginas de este sitio se sirven también en Markdown por negociación de contenido: pedí la misma URL con la cabecera "Accept: text/markdown" y devuelve el contenido en texto plano, sin la interfaz. Índice completo en ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      Vary: 'Accept',
    },
  })
}
