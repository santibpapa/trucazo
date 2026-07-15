import { SITE_URL } from '@/lib/site'

// llms.txt: un resumen en texto plano para asistentes de IA (ChatGPT, Perplexity,
// etc.). Les explica qué es Trucazo y cuáles son las páginas buenas, para que nos
// entiendan y citen mejor. Estándar emergente (llmstxt.org). Se sirve en /llms.txt.
export const dynamic = 'force-static'

export function GET() {
  const body = `# Trucazo

> Truco argentino online, gratis y 1 contra 1, contra rivales de verdad. Se juega desde el navegador (celular o compu), sin descargar nada y con monedas ficticias. El de siempre, como siempre.

## Páginas principales
- [Jugar al truco online gratis](${SITE_URL}/jugar-al-truco-online-gratis): cómo empezar a jugar, gratis y 1 contra 1.
- [Cómo se juega al truco](${SITE_URL}/como-se-juega-al-truco): las reglas desde cero — orden de las cartas, envido, truco, retruco y vale cuatro.

## Sobre el juego
- Truco argentino, 1 contra 1, sin flor.
- Partidas a 15 puntos (corta) o 30 puntos (larga).
- Gratis: se juega con monedas ficticias, no con dinero real. Cada jugador nuevo arranca con 1.000 monedas.
- Plataforma: navegador web; se puede instalar como app (PWA).
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
