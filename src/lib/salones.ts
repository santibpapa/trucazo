// Los slugs son identidades de compra: NO se renombran al renovar el arte.
// Precios, propiedad y activación siguen siendo autoridad del servidor.
export interface SalonTheme {
  name: string
  description: string
  scene: string
  felt: string
  edge: string
}

export const SALON_THEMES: Record<string, SalonTheme> = {
  clasico: {
    name: 'Club de barrio',
    description: 'La mesa de siempre. Paño bordó, madera gastada y luz cálida.',
    scene: '/mesa/club/clasico.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #542830, #30151d 85%)',
    edge: '#5b3925',
  },
  cafetin: {
    name: 'Cafetín porteño',
    description: 'Un café, la lluvia en la ventana y una partida en paño verde.',
    scene: '/mesa/club/cafetin.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #254d3b, #102a22 85%)',
    edge: '#715031',
  },
  quincho: {
    name: 'Quincho',
    description: 'La parrilla encendida, ladrillo a la vista y paño terracota.',
    scene: '/mesa/club/quincho.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #723d2b, #3d1d16 85%)',
    edge: '#623d28',
  },
  neon: {
    name: 'Peña norteña',
    description: 'Adobe, tejidos y luz de farol alrededor de un paño ciruela.',
    scene: '/mesa/club/pena.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #512939, #291321 85%)',
    edge: '#593321',
  },
  rooftop: {
    name: 'Bodegón',
    description: 'Mantel a cuadros, sifón y paño azul. Una más y nos vamos.',
    scene: '/mesa/club/bodegon.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #243b53, #101e30 85%)',
    edge: '#503521',
  },
  presidencial: {
    name: 'Refugio patagónico',
    description: 'Nieve afuera, chimenea adentro y una mesa de paño petróleo.',
    scene: '/mesa/club/refugio.webp',
    felt: 'radial-gradient(ellipse at 50% 35%, #204850, #10282e 85%)',
    edge: '#806044',
  },
}

export function getSalonTheme(slug?: string | null): SalonTheme {
  return SALON_THEMES[slug ?? 'clasico'] ?? SALON_THEMES.clasico
}
