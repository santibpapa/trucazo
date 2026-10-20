import styles from './WaitingForPlayers.module.css'

export default function WaitingForPlayers({ children }: { children: string }) {
  return <div role="status" aria-atomic="true" className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center">
    <p className="font-display text-base font-bold text-gold">
      {children}<span aria-hidden="true" className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
    </p>
  </div>
}
