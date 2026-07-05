import { Logo } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** El wordmark de Trucazo en sus tres tamaños. */
export function Tamanos() {
  return (
    <Lienzo>
      <div className="flex flex-col items-start gap-5">
        <Logo size="sm" />
        <Logo size="md" />
        <Logo size="lg" />
      </div>
    </Lienzo>
  )
}
