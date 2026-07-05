import { Alert } from 'trucazo'

/* Lienzo oscuro: los tonos del Alert están pensados sobre bg-base. */
const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

export function Tonos() {
  return (
    <Lienzo>
      <div className="flex flex-col gap-3 w-80">
        <Alert tone="error">No se pudo crear la mesa. Probá de nuevo.</Alert>
        <Alert tone="info">Tu rival tiene 30 segundos para responder el envido.</Alert>
      </div>
    </Lienzo>
  )
}

export function MensajeLargo() {
  return (
    <Lienzo>
      <div className="w-96 max-w-full">
        <Alert tone="info">
          Las partidas abandonadas cuentan como derrota y las monedas apostadas
          van al rival. Si se corta la conexión, tenés dos minutos para volver.
        </Alert>
      </div>
    </Lienzo>
  )
}
