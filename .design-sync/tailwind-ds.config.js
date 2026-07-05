/* Config de Tailwind para design-sync: el tema real del juego +
   la carpeta de previews en `content`, para que las clases usadas solo
   en las vistas previas también se compilen. */
const base = require('../tailwind.config.ts')
const cfg = base.default ?? base

module.exports = {
  ...cfg,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './.design-sync/previews/**/*.tsx',
  ],
}
