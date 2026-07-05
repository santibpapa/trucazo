import { CoinIcon } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** La moneda suelta, para componer indicadores propios. */
export function Tamanos() {
  return (
    <Lienzo>
      <div className="flex items-end gap-5">
        <CoinIcon size={14} />
        <CoinIcon size={22} />
        <CoinIcon size={40} />
      </div>
    </Lienzo>
  )
}
