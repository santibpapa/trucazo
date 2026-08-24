// Las páginas públicas del sitio, en UN solo lugar.
//
// Antes esta lista estaba escrita dos veces (en sitemap.ts y en llms.txt/route.ts)
// y ahora la necesita también la negociación de markdown, que sería la tercera.
// Al vivir acá, agregar una página nueva es tocar un solo archivo: aparece sola en
// el sitemap, en el llms.txt y en la versión markdown para agentes.
//
// El ORDEN importa: es el que sale en el sitemap.

export type RouteGroup = 'guia' | 'jugar' | 'institucional'

export type PublicRoute = {
  /** Sin barra final. La home es '' (cadena vacía). */
  path: string
  /** Nombre corto, como aparece listado en llms.txt. */
  label: string
  /** Una línea explicando qué encuentra alguien en esa página. */
  blurb: string
  group: RouteGroup
  /** Para el sitemap: qué tan importante es esta página dentro del sitio. */
  priority: number
  /** Para el sitemap: cada cuánto suele cambiar. */
  frequency: 'weekly' | 'monthly' | 'yearly'
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: '',
    label: 'Inicio',
    blurb: 'acceso al juego y resumen de modalidades.',
    group: 'guia',
    priority: 1,
    frequency: 'weekly',
  },
  {
    path: '/como-se-juega-al-truco',
    label: 'Cómo se juega al truco',
    blurb: 'guía central de reglas.',
    group: 'guia',
    priority: 0.9,
    frequency: 'monthly',
  },
  {
    path: '/jugar-al-truco-online-gratis',
    label: 'Jugar al truco online gratis',
    blurb: 'acceso, modalidades y requisitos.',
    group: 'guia',
    priority: 0.9,
    frequency: 'monthly',
  },
  {
    path: '/orden-cartas-truco',
    label: 'Orden de las cartas',
    blurb: 'jerarquía completa y ejemplos.',
    group: 'guia',
    priority: 0.9,
    frequency: 'monthly',
  },
  {
    path: '/calculadora-envido',
    label: 'Calculadora de envido',
    blurb: 'herramienta interactiva para calcular el tanto.',
    group: 'guia',
    priority: 0.9,
    frequency: 'monthly',
  },
  {
    path: '/envido-real-envido-falta-envido',
    label: 'Envido, real envido y falta envido',
    blurb: 'cantos, rechazos y puntajes.',
    group: 'guia',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/pardas-truco-reglas',
    label: 'Pardas',
    blurb: 'resolución de bazas empatadas.',
    group: 'guia',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/truco-dos-jugadores',
    label: 'Truco para dos jugadores',
    blurb: 'reglas del mano a mano.',
    group: 'guia',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/jugar-truco-sin-registrarse',
    label: 'Sin registrarse',
    blurb: 'entrar como invitado, sin crear cuenta.',
    group: 'jugar',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/jugar-truco-con-amigos',
    label: 'Con amigos',
    blurb: 'mesa privada con código para compartir.',
    group: 'jugar',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/truco-contra-computadora',
    label: 'Contra la computadora',
    blurb: 'partidas contra rivales controlados por la máquina.',
    group: 'jugar',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/modo-historia-truco',
    label: 'Modo Historia',
    blurb: 'campaña por provincias con dificultad creciente.',
    group: 'jugar',
    priority: 0.8,
    frequency: 'monthly',
  },
  {
    path: '/acerca-de-trucazo',
    label: 'Acerca de Trucazo',
    blurb: 'qué es el proyecto y sus principios editoriales.',
    group: 'institucional',
    priority: 0.5,
    frequency: 'yearly',
  },
  {
    path: '/contacto',
    label: 'Contacto',
    blurb: 'canales para reportar problemas o consultar.',
    group: 'institucional',
    priority: 0.4,
    frequency: 'yearly',
  },
  {
    path: '/privacidad',
    label: 'Política de privacidad',
    blurb: 'qué datos se usan y para qué.',
    group: 'institucional',
    priority: 0.3,
    frequency: 'yearly',
  },
  {
    path: '/terminos',
    label: 'Términos de uso',
    blurb: 'condiciones para usar el sitio.',
    group: 'institucional',
    priority: 0.3,
    frequency: 'yearly',
  },
]

/** Solo los caminos, para buscar rápido si una URL es contenido público. */
export const PUBLIC_PATHS: readonly string[] = PUBLIC_ROUTES.map(r => r.path)

export function routesInGroup(group: RouteGroup): PublicRoute[] {
  return PUBLIC_ROUTES.filter(route => route.group === group)
}

/**
 * Nombre del archivo markdown de una página, sin extensión.
 * La home no tiene path, así que se guarda como 'index'.
 */
export function markdownSlug(path: string): string {
  return path === '' ? 'index' : path.replace(/^\//, '')
}
