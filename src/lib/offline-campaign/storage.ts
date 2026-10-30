import { CAMPAIGN_VERSION, prepareSavedCampaign, type Campaign, type Snapshot } from './model'

const DB = 'trucazo-historia-local-v1'
export async function openCampaignStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('meta'); request.result.createObjectStore('campaigns')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openCampaignStore()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly'), req = tx.objectStore(store).get(key)
      req.onsuccess = () => { tx.oncomplete = () => resolve(req.result) }
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export const campaignOwner = () => read<string>('meta', 'active')
export const loadCampaign = (owner: string) => read<Campaign>('campaigns', owner)
export async function removeCampaign(owner: string): Promise<void> {
  const db = await openCampaignStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['meta', 'campaigns'], 'readwrite')
      tx.objectStore('campaigns').delete(owner)
      const active = tx.objectStore('meta').get('active')
      active.onsuccess = () => { if (active.result === owner) tx.objectStore('meta').delete('active') }
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export async function hideCampaign(): Promise<void> {
  const db = await openCampaignStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').delete('active')
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
// La cuenta preparada y su estado cambian juntos. Una renovación nunca borra
// el registro que se necesita para validar resultados todavía pendientes.
export async function prepareCampaign(snapshot: Snapshot, digest: string): Promise<Campaign> {
  const db = await openCampaignStore()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['meta', 'campaigns'], 'readwrite'), games = tx.objectStore('campaigns')
      const req = games.get(snapshot.userId)
      let saved: Campaign, reason: unknown
      req.onsuccess = () => {
        try {
          const old = req.result as Campaign | undefined
          saved = prepareSavedCampaign(old, snapshot, digest)
          games.put(saved, snapshot.userId); tx.objectStore('meta').put(snapshot.userId, 'active')
        } catch (error) { reason = error; tx.abort() }
      }
      tx.oncomplete = () => resolve(saved)
      tx.onabort = () => reject(reason ?? tx.error)
    })
  } finally { db.close() }
}
export async function saveCampaign(next: Campaign, previous: Campaign): Promise<void> {
  if (next.version !== CAMPAIGN_VERSION || next.owner !== previous.owner || next.revision !== previous.revision + 1) {
    throw new Error('Guardado no compatible.')
  }
  const db = await openCampaignStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['meta', 'campaigns'], 'readwrite'), games = tx.objectStore('campaigns')
      const owner = tx.objectStore('meta').get('active'), game = games.get(next.owner)
      let remaining = 2, reason: Error | null = null
      const check = () => {
        if (--remaining) return
        if (owner.result !== next.owner || game.result?.revision !== previous.revision) {
          reason = new Error('La cuenta o la partida cambió en otra ventana. Volvé al último guardado.')
          tx.abort(); return
        }
        try { games.put(next, next.owner) }
        catch { reason = new Error('No se pudo guardar. La jugada no avanzó.'); tx.abort() }
      }
      owner.onsuccess = check; game.onsuccess = check
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(reason ?? tx.error)
    })
  } finally { db.close() }
}
