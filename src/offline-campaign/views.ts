import type { Props, RankingRow } from '../components/historia/HistoriaScreen'
import { beaten, provinceUnlocked, rivalUnlocked, type Campaign } from '../lib/offline-campaign/model'

// Solo presentación. Puntos, desbloqueos y avance provienen del motor guardado.
export function campaignView(c: Campaign): Pick<Props, 'points' | 'fama' | 'coins' | 'style' | 'provinces'> {
  const s = c.style, sung = s.envido_sung + s.truco_sung, hands = Math.max(1, s.hands_played)
  return { points: c.points, fama: Math.min(100, Math.floor(c.points / 20)), coins: c.official.coins,
    style: { known: s.hands_played >= 8, hands: s.hands_played,
      liar: Math.round((s.envido_bluff + s.truco_bluff) / Math.max(1, sung) * 100),
      folder: Math.round(Math.min(1, (s.envido_folded + s.truco_folded) / hands * 2) * 100),
      aggressive: Math.round(Math.min(1, sung / hands / 1.5) * 100) },
    provinces: c.official.catalog.provinces.map(p => ({ ...p, unlocked: provinceUnlocked(c, p),
      rivals: c.official.catalog.rivals.filter(r => r.province_id === p.id)
        .sort((a, b) => a.points_required - b.points_required || a.order_index - b.order_index)
        .map(r => ({ ...r, beaten: beaten(c, r.id), unlocked: rivalUnlocked(c, r) })) })) }
}
export function campaignRanking(c: Campaign): RankingRow[] {
  const rows = c.official.catalog.rivals.map(r => ({ name: r.display_name, slug: r.slug as string | null,
    points: r.ranking_points, is_user: false, beaten: beaten(c, r.id) as boolean | null,
    province: c.official.catalog.provinces.find(p => p.id === r.province_id)!.slug as string | null }))
  rows.push({ name: c.presentation?.username ?? 'Vos', slug: null, points: c.points, is_user: true, beaten: null, province: null })
  return rows.sort((a, b) => b.points - a.points || Number(a.is_user) - Number(b.is_user)
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((r, i) => ({ ...r, position: i + 1 }))
}
