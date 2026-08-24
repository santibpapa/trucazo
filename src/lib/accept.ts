// Lector de la cabecera HTTP "Accept".
//
// Cuando alguien pide una página, el navegador (o el agente de IA) manda una lista
// de formatos que sabe leer, ordenados por preferencia. Un agente que prefiere texto
// plano manda "text/markdown"; un navegador manda una lista larga que termina en
// "*/*" ("mandame cualquier cosa").
//
// OJO, acá está la trampa: la forma fácil de programar esto sería preguntar si el
// texto contiene "text/markdown". Está MAL. Chrome manda:
//
//   text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
//
// y ese "*/*" significa "lo que tengas", no "quiero markdown". Un lector ingenuo le
// terminaría mostrando markdown crudo a una persona. Por eso acá se parsea de verdad:
// se leen los pesos (q=), se ordena, y el comodín pierde contra lo específico.
//
// Convención: https://acceptmarkdown.com — el tipo "text/markdown" es el de RFC 7763.

export type Representation = 'markdown' | 'html'

type AcceptEntry = {
  type: string
  subtype: string
  /** Peso de 0 a 1: cuánto prefiere el cliente este formato. */
  quality: number
  // Cuán concreto es el pedido: 2 = tipo y subtipo exactos, 1 = subtipo comodín,
  // 0 = todo comodín. Lo concreto le gana al comodín cuando empatan en peso.
  specificity: number
  /** Posición original, para desempatar sin cambiar el orden que mandó el cliente. */
  order: number
}

function parseAcceptHeader(header: string): AcceptEntry[] {
  const entries: AcceptEntry[] = []

  header.split(',').forEach((raw, order) => {
    const [mediaRange, ...params] = raw.split(';')
    const trimmed = mediaRange.trim().toLowerCase()
    if (!trimmed) return

    const [type, subtype] = trimmed.split('/')
    if (!type || !subtype) return

    // El peso q= es opcional; si no viene, vale 1 (máxima preferencia).
    let quality = 1
    for (const param of params) {
      const [key, value] = param.split('=')
      if (key?.trim().toLowerCase() !== 'q') continue
      const parsed = Number.parseFloat(value ?? '')
      // Un q inválido se ignora y queda el valor por defecto.
      if (Number.isFinite(parsed)) quality = Math.min(Math.max(parsed, 0), 1)
    }

    const specificity = type === '*' ? 0 : subtype === '*' ? 1 : 2

    entries.push({ type, subtype, quality, specificity, order })
  })

  return entries
}

function matches(entry: AcceptEntry, type: string, subtype: string): boolean {
  if (entry.type === '*') return true
  if (entry.type !== type) return false
  return entry.subtype === '*' || entry.subtype === subtype
}

/**
 * Decide qué formato servir, entre los que sabemos producir.
 *
 * Devuelve null cuando el cliente pidió explícitamente algo que no tenemos y no
 * dejó ninguna alternativa aceptable: ahí corresponde responder 406, no mandarle
 * HTML disimulando que le hicimos caso.
 */
export function preferredRepresentation(
  acceptHeader: string | null | undefined,
  available: readonly Representation[] = ['html', 'markdown'],
): Representation | null {
  // Sin cabecera (o vacía) el estándar dice que sirve cualquier cosa: damos HTML.
  if (!acceptHeader || !acceptHeader.trim()) {
    return available.includes('html') ? 'html' : (available[0] ?? null)
  }

  const entries = parseAcceptHeader(acceptHeader)
  if (entries.length === 0) {
    return available.includes('html') ? 'html' : (available[0] ?? null)
  }

  const mediaTypes: Record<Representation, [string, string]> = {
    markdown: ['text', 'markdown'],
    html: ['text', 'html'],
  }

  let best: { representation: Representation; entry: AcceptEntry } | null = null

  for (const representation of available) {
    const [type, subtype] = mediaTypes[representation]

    // De todas las líneas que aceptan este formato, nos quedamos con la mejor:
    // primero el peso más alto, después la más específica.
    let bestEntry: AcceptEntry | null = null
    for (const entry of entries) {
      if (!matches(entry, type, subtype)) continue
      if (entry.quality === 0) continue // q=0 significa "esto no lo quiero".
      if (
        !bestEntry ||
        entry.quality > bestEntry.quality ||
        (entry.quality === bestEntry.quality && entry.specificity > bestEntry.specificity)
      ) {
        bestEntry = entry
      }
    }

    if (!bestEntry) continue

    if (
      !best ||
      bestEntry.quality > best.entry.quality ||
      (bestEntry.quality === best.entry.quality &&
        bestEntry.specificity > best.entry.specificity)
    ) {
      best = { representation, entry: bestEntry }
    }
  }

  return best?.representation ?? null
}
