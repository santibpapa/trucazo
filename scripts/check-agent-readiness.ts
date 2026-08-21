/**
 * Revisión de que el sitio siga siendo legible para agentes de IA.
 *
 * Corre en el CI después del build. No toca la red ni la base: lee el código y
 * los archivos que dejó el build.
 *
 *  1) El lector de la cabecera "Accept" (lo más delicado: si se equivoca, una
 *     persona con navegador termina viendo markdown crudo en pantalla).
 *  2) Que cada página pública tenga su versión markdown generada.
 *  3) Que la lista de páginas del sitemap no haya cambiado sin querer.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { preferredRepresentation } from '../src/lib/accept'
import { PUBLIC_ROUTES, markdownSlug } from '../src/lib/routes'

let failures = 0
function check(cond: boolean, msg: string) {
  if (cond) return
  failures++
  console.error('  ✗ ' + msg)
}

// ---------------------------------------------------------------
// 1) El lector de "Accept"
// ---------------------------------------------------------------
console.log('Lector de la cabecera Accept')

// Lo que manda un agente que quiere markdown.
check(preferredRepresentation('text/markdown') === 'markdown', 'text/markdown → markdown')
check(
  preferredRepresentation('text/markdown, text/html;q=0.8') === 'markdown',
  'markdown preferido sobre html con menos peso → markdown',
)
check(
  preferredRepresentation('text/markdown;q=1.0, text/html;q=0.9') === 'markdown',
  'pesos explícitos, markdown gana → markdown',
)

// EL CASO QUE IMPORTA: el Accept real de Chrome. Trae "*/*" al final, y un lector
// ingenuo lo tomaría como permiso para mandar markdown. Tiene que dar HTML.
check(
  preferredRepresentation(
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  ) === 'html',
  'Accept real de Chrome → html (si esto falla, las personas ven markdown crudo)',
)
check(
  preferredRepresentation('text/html,application/xhtml+xml,*/*;q=0.8') === 'html',
  'Accept de navegador abreviado → html',
)

// Comodines y casos sueltos.
check(preferredRepresentation('*/*') === 'html', 'comodín total → html')
check(preferredRepresentation('text/*') === 'html', 'comodín de subtipo → html')
check(preferredRepresentation('text/html') === 'html', 'text/html → html')
check(preferredRepresentation(null) === 'html', 'sin cabecera → html')
check(preferredRepresentation('') === 'html', 'cabecera vacía → html')
check(preferredRepresentation('   ') === 'html', 'cabecera con espacios → html')

// El peso manda por encima del orden en que vienen escritos.
check(
  preferredRepresentation('text/markdown;q=0.5, text/html;q=0.9') === 'html',
  'html con más peso gana aunque markdown venga primero → html',
)

// Lo específico le gana al comodín cuando empatan en peso.
check(
  preferredRepresentation('*/*, text/markdown') === 'markdown',
  'markdown explícito le gana al comodín con igual peso → markdown',
)

// q=0 significa "esto no me lo mandes".
check(
  preferredRepresentation('text/html;q=0, text/markdown') === 'markdown',
  'html rechazado con q=0 → markdown',
)

// Cuando solo aceptan algo que no producimos, no hay que disimular: es 406.
check(
  preferredRepresentation('application/pdf') === null,
  'formato que no producimos → null (para responder 406)',
)

// Mayúsculas y espacios raros no deberían romper nada.
check(
  preferredRepresentation('TEXT/MARKDOWN') === 'markdown',
  'mayúsculas → markdown',
)
check(
  preferredRepresentation('  text/markdown ;  q=0.9 , text/html ; q=0.2 ') === 'markdown',
  'espacios de más → markdown',
)

// Un q roto se ignora y vale el valor por defecto, no rompe.
check(
  preferredRepresentation('text/markdown;q=abc') === 'markdown',
  'peso inválido se ignora → markdown',
)

// Cuando solo ofrecemos HTML, un pedido de markdown no puede colarse.
check(
  preferredRepresentation('text/markdown', ['html']) === null,
  'markdown pedido pero solo hay html → null',
)

// ---------------------------------------------------------------
// 2) Versión markdown de cada página
// ---------------------------------------------------------------
const mdDir = join(process.cwd(), 'public', '_md')

if (!existsSync(mdDir)) {
  console.log('\nVersiones markdown: se saltea (todavía no se corrió el build)')
} else {
  console.log('\nVersiones markdown')
  for (const route of PUBLIC_ROUTES) {
    const file = join(mdDir, `${markdownSlug(route.path)}.md`)
    const label = route.path === '' ? '/ (inicio)' : route.path
    if (!existsSync(file)) {
      check(false, `falta el markdown de ${label}`)
      continue
    }
    const body = readFileSync(file, 'utf8').trim()
    check(body.length > 200, `el markdown de ${label} quedó demasiado corto (${body.length} caracteres)`)
    check(body.includes('#'), `el markdown de ${label} no tiene ningún título`)
  }

  const notFound = join(mdDir, '404.md')
  check(existsSync(notFound), 'falta el markdown de la página 404')
}

// ---------------------------------------------------------------
// 3) El sitemap no cambió sin querer
// ---------------------------------------------------------------
console.log('\nLista de páginas del sitemap')

// Foto de las 16 páginas tal como se publican hoy. Si agregás una página nueva,
// sumala acá a propósito: este test existe para que no se muevan solas.
const EXPECTED: [string, number][] = [
  ['', 1],
  ['/como-se-juega-al-truco', 0.9],
  ['/jugar-al-truco-online-gratis', 0.9],
  ['/orden-cartas-truco', 0.9],
  ['/calculadora-envido', 0.9],
  ['/envido-real-envido-falta-envido', 0.8],
  ['/pardas-truco-reglas', 0.8],
  ['/truco-dos-jugadores', 0.8],
  ['/jugar-truco-sin-registrarse', 0.8],
  ['/jugar-truco-con-amigos', 0.8],
  ['/truco-contra-computadora', 0.8],
  ['/modo-historia-truco', 0.8],
  ['/acerca-de-trucazo', 0.5],
  ['/contacto', 0.4],
  ['/privacidad', 0.3],
  ['/terminos', 0.3],
]

check(
  PUBLIC_ROUTES.length === EXPECTED.length,
  `el sitemap tiene ${PUBLIC_ROUTES.length} páginas y se esperaban ${EXPECTED.length}`,
)
EXPECTED.forEach(([path, priority], i) => {
  const actual = PUBLIC_ROUTES[i]
  check(actual?.path === path, `posición ${i}: se esperaba "${path}" y hay "${actual?.path}"`)
  check(
    actual?.priority === priority,
    `prioridad de "${path}": se esperaba ${priority} y hay ${actual?.priority}`,
  )
})

// Que no se cuelen caminos mal escritos.
for (const route of PUBLIC_ROUTES) {
  check(
    route.path === '' || (route.path.startsWith('/') && !route.path.endsWith('/')),
    `el camino "${route.path}" tiene que empezar con / y no terminar en /`,
  )
}

// ---------------------------------------------------------------
if (failures > 0) {
  console.error(`\n${failures} revisión(es) fallaron.`)
  process.exit(1)
}
console.log('\nTodo en orden.')
