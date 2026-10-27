// Servicios remotos explícitos; el HTML, estilos y recursos se sirven desde el APK.
declare const MOBILE_API_ORIGIN: string
declare const MOBILE_RELEASE: boolean
declare const MOBILE_VERSION_CODE: number
export const WEB_ORIGIN = MOBILE_API_ORIGIN
export const RELEASE = typeof MOBILE_RELEASE !== 'undefined' && MOBILE_RELEASE
export const APP_VERSION_CODE = typeof MOBILE_VERSION_CODE === 'undefined' ? 17 : MOBILE_VERSION_CODE
