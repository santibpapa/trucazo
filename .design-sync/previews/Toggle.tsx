import { Toggle } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

export function Estados() {
  return (
    <Lienzo>
      <div className="flex flex-col gap-4">
        <Toggle checked onChange={() => {}} label="Sonidos del juego" />
        <Toggle checked={false} onChange={() => {}} label="Mesa privada" />
      </div>
    </Lienzo>
  )
}

export function SinEtiqueta() {
  return (
    <Lienzo>
      <div className="flex items-center gap-4">
        <Toggle checked onChange={() => {}} />
        <Toggle checked={false} onChange={() => {}} />
      </div>
    </Lienzo>
  )
}
