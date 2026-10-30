import { cachedSession } from './services'
import { removeCampaign } from './campaign-storage'
import { stopPush } from './push'
import { cancelAuth } from './auth'

export async function clearDeletedAccount(owner: string) {
  if (cachedSession()?.user.id === owner) {
    // El servidor ya eliminó los dispositivos; detener también lo que quedó local.
    await stopPush(true).catch(() => {})
    cancelAuth()
  }
  await removeCampaign(owner)
  localStorage.removeItem('trucazo:mobile:screen:' + owner)
}
