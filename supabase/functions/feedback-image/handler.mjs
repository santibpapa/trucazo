// El ticket lo emite únicamente el conector SQL administrativo.
// Nunca aceptamos una ruta o clave de Storage elegida por el cliente.
export function imageHandler({ origin, secret, fetcher = fetch }) {
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
  const reject = (status) => new Response('Acceso no disponible', { status, headers });
  return async (req) => {
    if (req.method !== 'GET') return reject(405);
    const token = new URL(req.url).searchParams.get('token');
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return reject(403);
    if (!origin || !secret) return reject(503);
    try {
      const auth = { apikey: secret };
      // Las claves modernas no son JWT. La clave legacy sí lo requiere.
      if (!secret.startsWith('sb_secret_')) auth.Authorization = 'Bearer ' + secret;
      const redeemed = await fetcher(origin + '/rest/v1/rpc/consume_feedback_image_ticket', {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: token }), signal: AbortSignal.timeout(10000),
      });
      if (!redeemed.ok) return reject(503);
      const imagePath = await redeemed.json();
      if (typeof imagePath !== 'string' || !imagePath) return reject(403);
      const parts = imagePath.split('/');
      if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))) return reject(403);
      const encodedPath = parts.map(encodeURIComponent).join('/');
      const image = await fetcher(origin + '/storage/v1/object/authenticated/feedback-images/' + encodedPath, {
        headers: auth, signal: AbortSignal.timeout(15000),
      });
      if (!image.ok) return reject(502);
      const type = image.headers.get('content-type')?.split(';')[0];
      if (!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(type)) return reject(415);
      const bytes = await image.arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024) return reject(413);
      return new Response(bytes, { headers: { ...headers, 'Content-Type': type } });
    } catch {
      // No registrar tokens, rutas, claves ni errores con URLs privadas.
      return reject(503);
    }
  };
}
