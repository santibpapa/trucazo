// La foto viaja dentro del guardado privado. No entra en la caché pública.
export async function downloadAvatar(source: string | null, owner: string, storageOrigin: string, fetcher = fetch): Promise<string | null> {
  if (!source) return null
  const url = new URL(source)
  const allowed = url.protocol === 'https:' && !url.username && !url.password && !url.port
    && ((url.origin === new URL(storageOrigin).origin && url.pathname.startsWith('/storage/v1/object/public/avatars/' + owner + '/'))
      || /^lh\d+\.googleusercontent\.com$/.test(url.hostname))
  if (!allowed) throw new Error('Foto no compatible.')
  const response = await fetcher(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) })
  const mime = response.headers.get('Content-Type')?.split(';')[0]
  if (!response.ok || !mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Foto no disponible.')
  if (Number(response.headers.get('Content-Length')) > 2 * 1024 * 1024) throw new Error('Foto muy grande.')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Foto vacía.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 2 * 1024 * 1024) throw new Error('Foto muy grande.')
      chunks.push(value)
    }
  } finally { await reader.cancel() }
  if (!size) throw new Error('Foto vacía.')
  return 'data:' + mime + ';base64,' + Buffer.concat(chunks).toString('base64')
}
