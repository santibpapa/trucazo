/**
 * Simulación del cerebro del bot (NO toca la base de datos).
 * Correr: npx tsx scripts/sim_bot.ts
 *
 * Port en JS de las decisiones de TRUCO de public.bot_step() (SQL), para:
 *
 *  1) AUDITORÍA: recorre todas las situaciones (ronda × dificultad) y marca
 *     los casilleros donde una decisión es IMPOSIBLE (el bot jamás puede
 *     querer/cantar/subir, tenga las cartas que tenga). Así se encontró el
 *     bug de "nunca quiere el truco en la ronda 3".
 *
 *  2) CALIBRACIÓN: juega miles de manos al azar y compara la lógica VIEJA
 *     (fuerza = suma de las cartas que quedan, se achica al jugar) contra
 *     la NUEVA (fuerza normalizada a escala de 3 cartas), mostrando el % de
 *     quiero / no quiero / sube en cada situación.
 *
 * Espejo de las migraciones 20260720_bot_fuerza_por_ronda.sql,
 * 20260720_bot_se_va_al_mazo.sql y 20260723_bot_falta_envido_umbral.sql:
 * si cambian los umbrales del bot en SQL, actualizar este archivo (y
 * viceversa).
 * Rasgos de personalidad en neutro (5) y sin reputación: no cambian el fondo.
 */
import { createDeck, getEnvidoPoints, type Card } from '../src/lib/truco'

// ---------------------------------------------------------------
// Mazo: poder de cada carta = 15 - rank (mismo CASE que _truco_deck)
// ---------------------------------------------------------------
const CANTIDAD_POR_RANK: Array<[rank: number, cantidad: number]> = [
  [1, 1], [2, 1], [3, 1], [4, 1],   // ancho espada, ancho basto, 7 espada, 7 oro
  [5, 4], [6, 4],                   // los 3, los 2
  [7, 2],                           // anchos falsos
  [8, 4], [9, 4], [10, 4],          // 12, 11, 10
  [11, 2],                          // 7 falsos
  [12, 4], [13, 4], [14, 4],        // 6, 5, 4
]
const MAZO_PODERES: number[] = []
for (const [rank, cantidad] of CANTIDAD_POR_RANK)
  for (let i = 0; i < cantidad; i++) MAZO_PODERES.push(15 - rank)

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// eff VIEJA: suma cruda de lo que queda en mano (+/- 6 por ronda ganada/perdida)
const effVieja = (poderes: number[], standing: number) =>
  suma(poderes) + standing * 6

// eff NUEVA: la suma se lleva a escala de 3 cartas (regla de tres)
const effNueva = (poderes: number[], standing: number) =>
  Math.round((suma(poderes) * 3) / Math.max(1, poderes.length)) + standing * 6

// ---------------------------------------------------------------
// Port de las decisiones de truco de bot_step (mismos umbrales que el SQL)
// ---------------------------------------------------------------
type RespuestaTruco = 'sube' | 'quiero' | 'no quiero'

function respondeTruco(eff: number, d: number, trucoVal: number, rr: number): RespuestaTruco {
  if (eff >= 30 && d >= 6 && trucoVal < 4 && rr < 0.40) return 'sube'
  if (eff >= Math.max(12, 22 - d)) return 'quiero'
  if (d <= 3 && rr < 0.6) return 'quiero'
  return 'no quiero'
}

// Respuesta al envido, con la vara de "quiero" POR NIVEL: la falta se juega
// la partida, así que pide un tanto mucho más fuerte (mismos umbrales que el
// SQL). Sin reputación (r_call = 0).
type NivelEnvido = 'envido' | 'real_envido' | 'falta_envido'
function envidoNeed(nivel: NivelEnvido, d: number): number {
  if (nivel === 'falta_envido') return Math.max(29, 34 - d)
  if (nivel === 'real_envido') return Math.max(24, 29 - d)
  return Math.max(20, 27 - d)
}
function respondeEnvido(et: number, nivel: NivelEnvido, d: number, rr: number): boolean {
  if (et >= envidoNeed(nivel, d)) return true
  if (d <= 3 && nivel !== 'falta_envido' && rr < 0.5) return true
  return false
}

function cantaTruco(eff: number, d: number, rr: number): 'de verdad' | 'farol' | null {
  if (eff >= 24 && rr < 0.35 + 0.05 * d) return 'de verdad'
  if (eff <= 12 && d >= 6 && rr < (d - 5) * 0.035) return 'farol'
  return null
}

function subeTrucoAceptado(eff: number, d: number, trucoVal: number, rr: number): boolean {
  return trucoVal < 4 && eff >= 30 && d >= 7 && rr < 0.30
}

