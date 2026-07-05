import { Input } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

export function ConEtiqueta() {
  return (
    <Lienzo>
      <div className="w-72">
        <Input label="Tu nombre" placeholder="¿Cómo te llamamos?" />
      </div>
    </Lienzo>
  )
}

export function ConValor() {
  return (
    <Lienzo>
      <div className="w-72">
        <Input label="Nombre de la mesa" defaultValue="La mesa del tío" />
      </div>
    </Lienzo>
  )
}

export function Deshabilitado() {
  return (
    <Lienzo>
      <div className="w-72">
        <Input label="Código de invitación" placeholder="Solo con invitación" disabled />
      </div>
    </Lienzo>
  )
}
