// Vestuario de la mesa según el salón elegido en la Tienda (solo presentación).
// Cada salón define los colores de las 3 capas del óvalo que dibuja GameClient:
// el borde (madera/material), el filete (la línea decorativa) y el paño.
// La foto del ambiente es /mesa/{slug}.webp; esto colorea la mesa para que combine.

export interface SalonTheme {
  /** Fondo del borde de la mesa (degradado del material) */
  rim: string
  /** Color del filete decorativo */
  inlay: string
  /** Color del brillo alrededor del filete */
  inlayGlow: string
  /** Fondo del paño (degradado radial) */
  felt: string
}

export const SALON_THEMES: Record<string, SalonTheme> = {
  // Vino y oro: madera oscura, filete dorado, paño bordó (el look original)
  clasico: {
    rim: 'linear-gradient(180deg, #7a5533 0%, #5d3f26 22%, #46301d 55%, #2c1e12 100%)',
    inlay: 'rgba(201,162,75,0.6)',
    inlayGlow: 'rgba(201,162,75,0.28)',
    felt: 'radial-gradient(ellipse at 50% 36%, #56262d 0%, #432027 48%, #2f161c 100%)',
  },
  // Sepia de café: roble claro, bronce viejo, paño verde billar
  cafetin: {
    rim: 'linear-gradient(180deg, #94703f 0%, #75542c 22%, #5a3f20 55%, #3a2812 100%)',
    inlay: 'rgba(214,186,120,0.65)',
    inlayGlow: 'rgba(214,186,120,0.3)',
    felt: 'radial-gradient(ellipse at 50% 36%, #2f5c43 0%, #244834 48%, #172e21 100%)',
  },
  // Rústico de estancia: madera curtida, filete de cobre, paño terracota
  quincho: {
    rim: 'linear-gradient(180deg, #6e4a30 0%, #543722 22%, #3f2917 55%, #281a0e 100%)',
    inlay: 'rgba(196,120,70,0.65)',
    inlayGlow: 'rgba(196,120,70,0.3)',
    felt: 'radial-gradient(ellipse at 50% 36%, #6b3a24 0%, #532c1b 48%, #371d11 100%)',
  },
  // Futurista: laca negra, filete cian brillante, paño violeta profundo
  neon: {
    rim: 'linear-gradient(180deg, #3a3a46 0%, #26262e 22%, #1a1a20 55%, #0e0e12 100%)',
    inlay: 'rgba(96,220,255,0.7)',
    inlayGlow: 'rgba(96,220,255,0.4)',
    felt: 'radial-gradient(ellipse at 50% 36%, #3a2454 0%, #2b1a40 48%, #180e26 100%)',
  },
  // Urbano nocturno: grafito y vidrio, filete plateado, paño azul noche
  rooftop: {
    rim: 'linear-gradient(180deg, #4a4f58 0%, #363b44 22%, #262b33 55%, #14171c 100%)',
    inlay: 'rgba(190,205,220,0.6)',
    inlayGlow: 'rgba(190,205,220,0.28)',
    felt: 'radial-gradient(ellipse at 50% 36%, #1e3a5f 0%, #172d4a 48%, #0e1c2f 100%)',
  },
  // Lujo claro: mármol marfil, oro pulido, paño esmeralda
  presidencial: {
    rim: 'linear-gradient(180deg, #e6d9bd 0%, #cdbd9a 22%, #b3a17c 55%, #8a7a58 100%)',
    inlay: 'rgba(212,175,90,0.85)',
    inlayGlow: 'rgba(212,175,90,0.4)',
    felt: 'radial-gradient(ellipse at 50% 36%, #1f4d3a 0%, #17402f 48%, #0e2a1e 100%)',
  },
}

export function getSalonTheme(slug?: string | null): SalonTheme {
  return SALON_THEMES[slug ?? 'clasico'] ?? SALON_THEMES.clasico
}
