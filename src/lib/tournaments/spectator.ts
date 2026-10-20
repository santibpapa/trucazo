export function visibleSpectatorCards<T extends { round: number }>(played: T[], round: number): T[] {
  const current = played.filter(card => card.round === round)
  return current.length ? current : played.filter(card => card.round === round - 1)
}
