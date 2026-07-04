'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Panel, Coins, cn } from '@/components/ui'
import { Profile, CommunityData } from '@/lib/types'
import { useCommunity } from '@/lib/useCommunity'
import FriendsPanel from '@/components/FriendsPanel'
import GroupPanel from '@/components/GroupPanel'
import ChatGlobal from '@/components/ChatGlobal'

interface Props {
  profile: Profile
  initialCommunity: CommunityData | null
}

type Tab = 'chat' | 'amigos' | 'grupo' | 'novedades'

export default function ComunidadClient({ profile, initialCommunity }: Props) {
  const c = useCommunity(profile.id, initialCommunity)
  const [tab, setTab] = useState<Tab>('amigos')
  // En compu el chat vive fijo a la izquierda; la columna derecha muestra la
  // pestaña activa (si en el celu estaba en Chat, acá cae en Amigos).
  const rightTab: Exclude<Tab, 'chat'> = tab === 'chat' ? 'amigos' : tab

  const pendientes = (c.data?.incoming.length ?? 0) + (c.data?.invites_in.length ?? 0)
  const grupoPend = c.data?.group_invites_in.length ?? 0

  return (
    <main className="flex flex-col min-h-screen p-4 sm:p-6 gap-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/lobby"
            aria-label="Volver al lobby"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface2 border border-line text-cream hover:text-gold hover:border-gold/60 transition-colors shadow-card shrink-0"
          >
            <BackIcon />
          </Link>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-cream truncate">Comunidad</h1>
        </div>
        <Panel className="flex items-center gap-2 px-3 py-1.5 !rounded-full shrink-0">
          <Coins amount={profile.coins} size="sm" />
        </Panel>
      </header>

      {/* Pestañas (en compu, Chat no aparece: vive fijo a la izquierda) */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} className="lg:hidden">
          Chat
        </TabButton>
        <TabButton active={rightTab === 'amigos'} onClick={() => setTab('amigos')} badge={pendientes}>
          Amigos
        </TabButton>
        <TabButton active={rightTab === 'grupo'} onClick={() => setTab('grupo')} badge={grupoPend}>
          Grupo
        </TabButton>
        <TabButton active={rightTab === 'novedades'} onClick={() => setTab('novedades')}>
          Novedades
        </TabButton>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start">
        {/* Chat global */}
        <Panel className={cn('p-4 sm:p-5', tab === 'chat' ? 'block' : 'hidden lg:block')}>
          <ChatGlobal myId={profile.id} isAdmin={!!profile.is_admin} />
        </Panel>

        {/* Columna derecha: pestaña activa */}
        <Panel className={cn('p-5', tab !== 'chat' ? 'block' : 'hidden lg:block')}>
          {rightTab === 'amigos' && <FriendsPanel c={c} />}
          {rightTab === 'grupo' && <GroupPanel c={c} myId={profile.id} />}
          {rightTab === 'novedades' && (
            <Placeholder
              icon={<MegaphoneIcon />}
              title="Novedades"
              text="Acá se van a publicar las novedades y actualizaciones del juego."
            />
          )}
        </Panel>
      </div>
    </main>
  )
}

function TabButton({
  active, onClick, children, badge = 0, className,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; badge?: number; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative shrink-0 rounded-full border px-4 py-2 text-sm font-display font-bold transition-colors',
        active ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-surface2 text-muted hover:text-cream',
        className,
      )}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// Sección que todavía no llegó (se construye por etapas).
function Placeholder({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="w-12 h-12 rounded-full bg-surface2 border border-line flex items-center justify-center text-gold">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-lg font-bold text-cream">{title}</h2>
        <p className="text-sm text-subtle mt-1 max-w-xs mx-auto">{text}</p>
      </div>
      <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
        Próximamente
      </span>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function MegaphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}
