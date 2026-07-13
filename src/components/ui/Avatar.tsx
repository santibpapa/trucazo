import { cn } from './cn'
import { getFrameTheme } from '@/lib/marcos'
import { getMedal } from '@/lib/medallas'

interface AvatarProps {
  /** URL de la foto (storage propio o Google). Si falta, muestra la inicial. */
  url?: string | null
  /** Nombre del jugador; se usa para la inicial de respaldo. */
  name: string
  /** Diámetro en px (contando el marco, si tiene). */
  size?: number
  /** Marco decorativo comprado en la Tienda ('ninguno' / vacío = sin marco). */
  frame?: string | null
  /** Medalla destacada; se muestra como pin en la esquina ('ninguno' / vacío = sin pin). */
  medal?: string | null
  className?: string
}

/** Foto de perfil circular, con la inicial del nombre como respaldo, el marco
 *  (aro) comprado en la Tienda y el pin de la medalla destacada. */
export default function Avatar({ url, name, size = 40, frame, medal, className }: AvatarProps) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  const theme = getFrameTheme(frame)
  // Grosor del aro; la foto se achica para dejarle lugar y que el total siga = size.
  const ring = theme ? Math.max(2, Math.round(size * 0.08)) : 0
  const inner = size - ring * 2

  const photo = (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full shrink-0',
        'bg-surface2 border border-line text-cream font-display font-bold select-none',
        !theme && className,
      )}
      style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.42) }}
    >
      {url ? (
        // <img> plano (no next/image) para no tener que autorizar dominios
        // externos. referrerPolicy no-referrer evita que Google bloquee la foto.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          width={inner}
          height={inner}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  )

  // Avatar con marco (aro) o sin él. El className va sobre el elemento visible.
  const core = theme ? (
    <span
      className={cn('relative inline-flex items-center justify-center rounded-full shrink-0', className)}
      style={{ width: size, height: size, boxShadow: theme.glow }}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 rounded-full', theme.spin && 'animate-spin-slow')}
        style={{ background: theme.ring }}
      />
      <span className="relative">{photo}</span>
    </span>
  ) : (
    photo
  )

  // Pin de la medalla destacada. En avatares muy chicos no entra, así que se omite.
  const medalMeta = getMedal(medal)
  if (!medalMeta || size < 28) return core

  const badge = Math.max(15, Math.round(size * 0.4))
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {core}
      <span
        aria-hidden="true"
        title={medalMeta.name}
        className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full border border-line bg-surface2 shadow-card leading-none"
        style={{ width: badge, height: badge, fontSize: Math.round(badge * 0.6) }}
      >
        {medalMeta.emoji}
      </span>
    </span>
  )
}
