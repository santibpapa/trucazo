/**
 * Un navegador ajeno no puede usar nuestro endpoint de analítica por CORS ni
 * mediante un formulario. No es una firma criptográfica (un script externo
 * puede falsificar cabeceras), por eso la base aplica además límites propios.
 */
export function isTrustedAnalyticsRequest({
  requestUrl,
  origin,
  fetchSite,
}: {
  requestUrl: string
  origin: string | null
  fetchSite: string | null
}) {
  if (!origin) return false

  try {
    if (new URL(origin).origin !== new URL(requestUrl).origin) return false
  } catch {
    return false
  }

  return !fetchSite || fetchSite === 'same-origin'
}
