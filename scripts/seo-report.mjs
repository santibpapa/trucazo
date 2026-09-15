/**
 * Informe de SEO cada dos semanas.
 *
 * Baja los datos de Google Search Console, los compara contra las dos semanas
 * anteriores y escribe un informe en castellano. Lo corre solo GitHub Actions
 * (.github/workflows/seo.yml), que después lo publica como "issue" del repo.
 *
 * NO usa ninguna librería de Google: la autenticación de una cuenta de servicio
 * son treinta líneas de criptografía que Node ya trae. Menos dependencias que
 * mantener y menos superficie por donde romperse.
 *
 * La llave NUNCA está en el código: llega por la variable GOOGLE_SERVICE_ACCOUNT_JSON,
 * que vive en los "Secrets" de GitHub.
 */
import { createSign } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const SITIO = process.env.SITE_URL ?? 'https://www.trucazo.com.ar'
const SALIDA = process.env.REPORT_PATH ?? 'informe-seo.md'

// Días que tarda Google en tener los datos completos. Si pedimos hasta hoy,
// los últimos días vienen a medias y parece que el tráfico se cayó.
const RETRASO_DE_GOOGLE = 3
const VENTANA = 28

// Búsquedas de marca: gente que ya conoce Trucazo y lo busca por nombre.
// Se incluyen los errores de tipeo frecuentes que aparecieron en los datos.
const MARCA = /trucazo|trucaso|trulcoz|trucloz|trucolz|trucozolano|troncazo|trucaz/i

// ---------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------
function base64url(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url')
}

async function conseguirToken(credenciales) {
  const ahora = Math.floor(Date.now() / 1000)
  const sinFirmar =
    base64url({ alg: 'RS256', typ: 'JWT' }) +
    '.' +
    base64url({
      iss: credenciales.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: ahora,
      exp: ahora + 3600,
    })

  let firma
  try {
    firma = createSign('RSA-SHA256')
      .update(sinFirmar)
      .sign(credenciales.private_key)
      .toString('base64url')
  } catch {
    // Es el error más común al configurar esto: la llave llega cortada o con los
    // saltos de línea rotos. El mensaje de Node para esto es indescifrable
    // ("DECODER routines::unsupported"), así que lo traducimos.
    throw new Error(
      'La llave privada del archivo JSON no se pudo leer.\n' +
      '  Casi siempre es porque el contenido se pegó incompleto o se rompieron los\n' +
      '  saltos de línea. Volvé a GitHub → Settings → Secrets → GOOGLE_SERVICE_ACCOUNT_JSON\n' +
      '  y pegá de nuevo el archivo ENTERO, tal cual lo descargaste, sin editarlo.',
    )
  }

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${sinFirmar}.${firma}`,
    }),
  })

  const datos = await respuesta.json()
  if (!respuesta.ok) {
    throw new Error(
      `Google rechazó la llave (${respuesta.status}): ${datos.error_description ?? datos.error}\n` +
      `  Revisá que el contenido del secreto GOOGLE_SERVICE_ACCOUNT_JSON sea el archivo JSON completo.`,
    )
  }
  return datos.access_token
}

async function googleApi(token, url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    throw new Error(`${respuesta.status} en ${url}: ${datos.error?.message ?? 'sin detalle'}`)
  }
  return datos
}

// ---------------------------------------------------------------
// Fechas y datos
// ---------------------------------------------------------------
function comoFecha(d) {
  return d.toISOString().slice(0, 10)
}

function calcularPeriodos() {
  const fin = new Date()
  fin.setUTCDate(fin.getUTCDate() - RETRASO_DE_GOOGLE)
  const inicio = new Date(fin)
  inicio.setUTCDate(inicio.getUTCDate() - (VENTANA - 1))

  const finPrevio = new Date(inicio)
  finPrevio.setUTCDate(finPrevio.getUTCDate() - 1)
  const inicioPrevio = new Date(finPrevio)
  inicioPrevio.setUTCDate(inicioPrevio.getUTCDate() - (VENTANA - 1))

  return {
    actual: { desde: comoFecha(inicio), hasta: comoFecha(fin) },
    previo: { desde: comoFecha(inicioPrevio), hasta: comoFecha(finPrevio) },
  }
}

async function consultar(token, propiedad, periodo, dimensiones) {
  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(propiedad)}/searchAnalytics/query`

  const datos = await googleApi(token, url, {
    method: 'POST',
    body: JSON.stringify({
      startDate: periodo.desde,
      endDate: periodo.hasta,
      dimensions: dimensiones,
      rowLimit: 500,
      dataState: 'final',
    }),
  })
  return datos.rows ?? []
}

function totales(filas) {
  return filas.reduce(
    (acc, f) => ({
      clics: acc.clics + f.clicks,
      impresiones: acc.impresiones + f.impressions,
      // La posición se pondera por impresiones: una búsqueda con 500 impresiones
      // pesa más que una con 2. El promedio simple mentiría.
      pesoPosicion: acc.pesoPosicion + f.position * f.impressions,
    }),
    { clics: 0, impresiones: 0, pesoPosicion: 0 },
  )
}

function resumen(filas) {
  const t = totales(filas)
  return {
    clics: t.clics,
    impresiones: t.impresiones,
    ctr: t.impresiones ? (t.clics / t.impresiones) * 100 : 0,
    posicion: t.impresiones ? t.pesoPosicion / t.impresiones : 0,
  }
}

// ---------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------
function flecha(actual, previo, masEsMejor = true) {
  const dif = actual - previo
  if (Math.abs(dif) < 0.0001) return '='
  const sube = dif > 0
  const bien = masEsMejor ? sube : !sube
  const signo = sube ? '+' : ''
  return `${bien ? '🟢' : '🔴'} ${signo}${dif.toFixed(dif % 1 === 0 ? 0 : 1)}`
}

function tabla(encabezados, filas) {
  if (filas.length === 0) return '_Sin datos._\n'
  return [
    `| ${encabezados.join(' | ')} |`,
    `| ${encabezados.map(() => '---').join(' | ')} |`,
    ...filas.map(f => `| ${f.join(' | ')} |`),
  ].join('\n') + '\n'
}

// Search Console y el sitemap no siempre escriben la misma dirección igual: la
// portada aparece con barra final en uno y sin ella en el otro. Las dos listas
// de páginas del informe se cruzan entre sí, así que tienen que normalizarse
// igual o la portada se contaría como una página sin datos.
function comoRuta(url) {
  return url.replace(SITIO, '').replace(/\/$/, '') || '/'
}

// La primera frase del informe. Tiene que hablar de la gente que NO te conocía:
// el total de clics lo infla la gente que ya te busca por nombre, y un titular
// en verde puede estar tapando que no llegó nadie nuevo.
function veredicto(ahora, antes) {
  const clics = `${ahora} ${ahora === 1 ? 'clic' : 'clics'}`
  const dif = ahora - antes
  if (dif === 0) return `**${clics} de gente que no te conocía**, los mismos que el período anterior.`
  return `**${clics} de gente que no te conocía**, ${Math.abs(dif)} ${dif > 0 ? 'más' : 'menos'} que el período anterior.`
}

