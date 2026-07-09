// Marcos del avatar comprables en la Tienda (solo presentación, dibujados por CSS).
// Cada marco define el aro que rodea la foto: el degradado del anillo, un brillo
// opcional alrededor y si el aro gira lento (efecto "shimmer" metálico).
// 'ninguno' (o sin valor) = la foto sola, sin marco.

export interface FrameTheme {
  /** Degradado del aro (valor de background CSS). */
  ring: string
  /** Resplandor alrededor del avatar (box-shadow). Opcional. */
  glow?: string
  /** Si el aro gira lento (brillo en movimiento). */
  spin?: boolean
}

export const FRAME_THEMES: Record<string, FrameTheme> = {
  // Bronce mate: metal cálido, sobrio.
  bronce: {
    ring: 'conic-gradient(from 210deg, #6b3f1c, #b9793a, #f0c483, #8a5526, #6b3f1c)',
  },
  // Plata pulida: gris frío con un destello blanco.
  plata: {
    ring: 'conic-gradient(from 210deg, #5c6470, #c3ccd8, #ffffff, #8b95a3, #5c6470)',
    glow: '0 0 8px -2px rgba(200,215,230,0.5)',
  },
  // Oro brillante: el aro gira despacio, como reflejando la luz.
  oro: {
    ring: 'conic-gradient(from 0deg, #8a6a2c, #E8CF84, #fff4cf, #C9A24B, #A98532, #8a6a2c)',
    glow: '0 0 10px -1px rgba(232,207,132,0.6)',
    spin: true,
  },
  // Neón: cian y violeta girando, con resplandor eléctrico.
  neon: {
    ring: 'conic-gradient(from 0deg, #22d3ee, #7c3aed, #22d3ee, #7c3aed, #22d3ee)',
    glow: '0 0 12px -1px rgba(56,189,248,0.65)',
    spin: true,
  },
  // Fuego: naranjas y rojos girando, con resplandor cálido.
  fuego: {
    ring: 'conic-gradient(from 200deg, #7c2d12, #ea580c, #fcd34d, #ef4444, #7c2d12)',
    glow: '0 0 12px -1px rgba(249,115,22,0.6)',
    spin: true,
  },
  // Arcoíris: todos los colores girando. El más vistoso.
  arcoiris: {
    ring: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #a855f7, #ef4444)',
    glow: '0 0 12px -1px rgba(168,85,247,0.5)',
    spin: true,
  },
}

/** El tema del marco activo, o null si no tiene marco ('ninguno' / sin valor). */
export function getFrameTheme(slug?: string | null): FrameTheme | null {
  if (!slug || slug === 'ninguno') return null
  return FRAME_THEMES[slug] ?? null
}
