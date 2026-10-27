import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'

/** Copias pequeñas privadas de los originales propios de Supabase. No descarga URLs externas. */
export async function preserveReportImages(reportId: string) {
  const admin = createAdminClient()
  if (!admin) throw new Error('Servidor de imágenes no disponible')
  const source = await admin.rpc('community_report_media', { p_report: reportId })
  if (source.error) throw source.error
  if (source.data.images.length) return
  const { subject_id: owner, evidence, kind } = source.data
  let bucket = 'feedback-images', paths: string[] = []
  if (kind === 'feedback') paths = Array.isArray(evidence.image_paths) ? evidence.image_paths.slice(0, 3) : []
  if (kind === 'profile' && evidence.avatar_url) {
    const prefix = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/avatars/'
    if (typeof evidence.avatar_url === 'string' && evidence.avatar_url.startsWith(prefix)) {
      bucket = 'avatars'; paths = [evidence.avatar_url.slice(prefix.length)]
    }
  }
  const images = await Promise.all(paths.map(async path => {
    if (typeof path !== 'string' || !new RegExp('^' + owner + '/[A-Za-z0-9._-]{1,110}\\.(jpg|jpeg|png|webp|gif)$').test(path)) throw new Error('Imagen fuera del contenido señalado')
    const file = await admin.storage.from(bucket).download(path)
    if (file.error || !file.data || file.data.size > 15 * 1024 * 1024) throw new Error('No pudimos copiar la imagen')
    const buffer = await sharp(Buffer.from(await file.data.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
    if (buffer.length > 450_000) throw new Error('La copia supera el tamaño permitido')
    return { type: 'image/jpeg', data: buffer.toString('base64') }
  }))
  if (images.length) {
    const saved = await admin.rpc('community_report_media', { p_report: reportId, p_images: images })
    if (saved.error) throw saved.error
  }
}
