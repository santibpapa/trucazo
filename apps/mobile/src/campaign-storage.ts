import { Capacitor, registerPlugin } from '@capacitor/core'
import { BOTS_VERSION } from '../../../src/lib/offline-trial/bots'
import { CAMPAIGN_VERSION, prepareSavedCampaign, type Campaign, type Snapshot } from '../../../src/lib/offline-campaign/model'
import * as web from '../../../src/lib/offline-campaign/storage'

const native = registerPlugin<{
  read(options: { owner: string }): Promise<{ active?: string; body?: string }>
  activate(options: { owner: string | null }): Promise<{ active?: string; body?: string }>
  commit(options: { owner: string; body: string; expectedRevision: number }): Promise<void>
  remove(options: { owner: string }): Promise<void>
}>('CampaignStore')

function decode(body: string | undefined, owner: string): Campaign | undefined {
  if (!body) return undefined
  const saved = JSON.parse(body) as Campaign
  if (saved.owner !== owner || saved.official.userId !== owner || saved.version !== CAMPAIGN_VERSION
    || saved.official.engine_version !== BOTS_VERSION || (saved.trial && saved.trial.version !== BOTS_VERSION)
    || saved.pending.some(record => record.trial.version !== BOTS_VERSION) || !Number.isInteger(saved.revision)) {
    throw new Error('El guardado necesita su versión anterior. Se conserva en este dispositivo.')
  }
  return saved
}
export async function loadCampaign(owner: string): Promise<Campaign | undefined> {
  return Capacitor.isNativePlatform() ? decode((await native.read({ owner })).body, owner) : web.loadCampaign(owner)
}
export async function activateCampaign(owner: string): Promise<Campaign | undefined> {
  if (Capacitor.isNativePlatform()) return decode((await native.activate({ owner })).body, owner)
  const db = await web.openCampaignStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(owner, 'active')
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
  return web.loadCampaign(owner)
}
export async function hideCampaign() {
  if (Capacitor.isNativePlatform()) await native.activate({ owner: null })
  else await web.hideCampaign()
}
export async function removeCampaign(owner: string) {
  if (Capacitor.isNativePlatform()) await native.remove({ owner })
  else await web.removeCampaign(owner)
}
export async function prepareCampaign(snapshot: Snapshot, digest: string) {
  if (!Capacitor.isNativePlatform()) return web.prepareCampaign(snapshot, digest)
  const old = await loadCampaign(snapshot.userId), next = prepareSavedCampaign(old, snapshot, digest)
  await native.commit({ owner: next.owner, body: JSON.stringify(next), expectedRevision: old?.revision ?? -1 })
  return next
}
export async function saveCampaign(next: Campaign, previous: Campaign) {
  if (!Capacitor.isNativePlatform()) return web.saveCampaign(next, previous)
  if (next.owner !== previous.owner || next.revision !== previous.revision + 1) throw new Error('Guardado no compatible.')
  await native.commit({ owner: next.owner, body: JSON.stringify(next), expectedRevision: previous.revision })
}