// ¿Se va al mazo? Solo ronda 2, respondiendo a una carta que lo deja sin
// salida (perdiendo nunca abre él): si perdió la 1ra, condenado cuando no
// puede SUPERAR la carta; si la 1ra fue parda, solo cuando su mejor carta
// PIERDE (el empate lo lleva a la 3ra). En ambos casos se va ~55%.
function seVaAlMazo(mejorPoder: number, oppPoder: number | null, ronda: number, standing: number): boolean {
  if (ronda !== 2 || oppPoder === null || standing > 0) return false
  const condenado = standing < 0 ? mejorPoder <= oppPoder : mejorPoder < oppPoder
  return condenado && Math.random() < 0.55
}

// ---------------------------------------------------------------
// Situaciones posibles (cartas en mano del bot × cómo viene la mano)
// ---------------------------------------------------------------
const ESCENARIOS = [
  { nombre: 'Ronda 1 (3 cartas, mano pareja)',        ncartas: 3, standing: 0 },
  { nombre: 'Ronda 2, bot ganó la 1ra (2 cartas)',    ncartas: 2, standing: +1 },
  { nombre: 'Ronda 2, bot perdió la 1ra (2 cartas)',  ncartas: 2, standing: -1 },
  { nombre: 'Ronda 3, están 1 a 1 (1 carta)',         ncartas: 1, standing: 0 },
] as const

const DIFICULTADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function mejoresPoderes(n: number): number[] {
  return [...MAZO_PODERES].sort((a, b) => b - a).slice(0, n)
}

function manoAlAzar(n: number): number[] {
  const mazo = [...MAZO_PODERES]
  const mano: number[] = []
  for (let i = 0; i < n; i++)
    mano.push(mazo.splice(Math.floor(Math.random() * mazo.length), 1)[0])
  return mano
}

// ===============================================================
// 1) AUDITORÍA: casilleros imposibles (con la MEJOR mano posible)
// ===============================================================
type Eff = (p: number[], s: number) => number

function auditoria(nombreLogica: string, eff: Eff) {
  console.log(`\n=== AUDITORÍA (${nombreLogica}): ✗ = imposible aunque tenga las mejores cartas ===`)
  console.log('   (querer = aceptar truco; subir = retruco/vale4; cantar = truco con mano buena)')
  for (const esc of ESCENARIOS) {
    const tope = eff(mejoresPoderes(esc.ncartas), esc.standing)
    const filas: string[] = []
    for (const decision of ['querer', 'subir', 'cantar'] as const) {
      const celdas = DIFICULTADES.map((d) => {
        let posible: boolean
        if (decision === 'querer') posible = tope >= Math.max(12, 22 - d) || d <= 3
        else if (decision === 'subir') posible = tope >= 30 && d >= 6
        else posible = tope >= 24
        return posible ? ' ✓' : ' ✗'
      })
      filas.push(`  ${decision.padEnd(7)} d1..d10:${celdas.join('')}`)
    }
    console.log(`\n${esc.nombre} (tope de fuerza: ${tope})`)
    for (const f of filas) console.log(f)
  }
}

// ===============================================================
// 2) MONTE CARLO: % de cada respuesta con manos al azar
// ===============================================================
const N = 40000
const pct = (x: number) => ((100 * x) / N).toFixed(0).padStart(3) + '%'

function monteCarloResponder() {
  console.log('\n=== ¿QUIERE EL TRUCO? — % con manos al azar (VIEJA → NUEVA) ===')
  for (const esc of ESCENARIOS) {
    console.log(`\n${esc.nombre}`)
    console.log('  dif | quiero        | sube          | no quiero')
    for (const d of DIFICULTADES) {
      const c = { v: { sube: 0, quiero: 0, no: 0 }, n: { sube: 0, quiero: 0, no: 0 } }
      for (let i = 0; i < N; i++) {
        const mano = manoAlAzar(esc.ncartas)
        const rr = Math.random()
        for (const [logica, eff] of [['v', effVieja], ['n', effNueva]] as const) {
          const r = respondeTruco(eff(mano, esc.standing), d, 2, rr)
          if (r === 'sube') c[logica].sube++
          else if (r === 'quiero') c[logica].quiero++
          else c[logica].no++
        }
      }
      console.log(
        `  ${String(d).padStart(3)} | ${pct(c.v.quiero)} → ${pct(c.n.quiero)}   | ` +
        `${pct(c.v.sube)} → ${pct(c.n.sube)}   | ${pct(c.v.no)} → ${pct(c.n.no)}`,
      )
    }
  }
}

