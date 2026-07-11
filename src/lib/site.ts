// Dirección pública del sitio, en UN solo lugar.
// Se usa para el sitemap, las URLs canónicas y las tarjetas al compartir.
//
// Si algún día cambia el dominio, NO hace falta tocar código: se setea la
// variable NEXT_PUBLIC_SITE_URL en Vercel (Settings → Environment Variables)
// y listo. El valor por defecto es el dominio de producción real (con www,
// tal como figura como dominio principal en Vercel).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.trucazo.com.ar'
).replace(/\/$/, '') // sin barra final, para armar URLs prolijas

// Código que da Google Search Console para verificar que el sitio es tuyo.
// Se pega como variable NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION en Vercel.
// Si está vacío, no se agrega ninguna etiqueta (no molesta).
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined
