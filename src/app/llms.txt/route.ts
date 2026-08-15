import { SITE_URL } from '@/lib/site'

// Documento opcional de orientación para clientes que decidan leerlo. No reemplaza
// al sitemap, el HTML público ni las directivas de rastreo, y no implica ranking.
export const dynamic = 'force-static'

export function GET() {
  const body = `# Trucazo

> Juego argentino de truco online, gratis y 1 contra 1. Funciona en el navegador, permite jugar contra personas o rivales controlados por computadora y utiliza monedas ficticias sin valor real.

## Páginas principales
- [Inicio](${SITE_URL}): acceso al juego y resumen de modalidades.
- [Jugar al truco online gratis](${SITE_URL}/jugar-al-truco-online-gratis): acceso, modalidades y requisitos.
- [Cómo se juega al truco](${SITE_URL}/como-se-juega-al-truco): guía central de reglas.
- [Orden de las cartas](${SITE_URL}/orden-cartas-truco): jerarquía completa y ejemplos.
- [Calculadora de envido](${SITE_URL}/calculadora-envido): herramienta interactiva para calcular el tanto.
- [Envido, real envido y falta envido](${SITE_URL}/envido-real-envido-falta-envido): cantos, rechazos y puntajes.
- [Pardas](${SITE_URL}/pardas-truco-reglas): resolución de bazas empatadas.
- [Truco para dos jugadores](${SITE_URL}/truco-dos-jugadores): reglas del mano a mano.

## Formas de jugar
- [Sin registrarse](${SITE_URL}/jugar-truco-sin-registrarse)
- [Con amigos](${SITE_URL}/jugar-truco-con-amigos)
- [Contra la computadora](${SITE_URL}/truco-contra-computadora)
- [Modo Historia](${SITE_URL}/modo-historia-truco)

## Sobre el juego
- Truco argentino, 1 contra 1, sin flor.
- Partidas a 15 puntos (corta) o 30 puntos (larga).
- Gratis: se juega con monedas ficticias, no con dinero real. Cada jugador nuevo arranca con 1.000 monedas.
- Plataforma: navegador web; se puede instalar como app (PWA).
- Proyecto y contacto: ${SITE_URL}/acerca-de-trucazo y ${SITE_URL}/contacto.
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
