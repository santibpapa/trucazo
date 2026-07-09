'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui'

interface Props {
  userId: string
  username: string
  initialUrl?: string | null
}

/** Recorta la imagen a un cuadrado centrado y la reduce a `size`px (JPEG). */
async function toSquareBlob(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('sin blob'))), 'image/jpeg', 0.85),
  )
}

/** Foto de perfil del usuario + botón para cambiarla. */
export default function AvatarUploader({ userId, username, initialUrl }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Elegí un archivo de imagen.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen es muy grande (máx. 15 MB).')
      return
    }

    setLoading(true)
    setError('')
    try {
      const blob = await toSquareBlob(file)
      const supabase = createClient()
      const path = `${userId}/${Date.now()}.jpg`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub.publicUrl

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
      if (updErr) throw updErr

      setUrl(publicUrl)
      router.refresh() // que el resto de la app tome la foto nueva
    } catch {
      setError('No se pudo subir la foto, probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title={url ? 'Cambiar foto' : 'Subir foto'}
        className="relative rounded-full transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      >
        <Avatar url={url} name={username} size={64} />
        {/* Insignia de cámara: indica que la foto se puede cambiar */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface2 text-gold shadow-card">
          {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold border-t-transparent" /> : <CameraIcon />}
        </span>
      </button>
      {error && <p className="max-w-[10rem] text-center text-[11px] text-negative">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
