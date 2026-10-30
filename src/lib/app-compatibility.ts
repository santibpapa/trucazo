export type AppCompatibility = {
  compatible: boolean
  versionCode: number | null
  minimumCode: number
  updateUrl: string | null
  activeGameId: string | null
  activeTeamId: string | null
  contract: 'trucazo-online-v1'
}

export function validCompatibility(value: unknown): value is AppCompatibility {
  if (!value || typeof value !== 'object') return false
  const state = value as AppCompatibility
  return typeof state.compatible === 'boolean' && Number.isSafeInteger(state.minimumCode)
    && state.contract === 'trucazo-online-v1'
    && (state.compatible || typeof state.updateUrl === 'string' && /^https:\/\/(www\.trucazo\.com\.ar\/|play\.google\.com\/store\/apps\/details\?id=ar\.com\.trucazo\.app$)/.test(state.updateUrl))
}
