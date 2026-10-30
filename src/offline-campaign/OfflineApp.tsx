import { useState } from 'react'
import HistoriaScreen from '../components/historia/HistoriaScreen'
import { Button, Panel, Logo, Modal } from '../components/ui'
import OfflineGame from './OfflineGame'
import { campaignView, campaignRanking } from './views'
import type { Campaign } from '../lib/offline-campaign/model'
import type { Action } from '../lib/offline-trial/engine'

export default function OfflineApp({ campaign, running, busy, status, error, BackLink, lobbyHref = '/lobby', onlineHref, campaignMode = false, onPrepare, onSync, onStart, onResume, onLeave, onAction }: {
  campaign?: Campaign; running: boolean; busy: boolean; status: string; onPrepare: () => void; onSync?: () => void;
  error?: string; BackLink?: React.ElementType; lobbyHref?: string;
  onlineHref?: string;
  campaignMode?: boolean;
  onStart: (id: string) => Promise<void>; onResume: () => void; onLeave: () => void; onAction: (a: Action) => Promise<void>
}) {
  const [menu, setMenu] = useState(false)
  const open = campaign?.trial?.game.status === 'playing'
  return <>
    <p id="status" role="status" className="sr-only">{status}</p>
    {error && <p role="alert" className="fixed top-16 inset-x-3 z-50 rounded-xl border border-negative/40 bg-surface2 p-3 text-center text-sm text-negative">{error}</p>}
    {!campaign ? <main id="welcome" className="min-h-dvh flex items-center justify-center p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 text-center">
        <Logo size="md" className="self-center" />
        <h1 className="font-display text-xl font-bold text-cream">{campaignMode ? 'Modo Campaña' : 'Historia sin internet'}</h1>
        <p className="text-sm text-muted">{campaignMode ? 'Prepará tu campaña una vez con internet. Después recorré Argentina y retomá tus partidas con o sin conexión.' : 'Descargá Historia una vez con tu cuenta. Después podés jugar y retomar sin conexión.'}</p>
        <Button id="prepare" fullWidth disabled={busy} onClick={onPrepare}>{busy ? 'Preparando…' : campaignMode ? 'Preparar campaña' : 'Descargar Historia'}</Button>
        <p className="text-xs text-muted">{status}</p>
        {onlineHref && <a href={onlineHref} className="text-sm text-gold">Jugar online</a>}
        <a href={lobbyHref} className="flex min-h-11 items-center justify-center text-sm text-gold">{campaignMode ? 'Volver al menú principal' : 'Volver al lobby'}</a>
      </Panel>
    </main> : running && campaign.trial ? <OfflineGame key={campaign.trial.id} campaign={campaign} busy={busy}
      onAction={onAction} onLeave={onLeave} onReplay={onStart} /> : <div id="campaign" className="h-dvh">
      <HistoriaScreen {...campaignView(campaign)} storageOwner={campaign.owner} BackLink={BackLink} onPlay={onStart} loadRanking={async () => campaignRanking(campaign)}
        title={campaignMode ? 'Modo Campaña' : undefined} backHref={lobbyHref} backLabel={campaignMode ? 'Volver al menú principal' : undefined}
        controls={<div className="fixed bottom-3 inset-x-0 z-20 flex justify-center gap-2 px-3 pointer-events-none">
          {open && <Button id="resume" size="sm" disabled={busy} className="pointer-events-auto shadow-card" onClick={onResume}>Continuar partida</Button>}
          {onlineHref && !open && <a href={onlineHref} className="pointer-events-auto rounded-full border border-line bg-surface2/95 px-3 py-2 text-xs font-bold text-gold shadow-card">Jugar online</a>}
          <button className="pointer-events-auto rounded-full border border-line bg-surface2/95 px-3 py-2 text-xs font-bold text-gold shadow-card" onClick={() => setMenu(true)}>{campaignMode ? 'Progreso y guardado' : 'Sin internet · guardado'}</button>
        </div>} />
    </div>}
    <Modal open={menu && !!campaign && !running} onClose={() => setMenu(false)} title={campaignMode ? 'Progreso y guardado' : 'Historia sin internet'} showCloseButton>
      <p className="text-sm text-muted">{status}</p>
      {campaign && <p className="text-sm text-muted">Confirmado: {campaign.official.points.toLocaleString('es-AR')} puntos · En este dispositivo: {campaign.points.toLocaleString('es-AR')} puntos.</p>}
      {campaign && <p className="text-sm text-muted">{campaign.pending_coins.toLocaleString('es-AR')} monedas por confirmar. Estarán disponibles al sincronizar los premios.</p>}
      {!!campaign?.pending.length && onSync && <Button id="sync" disabled={busy || open} fullWidth onClick={onSync}>Reintentar sincronización</Button>}
      <Button id="refresh" disabled={busy} fullWidth onClick={onPrepare}>{busy ? 'Preparando…' : campaignMode ? 'Actualizar campaña' : 'Actualizar descarga'}</Button>
    </Modal>
  </>
}
