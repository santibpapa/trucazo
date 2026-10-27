import { VERSION, type Trial } from './engine'

const DB = 'trucazo-tobias-v1'
export async function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => {
      for (const name of ['meta', 'games', 'results']) request.result.createObjectStore(name)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openStore()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly'), req = tx.objectStore(store).get(key)
      let value: T | undefined
      req.onsuccess = () => { value = req.result }
      tx.oncomplete = () => resolve(value)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export const activeOwner = () => read<string>('meta', 'active')
export const loadTrial = (owner: string) => read<Trial>('games', owner)
export async function removeTrial(owner: string): Promise<void> {
  const db = await openStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['meta', 'games', 'results'], 'readwrite')
      tx.objectStore('games').delete(owner)
      const active = tx.objectStore('meta').get('active')
      active.onsuccess = () => { if (active.result === owner) tx.objectStore('meta').delete('active') }
      const cursor = tx.objectStore('results').openCursor()
      cursor.onsuccess = () => {
        const row = cursor.result
        if (!row) return
        if (String(row.key).startsWith(owner + ':')) row.delete()
        row.continue()
      }
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export async function setOwner(owner: string | null): Promise<void> {
  const db = await openStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite'), meta = tx.objectStore('meta')
      if (owner) meta.put(owner, 'active'); else meta.delete('active')
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
// Compare y guarde dentro de una sola transacción: dos pestañas no pueden
// aceptar la misma revisión ni escribir para una identidad que ya cambió.
export async function saveTrial(next: Trial, previous?: Trial): Promise<void> {
  if (next.version !== VERSION) throw new Error('Versión de partida no compatible.')
  const db = await openStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['meta', 'games', 'results'], 'readwrite')
      const games = tx.objectStore('games'), meta = tx.objectStore('meta')
      let reason: Error | null = null
      const ownerReq = meta.get('active'), gameReq = games.get(next.owner)
      let remaining = 2
      const check = () => {
        if (--remaining) return
        const current = gameReq.result as Trial | undefined
        const same = previous ? current?.id === previous.id && current.revision === previous.revision : !current
        if (ownerReq.result !== next.owner || !same) {
          reason = new Error('La partida cambió en otra ventana. Volvé a continuar desde el último guardado.')
          tx.abort(); return
        }
        try {
          games.put(next, next.owner)
          if (next.result) tx.objectStore('results').put(next, next.owner + ':' + next.id)
        } catch (error) {
          reason = error instanceof Error ? error : new Error('No se pudo guardar.')
          tx.abort()
        }
      }
      ownerReq.onsuccess = check; gameReq.onsuccess = check
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(reason ?? tx.error ?? new Error('No se pudo guardar.'))
    })
  } finally { db.close() }
}
