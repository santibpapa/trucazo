export function generatePrivateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function formatCoins(coins: number): string {
  return coins.toLocaleString('es-AR')
}