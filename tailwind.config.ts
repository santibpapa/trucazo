import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tema "Vino & oro": fondo vino muy oscuro tipo terciopelo de casino
        base: "#1A0F10", // fondo de página
        surface: "#241517", // paneles / cards (terciopelo)
        surface2: "#2E191B", // superficie elevada (inputs, hovers)
        // Acento principal (usar con criterio, nunca como fondo de texto largo)
        gold: {
          DEFAULT: "#C9A24B",
          600: "#D7B566", // hover (más claro sobre oscuro)
          700: "#A98532", // bordes/sombra del oro
          soft: "#3A2A1C", // tinte cálido para badges/realces sobre oscuro
        },
        // Texto principal claro (crema) sobre superficies oscuras
        cream: "#EFE6DA",
        // "ink": muy oscuro — texto SOBRE el oro y backdrops, no para body
        ink: "#1F1011",
        // Apoyo (tonos cálidos derivados del vino)
        muted: "#A78A86", // texto secundario
        subtle: "#7C6460", // texto terciario / placeholders
        line: "#3C2226", // bordes finos
        // Estados (legibles sobre oscuro)
        positive: "#46A574",
        negative: "#D2553B",
        info: "#5E93B4",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        // Sombras profundas y difusas para dar volumen sobre el fondo oscuro
        soft: "0 1px 2px rgba(0,0,0,0.4)",
        card: "0 6px 18px -8px rgba(0,0,0,0.6), 0 2px 6px -2px rgba(0,0,0,0.4)",
        lift: "0 18px 38px -12px rgba(0,0,0,0.7), 0 6px 14px -6px rgba(0,0,0,0.5)",
        gold: "0 8px 22px -8px rgba(201,162,75,0.5)",
        // Realce dorado fino (borde interior luminoso) para detalles premium
        "gold-ring": "inset 0 0 0 1px rgba(201,162,75,0.35)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Cartel de anuncio: entra desde el lado del que actuó (--enterY < 0 desde
        // arriba / rival, > 0 desde abajo / yo).
        "announce-in": {
          "0%": { opacity: "0", transform: "translateY(var(--enterY, 14px)) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Reparto desde el mazo: la carta sale chica y rotada desde la posición
        // del mazo (--dx/--dy/--rot por carta) y se acomoda en la mano.
        "deal-in": {
          "0%": {
            opacity: "0",
            transform:
              "translate(var(--dx, 120px), var(--dy, -150px)) rotate(var(--rot, 12deg)) scale(0.5)",
          },
          "70%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translate(0,0) rotate(0) scale(1)" },
        },
        // Vuelo literal de la carta jugada: de su lugar en la mano (--tx/--ty/--sc
        // calculados en runtime) hasta su lugar en la mesa, con un arco y giro 3D.
        "fly": {
          "0%": { transform: "translate(0,0) rotateY(0deg) scale(1)" },
          "50%": {
            transform:
              "translate(calc(var(--tx) / 2), calc(var(--ty) / 2 - 16px)) rotateY(38deg) scale(calc((1 + var(--sc)) / 2))",
          },
          "100%": {
            transform: "translate(var(--tx), var(--ty)) rotateY(0deg) scale(var(--sc))",
          },
        },
        // Modo historia: un rival se "revela" al desbloquearse (aparece con un pop).
        "unlock-pop": {
          "0%": { opacity: "0", transform: "scale(0.4) rotate(-8deg)" },
          "55%": { opacity: "1", transform: "scale(1.12) rotate(2deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        // Nubes que se abren al entrar al modo historia (revelan el mapa).
        "clouds-left": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "translateX(-82%)", opacity: "0" },
        },
        "clouds-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "translateX(82%)", opacity: "0" },
        },
        // Latido dorado del rival que te toca (el "próximo desafío").
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(201,162,75,0), 0 0 12px 2px rgba(201,162,75,0.25)" },
          "50%": { boxShadow: "0 0 0 5px rgba(201,162,75,0.16), 0 0 22px 6px rgba(201,162,75,0.55)" },
        },
        // Giro 3D al jugar: entra de canto desde la mano (--fromY) y se da vuelta en la mesa
        "play-in": {
          "0%": {
            opacity: "0",
            transform:
              "perspective(720px) rotateY(72deg) translateY(var(--fromY, -10px)) scale(0.9)",
          },
          "55%": { opacity: "1" },
          "100%": {
            opacity: "1",
            transform: "perspective(720px) rotateY(0deg) translateY(0) scale(1)",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-up": "fade-up 0.3s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.22s cubic-bezier(0.22,1,0.36,1) both",
        "announce-in": "announce-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        // backwards (no forwards): mantiene el estado inicial durante el delay del
        // reparto escalonado, pero al terminar libera el transform para que el hover funcione.
        "deal-in": "deal-in 0.35s cubic-bezier(0.22,1,0.36,1) backwards",
        "play-in": "play-in 0.42s cubic-bezier(0.22,1,0.36,1) backwards",
        "unlock-pop": "unlock-pop 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-glow": "pulse-glow 1.9s ease-in-out infinite",
        "clouds-left": "clouds-left 3s cubic-bezier(0.45,0,0.25,1) 0.4s forwards",
        "clouds-right": "clouds-right 3s cubic-bezier(0.45,0,0.25,1) 0.4s forwards",
        fly: "fly 0.46s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