function monteCarloCantar() {
  console.log('\n=== ¿CANTA TRUCO ÉL? — % con manos al azar (VIEJA → NUEVA) ===')
  for (const esc of ESCENARIOS) {
    console.log(`\n${esc.nombre}`)
    console.log('  dif | canta de verdad | farolea')
    for (const d of DIFICULTADES) {
      const c = { v: { real: 0, farol: 0 }, n: { real: 0, farol: 0 } }
      for (let i = 0; i < N; i++) {
        const mano = manoAlAzar(esc.ncartas)
        const rr = Math.random()
        for (const [logica, eff] of [['v', effVieja], ['n', effNueva]] as const) {
          const r = cantaTruco(eff(mano, esc.standing), d, rr)
          if (r === 'de verdad') c[logica].real++
          else if (r === 'farol') c[logica].farol++
        }
      }
      console.log(
        `  ${String(d).padStart(3)} | ${pct(c.v.real)} → ${pct(c.n.real)}      | ` +
        `${pct(c.v.farol)} → ${pct(c.n.farol)}`,
      )
    }
  }
}

function monteCarloSubir() {
  console.log('\n=== ¿SUBE UN TRUCO YA ACEPTADO? — % (VIEJA → NUEVA) ===')
  for (const esc of ESCENARIOS) {
    const c: Record<string, number[]> = { v: [], n: [] }
    for (const d of DIFICULTADES) {
      let v = 0, n = 0
      for (let i = 0; i < N; i++) {
        const mano = manoAlAzar(esc.ncartas)
        const rr = Math.random()
        if (subeTrucoAceptado(effVieja(mano, esc.standing), d, 2, rr)) v++
        if (subeTrucoAceptado(effNueva(mano, esc.standing), d, 2, rr)) n++
      }
      c.v.push(v); c.n.push(n)
    }
    console.log(`\n${esc.nombre}`)
    console.log('  dif:      ' + DIFICULTADES.map((d) => String(d).padStart(4)).join('  '))
    console.log('  vieja:    ' + c.v.map((x) => pct(x).padStart(4)).join('  '))
    console.log('  nueva:    ' + c.n.map((x) => pct(x).padStart(4)).join('  '))
  }
}

function monteCarloMazo() {
  console.log('\n=== ¿SE VA AL MAZO? — ronda 2, el rival ya jugó su carta (manos al azar) ===')
  for (const standing of [-1, 0]) {
    let condenadas = 0, seFue = 0
    for (let i = 0; i < N; i++) {
      const mazo = [...MAZO_PODERES]
      const mano: number[] = []
      for (let k = 0; k < 2; k++) mano.push(mazo.splice(Math.floor(Math.random() * mazo.length), 1)[0])
      const opp = mazo.splice(Math.floor(Math.random() * mazo.length), 1)[0]
      const mejor = Math.max(...mano)
      if (standing < 0 ? mejor <= opp : mejor < opp) condenadas++
      if (seVaAlMazo(mejor, opp, 2, standing)) seFue++
    }
    console.log(
      `  ${standing < 0 ? 'perdió la 1ra    ' : 'la 1ra fue parda'} | ` +
      `mano condenada: ${pct(condenadas)} de las veces | se va al mazo: ${pct(seFue)} del total`,
    )
  }
}

function manoEnvidoAlAzar(): Card[] {
  const mazo = createDeck()
  const mano: Card[] = []
  for (let i = 0; i < 3; i++) mano.push(mazo.splice(Math.floor(Math.random() * mazo.length), 1)[0])
  return mano
}

function monteCarloEnvidoResponder() {
  console.log('\n=== ¿QUIERE EL ENVIDO? — % que acepta con mano al azar, por nivel ===')
  console.log('  (la falta se juega la partida: debe pedir tanto mucho más fuerte)')
  const viejaNeed = (d: number) => Math.max(20, 27 - d) // antes: la misma vara para los 3
  for (const nivel of ['envido', 'real_envido', 'falta_envido'] as const) {
    console.log(`\n${nivel}`)
    console.log('  dif |  antes (una sola vara) →  ahora (vara por nivel)')
    for (const d of DIFICULTADES) {
      let vieja = 0, nueva = 0
      for (let i = 0; i < N; i++) {
        const et = getEnvidoPoints(manoEnvidoAlAzar())
        const rr = Math.random()
        if (et >= viejaNeed(d) || (d <= 3 && rr < 0.5)) vieja++
        if (respondeEnvido(et, nivel, d, rr)) nueva++
      }
      console.log(`  ${String(d).padStart(3)} |  ${pct(vieja)} → ${pct(nueva)}`)
    }
  }
}

auditoria('lógica VIEJA', effVieja)
auditoria('lógica NUEVA', effNueva)
monteCarloResponder()
monteCarloCantar()
monteCarloSubir()
monteCarloMazo()
monteCarloEnvidoResponder()
