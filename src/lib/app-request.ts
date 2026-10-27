// La web usa cookies; el empaquetador Android sustituye este módulo por su transporte Bearer.
export const appRequest: typeof fetch = (input, init) => fetch(input, init)
export const appOrigin = () => window.location.origin
