// Pausa visual compartida: no participa del azar ni de las reglas del bot.
export function botThinkMs(game: { envido_state: { status: string; last_singer: string | null };
  truco_state: { status: string; last_singer: string | null } }, owner: string): number {
  const unresolved = ['envido', 'real_envido', 'falta_envido', 'declaring'].includes(game.envido_state.status)
  const bigCall = (['truco', 'retruco', 'vale_cuatro'].includes(game.truco_state.status)
    && game.truco_state.last_singer === owner && !unresolved)
    || (['envido', 'real_envido', 'falta_envido'].includes(game.envido_state.status) && game.envido_state.last_singer === owner)
  return bigCall ? 1800 + Math.random() * 2400 + (Math.random() < 0.18 ? 1800 : 0)
    : game.envido_state.status === 'declaring' ? 1200 + Math.random() * 1100 : 1100 + Math.random() * 1300
}
