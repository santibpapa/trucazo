import { cn } from './cn'

interface AvatarProps {
  /** URL de la foto (storage propio o Google). Si falta, muestra la inicial. */
  url?: string | null
  /** Nombre del jugador; se usa para la inicial de respaldo. */
  name: string
  /** Diámetro en px. */
  size?: number
  className?: string
}

/** Foto de perfil circular, con la inicial del nombre como respaldo. */
export default function Avatar({ url, name, size = 40, className }: AvatarProps) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full shrink-0',
        'bg-surface2 border border-line text-cream font-display font-bold select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {url ? (
        // <img> plano (no next/image) para no tener que autorizar dominios
        // externos. referrerPolicy no-referrer evita que Google bloquee la foto.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  )
}
