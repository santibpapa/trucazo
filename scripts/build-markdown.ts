/**
 * Genera la versión en markdown de cada página pública.
 *
 * Corre DESPUÉS de `next build`, como parte de `npm run build`.
 *
 * ¿Por qué así y no escribiendo los .md a mano? Porque 16 archivos paralelos se
 * desincronizan: alguien corrige una regla en la página y se olvida del markdown.
 * Acá el markdown SALE de la página ya construida, así que no puede quedar viejo.
 *
 * Lo que se descarta: menús, botones, migas de pan y el bloque final de "jugá
 * ahora". Van marcados en el código con data-md="skip".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import TurndownService from 'turndown'
import { PUBLIC_ROUTES, markdownSlug } from '../src/lib/routes'

// domino arma un DOM en Node, para poder recorrer y podar el HTML como si
// estuviéramos en un navegador. Se carga así, y no con un import normal, porque
// el paquete publica sus tipos bajo el nombre viejo ('domino') y TypeScript no
// los reconoce como los de '@mixmark-io/domino'.
type Domino = { createWindow(html: string): { document: Document } }
const domino = createRequire(join(process.cwd(), 'package.json'))(
  '@mixmark-io/domino',
) as Domino

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.trucazo.com.ar').replace(/\/$/, '')

const BUILD_DIR = join(process.cwd(), '.next', 'server', 'app')
const OUT_DIR = join(process.cwd(), 'public', '_md')

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
})

// Las tablas son contenido importante acá (el orden de las cartas, los casos de
// parda). Turndown por defecto las aplana; esta regla las pasa a tabla markdown.
turndown.addRule('tabla', {
  filter: 'table',
  replacement: (_content, node) => {
    const rows = Array.from((node as HTMLTableElement).querySelectorAll('tr'))
    if (rows.length === 0) return ''

    const toCells = (row: Element) =>
      Array.from(row.querySelectorAll('th, td')).map(cell =>
        (cell.textContent ?? '').trim().replace(/\s+/g, ' ').replace(/\|/g, '\\|'),
      )

    const [headerRow, ...bodyRows] = rows
    const header = toCells(headerRow)
    if (header.length === 0) return ''

    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${header.map(() => '---').join(' | ')} |`,
      ...bodyRows.map(row => {
        const cells = toCells(row)
        while (cells.length < header.length) cells.push('')
        return `| ${cells.join(' | ')} |`
      }),
    ]
    return `\n\n${lines.join('\n')}\n\n`
  },
})

// En la home, las tarjetas de "Guías" son un enlace que envuelve un título y un
// párrafo. Turndown lo pasa tal cual y queda ilegible: un corchete suelto, adentro
// el título, y la dirección abajo de todo. Esta regla lo da vuelta y deja el
// título enlazado, que es como se escribiría a mano.
turndown.addRule('tarjetaEnlazada', {
  filter: node =>
    node.nodeName === 'A' && node.querySelector('h1, h2, h3, h4, h5, h6') !== null,
  replacement: (_content, node) => {
    const el = node as HTMLAnchorElement
    const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
    if (!heading) return ''

    const nivel = Number(heading.nodeName.charAt(1))
    const titulo = (heading.textContent ?? '').trim()
    const href = el.getAttribute('href') ?? ''

    // Lo que queda del texto de la tarjeta una vez sacado el título.
    heading.remove()
    const resto = (el.textContent ?? '').trim().replace(/\s+/g, ' ')

    const encabezado = `${'#'.repeat(nivel)} [${titulo}](${href})`
    return `\n\n${encabezado}${resto ? `\n\n${resto}` : ''}\n\n`
  },
})

/** Saca de la página todo lo que no es contenido legible. */
function limpiar(main: Element, document: Document) {
  const descartables = [
    '[data-md="skip"]',
    'script',
    'style',
    'noscript',
    'svg',
    'button',
    'form',
    'template',
  ]
  for (const selector of descartables) {
    // Array.from: la lista que devuelve domino no es un array de verdad y no
    // tiene forEach. Además hay que copiarla antes de ir borrando elementos.
    Array.from(main.querySelectorAll(selector)).forEach(el => el.remove())
  }

  // Los enlaces relativos no le sirven a un agente que lee el markdown suelto:
  // se convierten en direcciones completas.
  Array.from(main.querySelectorAll('a[href]')).forEach(link => {
    const href = link.getAttribute('href') ?? ''
    if (href.startsWith('/')) link.setAttribute('href', `${SITE_URL}${href}`)
  })

  // Las imágenes decorativas (sin texto alternativo) no aportan nada en texto.
  Array.from(main.querySelectorAll('img')).forEach(img => {
    if (!(img.getAttribute('alt') ?? '').trim()) img.remove()
  })

  return document
}

function htmlAMarkdown(html: string, url: string): string {
  const document = domino.createWindow(html).document
  const main = document.querySelector('main')
  if (!main) throw new Error('la página no tiene un <main>')

  limpiar(main, document)

  const cuerpo = turndown
    .turndown(main.innerHTML)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return `${cuerpo}\n\n---\n\nPágina original: ${url}\n`
}

function generar(slugArchivo: string, salida: string, url: string) {
  const origen = join(BUILD_DIR, `${slugArchivo}.html`)

  // Si falta el HTML, se rompe el build a propósito. Es preferible a publicar en
  // silencio un markdown viejo o incompleto.
  if (!existsSync(origen)) {
    throw new Error(
      `No encontré ${origen}.\n` +
      `  Esa página tiene que quedar estática en el build para poder generar su markdown.\n` +
      `  Si la volviste dinámica, sacala de PUBLIC_ROUTES en src/lib/routes.ts.`,
    )
  }

  const markdown = htmlAMarkdown(readFileSync(origen, 'utf8'), url)
  writeFileSync(join(OUT_DIR, `${salida}.md`), markdown, 'utf8')
  return markdown.length
}

// ---------------------------------------------------------------
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

let total = 0
for (const route of PUBLIC_ROUTES) {
  const slug = markdownSlug(route.path)
  const largo = generar(slug, slug, `${SITE_URL}${route.path}`)
  total += largo
  console.log(`  ${route.path === '' ? '/' : route.path} → _md/${slug}.md (${largo} caracteres)`)
}

// La página 404 también, para que un agente que se pierde pueda recuperarse.
generar('_not-found', '404', `${SITE_URL}/404`)
console.log(`  404 → _md/404.md`)

console.log(`\nMarkdown generado: ${PUBLIC_ROUTES.length + 1} archivos, ${total} caracteres.`)
