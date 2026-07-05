import { Button } from 'trucazo'

/* Trucazo es un tema oscuro (vino & oro): cada vista trae su lienzo bg-base,
   porque la tarjeta de preview usa fondo blanco por defecto. */
const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** Las seis variantes sobre el fondo oscuro del juego. */
export function Variantes() {
  return (
    <Lienzo>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Jugar ahora</Button>
        <Button variant="secondary">Crear mesa</Button>
        <Button variant="ghost">Ver reglas</Button>
        <Button variant="positive">Quiero</Button>
        <Button variant="danger">No quiero</Button>
        <Button variant="info">Envido</Button>
      </div>
    </Lienzo>
  )
}

export function Tamanos() {
  return (
    <Lienzo>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Chico</Button>
        <Button size="md">Mediano</Button>
        <Button size="lg">Grande</Button>
      </div>
    </Lienzo>
  )
}

export function Estados() {
  return (
    <Lienzo>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Esperando rival…</Button>
        <Button variant="secondary" disabled>No disponible</Button>
      </div>
    </Lienzo>
  )
}

export function AnchoCompleto() {
  return (
    <Lienzo>
      <div className="w-72">
        <Button fullWidth>Entrar a la mesa</Button>
      </div>
    </Lienzo>
  )
}
