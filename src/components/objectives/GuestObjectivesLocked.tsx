'use client'

import type { Objective } from '@/lib/objectives'
import { ChestRow, WeeklyRow } from './ChestRow'

const GUEST_OBJECTIVES: Objective[] = [
  {
    type: 'daily',
    identifier: 'guest_finish_1',
    name: 'Primera del día',
    description: 'Terminá 1 partida válida.',
    category: 'participation',
    difficulty: 'easy',
    progress: 0,
    target: 1,
    reward: 20,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'daily',
    identifier: 'guest_win_human_1',
    name: 'Duelo ganado',
    description: 'Ganá 1 partida contra una persona.',
    category: 'competition',
    difficulty: 'competitive',
    progress: 0,
    target: 1,
    reward: 40,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'daily',
    identifier: 'guest_campaign_play_2',
    name: 'Camino de provincias',
    description: 'Jugá 2 duelos del Modo Historia.',
    category: 'history',
    difficulty: 'easy',
    progress: 0,
    target: 2,
    reward: 25,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'weekly',
    identifier: 'guest_weekly_finish_10',
    name: 'Diez partidas',
    description: 'Terminá 10 partidas válidas esta semana.',
    category: 'weekly',
    difficulty: 'weekly',
    progress: 0,
    target: 10,
    reward: 150,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada semana',
  },
]

const noop = () => {}

/** Misiones de ejemplo, apagadas bajo un velo, para mostrarle al invitado qué
 *  se gana con una cuenta. Las filas son las mismas del cofre real. */
export default function GuestObjectivesLocked() {
  const daily = GUEST_OBJECTIVES.filter(objective => objective.type === 'daily')
  const weekly = GUEST_OBJECTIVES.find(objective => objective.type === 'weekly')!
  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-black/55 shadow-[inset_0_0_42px_rgba(0,0,0,0.92)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="w-full max-w-xs rounded-2xl border border-gold/35 bg-surface px-4 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.9)]">
          <p className="font-semibold text-cream">Desbloqueá tus recompensas</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Registrate o iniciá sesión y estas misiones empiezan a contar desde tu próxima partida.</p>
        </div>
      </div>
      <div aria-label="Misiones bloqueadas">
        <div className="grid gap-2 p-3">
          {daily.map(objective => (
            <ChestRow key={objective.identifier} objective={objective} claiming={false} onClaim={noop} />
          ))}
        </div>
        <WeeklyRow objective={weekly} claiming={false} onClaim={noop} />
      </div>
    </div>
  )
}