// ---------------------------------------------------------------
// Salud del sitio en vivo
// ---------------------------------------------------------------
async function revisarSitio() {
  const problemas = []

  const respSitemap = await fetch(`${SITIO}/sitemap.xml`)
  if (!respSitemap.ok) {
    problemas.push(`El sitemap no responde (HTTP ${respSitemap.status}).`)
    return { problemas, revisadas: 0, urls: [] }
  }

  const urls = [...(await respSitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  if (urls.length === 0) problemas.push('El sitemap está vacío.')

  for (const url of urls) {
    const r = await fetch(url, { redirect: 'manual' })
    if (r.status !== 200) problemas.push(`${url} devuelve HTTP ${r.status} (debería ser 200).`)
  }

  // Una dirección inventada tiene que dar 404. Si da 200, los buscadores creen
  // que existen infinitas páginas.
  const inexistente = await fetch(`${SITIO}/pagina-que-no-existe-${Date.now()}`, { redirect: 'manual' })
  if (inexistente.status !== 404) {
    problemas.push(`Una dirección inexistente devuelve HTTP ${inexistente.status} en vez de 404.`)
  }

  // La versión markdown para agentes.
  const md = await fetch(`${SITIO}/como-se-juega-al-truco`, {
    headers: { Accept: 'text/markdown' },
  })
  if (!(md.headers.get('content-type') ?? '').includes('text/markdown')) {
    problemas.push('Las páginas dejaron de servirse en markdown para los agentes de IA.')
  }

  return { problemas, revisadas: urls.length, urls }
}

// ---------------------------------------------------------------
async function main() {
  const crudo = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!crudo) throw new Error('Falta la variable GOOGLE_SERVICE_ACCOUNT_JSON.')

  let credenciales
  try {
    credenciales = JSON.parse(crudo)
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido.\n' +
      '  Tiene que ser el CONTENIDO COMPLETO del archivo que descargaste de Google,\n' +
      '  desde la primera llave { hasta la última }.',
    )
  }

  for (const campo of ['client_email', 'private_key']) {
    if (!credenciales[campo]) {
      throw new Error(
        `Al JSON le falta el campo "${campo}".\n` +
        '  ¿Seguro que es el archivo de la CUENTA DE SERVICIO? Si dice "installed" o\n' +
        '  "web" adentro, es un archivo de OAuth y no sirve para esto.',
      )
    }
  }

  const token = await conseguirToken(credenciales)

  // Qué propiedades ve esta cuenta de servicio.
  const sitios = await googleApi(token, 'https://searchconsole.googleapis.com/webmasters/v3/sites')
  const disponibles = (sitios.siteEntry ?? []).map(s => s.siteUrl)

  if (disponibles.length === 0) {
    throw new Error(
      'La llave funciona, pero esta cuenta de servicio no tiene acceso a ninguna propiedad.\n' +
      `  Entrá a Search Console → Configuración → Usuarios y permisos y agregá:\n` +
      `    ${credenciales.client_email}\n` +
      '  con permiso "Restringido".',
    )
  }

  // Con verificación por DNS la propiedad es de dominio y se llama "sc-domain:...".
  const propiedad =
    disponibles.find(s => s.startsWith('sc-domain:')) ??
    disponibles.find(s => s.includes('trucazo')) ??
    disponibles[0]

  const { actual, previo } = calcularPeriodos()

  const [totalHoy, totalAntes, consultasHoy, consultasAntes, paginasHoy] = await Promise.all([
    consultar(token, propiedad, actual, []),
    consultar(token, propiedad, previo, []),
    consultar(token, propiedad, actual, ['query']),
    consultar(token, propiedad, previo, ['query']),
    consultar(token, propiedad, actual, ['page']),
  ])

  const hoy = resumen(totalHoy)
  const antes = resumen(totalAntes)

  const marcaHoy = resumen(consultasHoy.filter(f => MARCA.test(f.keys[0])))
  const marcaAntes = resumen(consultasAntes.filter(f => MARCA.test(f.keys[0])))
  const otroHoy = resumen(consultasHoy.filter(f => !MARCA.test(f.keys[0])))
  const otroAntes = resumen(consultasAntes.filter(f => !MARCA.test(f.keys[0])))

  const posicionAntes = new Map(consultasAntes.map(f => [f.keys[0], f.position]))
  const impresionesHoy = new Map(consultasHoy.map(f => [f.keys[0], f.impressions]))

  // Búsquedas que se apagaron. Las "caídas" de acá abajo sólo ven las que siguen
  // apareciendo pero peor: si una desaparece del todo, sale de la lista actual y
  // nadie se entera. Ésta mira al revés, desde el período anterior hacia acá.
  const desaparecidas = consultasAntes
    .filter(f => f.impressions >= 15 && (impresionesHoy.get(f.keys[0]) ?? 0) < f.impressions / 4)
    .map(f => ({ q: f.keys[0], antes: f.impressions, hoy: impresionesHoy.get(f.keys[0]) ?? 0 }))
    .sort((a, b) => b.antes - a.antes)
    .slice(0, 10)

  // Caídas fuertes de posición en búsquedas que ya tenían volumen.
  const caidas = consultasHoy
    .filter(f => f.impressions >= 10 && posicionAntes.has(f.keys[0]))
    .map(f => ({ q: f.keys[0], hoy: f.position, antes: posicionAntes.get(f.keys[0]), imp: f.impressions }))
    .filter(f => f.hoy - f.antes > 10)
    .sort((a, b) => b.hoy - b.antes - (a.hoy - a.antes))
    .slice(0, 10)

  // Oportunidades: mucha gente te ve, nadie te toca, y estás cerca de la primera página.
  const oportunidades = consultasHoy
    .filter(f => f.clicks === 0 && f.impressions >= 15 && f.position <= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  const salud = await revisarSitio()

  // Páginas publicadas que Google no mostró ni una vez. No salen en la tabla de
  // páginas justamente porque no tienen datos, así que hay que buscarlas en el
  // sitemap: son las que más laburo desperdiciado representan.
  const conDatos = new Set(paginasHoy.map(f => comoRuta(f.keys[0])))
  const enCero = salud.urls.map(comoRuta).filter(r => !conDatos.has(r))

  // ---------------------------------------------------------------
  const l = []
  l.push(`# Informe de SEO — ${actual.desde} al ${actual.hasta}`)
  l.push('')
  l.push(`Comparado contra las 4 semanas anteriores (${previo.desde} al ${previo.hasta}).`)
  l.push(`Propiedad: \`${propiedad}\``)
  l.push('')

  if (salud.problemas.length > 0) {
    l.push('## 🚨 Problemas técnicos')
    l.push('')
    l.push('Esto conviene mirarlo ya:')
    l.push('')
    salud.problemas.forEach(p => l.push(`- ${p}`))
    l.push('')
  } else {
    l.push(`✅ Revisión técnica sin problemas (${salud.revisadas} páginas, todas responden bien).`)
    l.push('')
  }

  l.push('## Lo que importa: gente nueva')
  l.push('')
  l.push(veredicto(otroHoy.clics, otroAntes.clics))
  l.push('')
  l.push(tabla(
    ['', 'Clics ahora', 'Clics antes', 'Cambio'],
    [
      ['Gente nueva', otroHoy.clics, otroAntes.clics, flecha(otroHoy.clics, otroAntes.clics)],
      ['Te buscaban por nombre', marcaHoy.clics, marcaAntes.clics, flecha(marcaHoy.clics, marcaAntes.clics)],
    ],
  ))
  l.push('_"Gente nueva" son los que no te conocían: buscaron "truco online" o algo parecido y te encontraron._')
  const sinDetalle = hoy.clics - marcaHoy.clics - otroHoy.clics
  if (sinDetalle > 0) {
    l.push(
      `_Esos dos números suman ${marcaHoy.clics + otroHoy.clics} y no ${hoy.clics}: los ${sinDetalle} que faltan ` +
      'son búsquedas tan poco frecuentes que Google no dice cuáles fueron._',
    )
  }
  l.push('')

  l.push('## Los números')
  l.push('')
  l.push(tabla(
    ['', 'Ahora', 'Antes', 'Cambio'],
    [
      ['Clics', hoy.clics, antes.clics, flecha(hoy.clics, antes.clics)],
      ['Impresiones', hoy.impresiones, antes.impresiones, flecha(hoy.impresiones, antes.impresiones)],
      ['CTR', `${hoy.ctr.toFixed(2)}%`, `${antes.ctr.toFixed(2)}%`, flecha(hoy.ctr, antes.ctr)],
      ['Posición media', hoy.posicion.toFixed(1), antes.posicion.toFixed(1), flecha(hoy.posicion, antes.posicion, false)],
    ],
  ))
  l.push('_Impresiones = cuántas veces apareciste en Google. Clics = cuántas veces te tocaron._')
  l.push('_En "posición media" un número más bajo es mejor: 1 es el primer resultado._')
  l.push('_Ojo con el total de clics: incluye a la gente que te busca por nombre, así que puede subir sin que haya llegado nadie nuevo._')
  l.push('')

  l.push('## Las 10 búsquedas que más clics traen')
  l.push('')
  l.push(tabla(
    ['Búsqueda', 'Clics', 'Impresiones', 'Posición'],
    consultasHoy
      .slice()
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 10)
      .map(f => [f.keys[0], f.clicks, f.impressions, f.position.toFixed(1)]),
  ))

  l.push('## Oportunidades: te ven pero no te tocan')
  l.push('')
  l.push('Búsquedas donde ya aparecés pero nadie entra. Suele ser porque estás en la segunda o tercera página.')
  l.push('')
  l.push(tabla(
    ['Búsqueda', 'Impresiones', 'Posición'],
    oportunidades.map(f => [f.keys[0], f.impressions, f.position.toFixed(1)]),
  ))

  if (caidas.length > 0) {
    l.push('## ⚠️ Búsquedas que se cayeron')
    l.push('')
    l.push(tabla(
      ['Búsqueda', 'Antes', 'Ahora', 'Impresiones'],
      caidas.map(f => [f.q, f.antes.toFixed(1), f.hoy.toFixed(1), f.imp]),
    ))
  }

  if (desaparecidas.length > 0) {
    l.push('## ⚠️ Búsquedas que dejaron de aparecer')
    l.push('')
    l.push('Antes te mostraban en estas búsquedas y ahora casi no, o directamente no.')
    l.push('')
    l.push(tabla(
      ['Búsqueda', 'Impresiones antes', 'Impresiones ahora'],
      desaparecidas.map(f => [f.q, f.antes, f.hoy]),
    ))
  }

  l.push('## Páginas que traen gente')
  l.push('')
  l.push(tabla(
    ['Página', 'Clics', 'Impresiones', 'Posición'],
    paginasHoy
      .slice()
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 10)
      .map(f => [comoRuta(f.keys[0]), f.clicks, f.impressions, f.position.toFixed(1)]),
  ))

  if (enCero.length > 0) {
    l.push('## Páginas que Google todavía no muestra')
    l.push('')
    l.push(`De las ${salud.urls.length} páginas del sitio, éstas no aparecieron ni una sola vez en el buscador:`)
    l.push('')
    enCero.forEach(r => l.push(`- ${r}`))
    l.push('')
    l.push(
      'Están publicadas y listadas en el sitemap. Si una lleva más de un mes acá, pedile a Google que la mire: ' +
      'entrá a Search Console, pegá la dirección en la barra de arriba y apretá "Solicitar indexación".',
    )
    l.push('')
  }

  l.push('---')
  l.push('')
  l.push('Si algo de acá te llama la atención, traelo a una conversación con Claude y lo miramos en detalle.')

  const informe = l.join('\n')
  writeFileSync(SALIDA, informe, 'utf8')
  console.log(informe)
}

main().catch(error => {
  console.error(`\n❌ ${error.message}\n`)
  process.exit(1)
})
