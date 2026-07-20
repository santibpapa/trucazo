// Frases del rival de campaña en la mesa ("table talk"). Solo presentación:
// la frase sale en el globito de emote del rival; no toca reglas ni servidor.
//
// Reglas de uso (las aplica fraseDelBot):
//  - El bot habla ~la mitad de las veces que pasa algo importante.
//  - Sus frases PROPIAS salen como mucho UNA vez por partida cada una
//    (el llamador guarda las usadas); las generales se pueden repetir.
//  - Don Salvador, el Mudo, no habla nunca: su silencio es la firma.

export type MomentoFrase =
  | 'canta_truco'    // canta truco
  | 'sube'           // canta retruco / vale cuatro
  | 'quiere'         // acepta un canto tuyo (truco o envido)
  | 'no_quiere'      // rechaza un canto tuyo
  | 'canta_envido'   // canta envido / real envido / falta envido
  | 'mazo'           // se va al mazo
  | 'gana_partida'
  | 'pierde_partida'

const GENERALES: Record<MomentoFrase, string[]> = {
  canta_truco: ['¿Te animás?', 'Vamos a ver qué traés', 'Truco, sin vueltas', '¿Jugamos en serio?'],
  sube: ['Acá nadie se achica', '¿Querías guerra? Tomá'],
  quiere: ['Quiero, vení nomás', 'Acá te espero', 'Dale, mostrá'],
  no_quiere: ['No, esta te la regalo', 'Llevátela', 'Hoy no', 'Ni loco'],
  canta_envido: ['¿Cuántas traés?', 'Envido… tranquilo', 'Para picar algo'],
  mazo: ['Me voy, no tengo nada', 'No estoy ligando nada eh'],
  gana_partida: ['Buen partido. Volvé cuando quieras', 'Se jugó bien igual, eh'],
  pierde_partida: ['Me ganaste bien', 'Esta te la llevás vos… la próxima no'],
}

// Frases propias de cada rival (por slug), en el momento donde encajan.
const PROPIAS: Record<string, Partial<Record<MomentoFrase, string[]>>> = {
  novato:      { canta_truco: ['¿Truco se puede cantar ya?'], quiere: ['Uy, me temblaron las cartas…'] },
  colectivero: { canta_truco: ['Subite que arranco'], sube: ['Este ramal no para, papá'] },
  vecina:      { canta_envido: ['Yo de esta cuadra sé todo, querido'], gana_partida: ['Anotalo, que no me olvido'] },
  tanguero:    { canta_truco: ['Esta mano es un tango, pibe'], quiere: ['Mmm… mmhmm… quiero'] },
  carnicero:   { canta_truco: ['Vamos de frente, como siempre'], sube: ['Esta la corto yo'] },
  tana:        { canta_envido: ['Mamma mia, qué cartas'], quiere: ['A mí no me la contás, tesoro'] },
  pescador:    { no_quiere: ['Paciencia… ya va a picar'], sube: ['Picó.'] },
  cumbiero:    { canta_truco: ['¡Dale dale dale!'], quiere: ['Movete, que se baja el ritmo'] },
  fernetero:   { canta_truco: ['Tercer trago: ahora sí'], canta_envido: ['Setenta y treinta, como todo en la vida'] },
  tahur:       { quiere: ['En el puerto esto costaba plata'], canta_truco: ['Cara de piedra, corazón contento'] },
  quinielera:  { canta_envido: ['El 15 me lo sopló'], quiere: ['A esta la vi en los números'] },
  humorista:   { canta_truco: ['¿Sabés el del truco? Ahora lo ves'], no_quiere: ['Me río por no cantar'] },
  patrona:     { sube: ['Acá mando yo, corazón'], gana_partida: ['Apuntalo en mi cuenta'] },
  cuartetero:  { canta_truco: ['¡A todo volumen!'], sube: ['¡Esto se baila!'] },
  serrana:     { canta_truco: ['Yo no bajo con las manos vacías'], canta_envido: ['El aire de arriba afina el ojo'] },
  maestro:     { canta_truco: ['Van tres cartas que no contás'], quiere: ['Lección uno: a mí no me mientas'] },
  bodeguero:   { canta_truco: ['Esta jugada la añejé bien'], no_quiere: ['Todo a su tiempo, muchacho'] },
  campeon:     { gana_partida: ["Otra pa' la vitrina"], sube: ['¿Sabés con quién estás jugando?'] },
  arriero:     { quiere: ['Crucé la cordillera por menos'], canta_truco: ['A pulso firme'] },
  montanesa:   { quiere: ['Desde arriba se ve todo'], canta_envido: ['Aire de altura, mente clara'] },
  bombisto:    { canta_truco: ['Al ritmo del bombo, siempre'], sube: ['Esta chacarera la marco yo'] },
  coneja:      { no_quiere: ['Nadie me agarra dos veces'], mazo: ['Ahora estoy acá… ahora no'] },
  siestero:    { quiere: ['…¿eh? Ah, sí. Quiero.'], sube: ['No dormía: pensaba'] },
  bruja:       { quiere: ['El humo ya me lo dijo'], no_quiere: ['Tus cartas te delatan, criatura'] },
  coplero:     { canta_truco: ['Con esta mano que tengo, a cualquiera lo entretengo'], canta_envido: ['Verso que canto, punto que levanto'] },
  mudo:        {}, // Don Salvador no habla nunca.
}

/**
 * Elige la frase del bot para un momento dado, o null si esta vez no habla.
 * `usadas` es el registro de frases propias ya dichas en ESTA partida:
 * la función agrega ahí la que elige, y no repite las que ya están.
 */
export function fraseDelBot(slug: string, momento: MomentoFrase, usadas: Set<string>): string | null {
  const propias = PROPIAS[slug]
  if (propias && Object.keys(propias).length === 0) return null // el Mudo
  if (Math.random() > 0.5) return null                          // habla ~la mitad de las veces

  const disponibles = (propias?.[momento] ?? []).filter(f => !usadas.has(f))
  if (disponibles.length > 0 && Math.random() < 0.6) {
    const frase = disponibles[Math.floor(Math.random() * disponibles.length)]
    usadas.add(frase)
    return frase
  }
  const pool = GENERALES[momento]
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}
