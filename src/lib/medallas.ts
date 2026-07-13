// Catálogo de medallas para PRESENTACIÓN (emoji, nombre, descripción). El listado
// está espejado en SQL (tabla `medals` de la migración 20260709_medallas.sql): si
// cambiás uno, cambiá el otro. Quién ganó qué y las medallas "vivas" las decide el
// servidor (funciones award_event_medals / player_medals); esto solo dibuja.

export interface MedalMeta {
  slug: string
  name: string
  description: string
  emoji: string
  /** 'event' = permanente (se gana una vez); 'live' = viva (según tu puesto actual). */
  kind: 'event' | 'live'
}

export const MEDALS: MedalMeta[] = [
  { slug: 'primera',      name: 'Primera victoria',    description: 'Ganaste tu primera partida.',                               emoji: '🥇', kind: 'event' },
  { slug: 'barrida',      name: 'La Barrida',          description: 'Ganaste una partida sin dejar que el rival sume un punto.', emoji: '🧹', kind: 'event' },
  { slug: 'racha',        name: 'Racha de fuego',      description: 'Ganaste 5 partidas seguidas.',                              emoji: '🔥', kind: 'event' },
  { slug: 'veterano',     name: 'Veterano',            description: 'Jugaste 100 partidas.',                                     emoji: '🎖️', kind: 'event' },
  { slug: 'millonario',   name: 'Millonario',          description: 'Juntaste 10.000 monedas.',                                  emoji: '💰', kind: 'event' },
  { slug: 'conquistador', name: 'Conquistador',        description: 'Completaste una provincia entera de la campaña.',           emoji: '🗺️', kind: 'event' },
  { slug: 'top10',        name: 'Top 10',              description: 'Estás entre los 10 mejores por partidas ganadas.',          emoji: '🏆', kind: 'live' },
  { slug: 'top5_campana', name: 'Top 5 de la campaña', description: 'Estás entre los 5 mejores del Ranking de Argentina.',       emoji: '🇦🇷', kind: 'live' },
  { slug: 'rey',          name: 'Rey de Argentina',    description: 'Sos el número 1 del Ranking de Argentina.',                 emoji: '👑', kind: 'live' },
]

const BY_SLUG: Record<string, MedalMeta> = Object.fromEntries(MEDALS.map(m => [m.slug, m]))

/** Metadatos de una medalla por slug, o null si no existe / 'ninguno'. */
export function getMedal(slug?: string | null): MedalMeta | null {
  if (!slug || slug === 'ninguno') return null
  return BY_SLUG[slug] ?? null
}
