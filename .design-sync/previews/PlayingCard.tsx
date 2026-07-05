import { PlayingCard } from 'trucazo'

const Lienzo = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-base rounded-xl p-6">{children}</div>
)

/* rank no afecta el render (solo suit/value eligen el PNG). */
const anchoEspada = { suit: 'espada' as const, value: 1, rank: 1 }
const sieteOro = { suit: 'oro' as const, value: 7, rank: 4 }
const tresBasto = { suit: 'basto' as const, value: 3, rank: 5 }

/** La mano del jugador: tres cartas interactivas. */
export function Mano() {
  return (
    <Lienzo>
      <div className="flex gap-3">
        <PlayingCard card={anchoEspada} interactive className="w-24" />
        <PlayingCard card={sieteOro} interactive className="w-24" />
        <PlayingCard card={tresBasto} interactive className="w-24" />
      </div>
    </Lienzo>
  )
}

/** Carta jugada sobre la mesa (estática) y carta deshabilitada. */
export function Estados() {
  return (
    <Lienzo>
      <div className="flex items-start gap-6">
        <PlayingCard card={sieteOro} className="w-24" />
        <PlayingCard card={tresBasto} interactive disabled className="w-24" />
      </div>
    </Lienzo>
  )
}
