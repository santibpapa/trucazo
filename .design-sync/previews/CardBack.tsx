import { CardBack } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** El dorso: terciopelo vino con enrejado dorado. Las cartas del rival. */
export function Solo() {
  return (
    <Lienzo>
      <CardBack className="w-24 h-[136px]" />
    </Lienzo>
  )
}

export function ManoDelRival() {
  return (
    <Lienzo>
      <div className="flex gap-3">
        <CardBack className="w-20 h-[113px]" />
        <CardBack className="w-20 h-[113px]" />
        <CardBack className="w-20 h-[113px]" />
      </div>
    </Lienzo>
  )
}
