// Service worker mínimo: existe sólo para que el navegador permita "instalar"
// la app (los navegadores lo exigen). NO guarda caché a propósito, para no
// arriesgar servir versiones viejas: deja pasar todo a la red normal.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // Sin respondWith: el navegador maneja el pedido como siempre (red normal).
})
