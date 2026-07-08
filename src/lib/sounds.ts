// Sonidos del juego. Reproduce archivos de /public/sounds/.
// - Neutros (los generamos nosotros): carta, gano, perdi (.wav).
// - Cantos (los pone el dueño): truco, envido, etc. (.mp3). Si el archivo no
//   existe todavía, play() falla en silencio y no pasa nada.

export type SoundName =
  | 'carta' | 'gano' | 'perdi'
  | 'truco' | 'retruco' | 'vale-cuatro'
  | 'envido' | 'real-envido' | 'falta-envido'
  | 'quiero' | 'no-quiero'

const SRC: Record<SoundName, string> = {
  carta: '/sounds/carta.wav',
  gano: '/sounds/gano.wav',
  perdi: '/sounds/perdi.wav',
  truco: '/sounds/truco.mp3',
  retruco: '/sounds/retruco.mp3',
  'vale-cuatro': '/sounds/vale-cuatro.mp3',
  envido: '/sounds/envido.mp3',
  'real-envido': '/sounds/real-envido.mp3',
  'falta-envido': '/sounds/falta-envido.mp3',
  quiero: '/sounds/quiero.mp3',
  'no-quiero': '/sounds/no-quiero.mp3',
}

const KEY = 'trucazo:muted'
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {}

let muted = false
if (typeof window !== 'undefined') {
  try { muted = localStorage.getItem(KEY) === '1' } catch {}
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(v: boolean): void {
  muted = v
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch {}
}

export function playSound(name: SoundName): void {
  if (typeof window === 'undefined' || muted) return
  try {
    let audio = cache[name]
    if (!audio) {
      audio = new Audio(SRC[name])
      audio.preload = 'auto'
      cache[name] = audio
    }
    audio.currentTime = 0
    // Archivo faltante o autoplay bloqueado por el navegador: lo ignoramos.
    audio.play().catch(() => {})
  } catch {}
}
