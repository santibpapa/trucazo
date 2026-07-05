import { Modal, Button, Input } from 'trucazo'

/* La tarjeta de preview transforma su celda, así que `fixed inset-0` del Modal
   se posiciona relativo a la celda. El wrapper alto le da a la celda el
   tamaño de una "pantalla" para que el modal se vea centrado y completo. */
const Pantalla = ({ children }: { children: React.ReactNode }) => (
  <div className="relative h-[480px] bg-base rounded-xl">{children}</div>
)

/** Modal abierto como se ve en el juego: confirmación de abandono de partida. */
export function Confirmacion() {
  return (
    <Pantalla>
      <Modal open onClose={() => {}} title="¿Abandonar la partida?">
        <p className="text-sm text-muted">
          Si te vas ahora perdés la partida y las monedas apostadas.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => {}}>
            Seguir jugando
          </Button>
          <Button variant="danger" fullWidth onClick={() => {}}>
            Abandonar
          </Button>
        </div>
      </Modal>
    </Pantalla>
  )
}

export function ConFormulario() {
  return (
    <Pantalla>
      <Modal open onClose={() => {}} title="Crear mesa">
        <Input label="Nombre de la mesa" placeholder="Mesa de Santi" />
        <Button fullWidth onClick={() => {}}>
          Crear
        </Button>
      </Modal>
    </Pantalla>
  )
}
