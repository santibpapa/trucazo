import GuestButton from '@/components/GuestButton'
import TrackedLink from '@/components/TrackedLink'
import { buttonClass } from '@/components/ui'

export default function PlayNowBlock({
  title = 'Jugar ahora',
  text,
  source,
}: {
  title?: string
  text: string
  source: string
}) {
  return (
    <section className="rounded-2xl border border-gold/30 bg-gold-soft/35 p-6 text-center">
      <h2 className="font-display text-2xl font-bold text-cream">{title}</h2>
      <p className="mt-2 text-muted">{text}</p>
      <div className="mx-auto mt-5 flex max-w-sm flex-col gap-3">
        <GuestButton
          variant="primary"
          size="lg"
          label="Jugar sin registrarme"
          source={source}
        />
        <TrackedLink
          href="/register"
          event="register_cta_click"
          source={source}
          className={buttonClass('ghost', 'lg', true)}
        >
          Crear cuenta
        </TrackedLink>
      </div>
    </section>
  )
}
