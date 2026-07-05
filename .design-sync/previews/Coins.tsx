import { Coins } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** Saldos y montos: el dorado marca la jerarquía, números tabulares. */
export function Tamanos() {
  return (
    <Lienzo>
      <div className="flex items-end gap-6">
        <Coins amount={250} size="sm" />
        <Coins amount={1500} size="md" />
        <Coins amount={12500} size="lg" />
      </div>
    </Lienzo>
  )
}

export function EnContexto() {
  return (
    <Lienzo>
      <div className="flex items-center justify-between w-64">
        <span className="text-sm text-muted">Tu saldo</span>
        <Coins amount={3200} />
      </div>
    </Lienzo>
  )
}
