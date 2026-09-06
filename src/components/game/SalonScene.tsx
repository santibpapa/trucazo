import type { CSSProperties } from 'react'
import { getSalonTheme } from '@/lib/salones'
import styles from './salon.module.css'

/** Arte sin UI: compartido por la partida y la vista previa de la tienda. */
export function SalonBackground({ slug }: { slug?: string }) {
  const theme = getSalonTheme(slug)
  return <div aria-hidden="true" className={styles.background} style={{ backgroundImage: `url('${theme.scene}')` }} />
}

/** Mesa independiente del ambiente: se adapta al espacio de juego disponible. */
export function SalonTable({ slug }: { slug?: string }) {
  const theme = getSalonTheme(slug)
  return (
    <div aria-hidden="true" className={styles.table} style={{ '--table-felt': theme.felt, '--table-edge': theme.edge } as CSSProperties}>
      <div className={styles.felt} />
      <div className={styles.rim} />
    </div>
  )
}
