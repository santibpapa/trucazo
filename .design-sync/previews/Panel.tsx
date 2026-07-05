import { Panel, Button, Coins } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/** La superficie base del diseño: terciopelo elevado sobre el fondo vino. */
export function ConContenido() {
  return (
    <Lienzo>
      <Panel className="p-6 flex flex-col gap-4 max-w-sm">
        <h3 className="font-display text-lg font-bold text-cream">Mesa de Santi</h3>
        <p className="text-sm text-muted">Partida a 30 puntos · sin flor</p>
        <div className="flex items-center justify-between">
          <Coins amount={500} />
          <Button size="sm">Unirse</Button>
        </div>
      </Panel>
    </Lienzo>
  )
}

export function Simple() {
  return (
    <Lienzo>
      <Panel className="p-5 max-w-sm">
        <p className="text-sm text-cream">
          Un panel vacío define la superficie: borde fino, sombra profunda.
        </p>
      </Panel>
    </Lienzo>
  )
}
