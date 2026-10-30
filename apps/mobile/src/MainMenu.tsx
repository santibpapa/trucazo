import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import Logo from '../../../src/components/ui/Logo'
import Button from '../../../src/components/ui/Button'
import { isMuted, setMuted } from '../../../src/lib/sounds'
import { Image } from './navigation'
import styles from './main-menu.module.css'

function MenuIcon({ kind }: { kind: 'settings' | 'exit' }) {
  const paths = {
    settings: 'm9 3-.5 2.1-1.4.8-2.1-.6-3 5.2 1.6 1.5v1.6L2 15.1l3 5.2 2.1-.6 1.4.8L9 22h6l.5-1.5 1.4-.8 2.1.6 3-5.2-1.6-1.5V12L22 10.5l-3-5.2-2.1.6-1.4-.8L15 3H9Z',
    exit: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5M21 12H9',
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} />{kind === 'settings' && <circle cx="12" cy="12.5" r="3" />}</svg>
}

function MenuArrow() {
  return <span className={styles.arrow} aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></span>
}

export default function MainMenu() {
  const [notice, setNotice] = useState('')
  async function exit() {
    if (!Capacitor.isNativePlatform()) { setNotice('Podés cerrar esta pestaña. Tu sesión queda abierta.'); return }
    try { await App.minimizeApp() }
    catch { setNotice('No pudimos salir. Reintentá o usá el botón de inicio del teléfono.') }
  }
  return <main className={styles.menu}>
    <Image src="/mesa/salon.webp" alt="" aria-hidden="true" priority className={styles.backdrop} />
    <div className={styles.content}>
      <header className={styles.brand}>
        <Logo size="lg" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Truco argentino</p>
        <h1 className="text-sm text-muted">Elegí cómo querés jugar</h1>
      </header>
      <nav aria-label="Menú principal" className={styles.options}>
        <a href="#/historia/offline" className={styles.primary}>
          <span className={styles.portrait}><Image src="/lobby/campana-nav.webp" alt="" width="76" height="76" priority /></span>
          <span className={styles.copy}><span className={styles.title}>Modo Campaña</span><span className={styles.description}>Recorré Argentina y desafiá a cada rival. Incluso sin internet.</span></span>
          <MenuArrow />
        </a>
        <a href="#/lobby" className={`${styles.primary} ${styles.multiplayer}`}>
          <span className={styles.cards} aria-hidden="true"><Image src="/cartas/basto_01.webp" alt="" width="44" height="68" priority /><Image src="/cartas/espada_01.webp" alt="" width="44" height="68" priority /></span>
          <span className={styles.copy}><span className={styles.title}>Multijugador</span><span className={styles.description}>Jugá con amigos o encontrá rivales. Mano a mano, parejas y torneos.</span></span>
          <MenuArrow />
        </a>
        <a href="#/ajustes" className={styles.secondary}>
          <span className={styles.icon}><MenuIcon kind="settings" /></span>
          <span className={styles.copy}><span className={styles.title}>Ajustes</span><span className={styles.description}>Sonido, notificaciones y tu cuenta.</span></span>
          <MenuArrow />
        </a>
        <button type="button" onClick={() => { void exit() }} className={styles.secondary}>
          <span className={styles.icon}><MenuIcon kind="exit" /></span>
          <span className={styles.copy}><span className={styles.title}>Salir</span><span className={styles.description}>Tu progreso queda guardado.</span></span>
          <MenuArrow />
        </button>
      </nav>
      {notice && <p role="alert" className={styles.notice}>{notice}</p>}
    </div>
  </main>
}

export function Settings({ online, error, onLogout }: { online: boolean; error: string; onLogout: () => Promise<void> }) {
  const [muted, updateMuted] = useState(isMuted)
  const linkClass = 'flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 text-sm font-semibold text-cream hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5 pb-10">
    <a href="#/inicio" className="flex min-h-11 items-center text-sm text-gold">← Menú principal</a>
    <header><h1 className="font-display text-2xl font-bold">Ajustes</h1><p className="mt-2 text-sm text-muted">Dejá Trucazo a tu gusto.</p></header>
    <label className={linkClass}>
      <span>Sonido del juego<span className="mt-1 block text-xs font-normal text-muted">Cartas, cantos y resultados.</span></span>
      <input type="checkbox" role="switch" aria-label="Sonido del juego" checked={!muted} className="h-6 w-6 shrink-0 accent-gold" onChange={event => { const value = !event.target.checked; setMuted(value); updateMuted(value) }} />
    </label>
    <a href="#/notificaciones?from=ajustes" className={linkClass}>Notificaciones<span aria-hidden="true" className="text-gold">›</span></a>
    <a href="#/profile?from=ajustes" className={linkClass}>Mi cuenta<span aria-hidden="true" className="text-gold">›</span></a>
    {!online && <p role="status" className="text-xs text-muted">El sonido se puede cambiar sin internet. Conectate para consultar tu cuenta y tus notificaciones.</p>}
    {error && <p role="alert" className="text-sm text-negative">{error}</p>}
    <Button variant="ghost" fullWidth onClick={() => { void onLogout() }}>Cerrar sesión</Button>
  </main>
}
