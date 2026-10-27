// Campaña ficticia para comprobar una actualización firmada; nunca se envía.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createCampaign, startDuel, applyTurn, CAMPAIGN_VERSION } from '../../../src/lib/offline-campaign/model'
import { EMPTY_STYLE, BOTS_VERSION } from '../../../src/lib/offline-trial/bots'
import { step, botStep, legalActions } from '../../../src/lib/offline-trial/engine'
const owner = '00000000-0000-4000-a016-000000000016'
const catalog = JSON.parse(await readFile('public/android/historia/catalog.json', 'utf8'))
let campaign = createCampaign({ version: CAMPAIGN_VERSION, engine_version: BOTS_VERSION, userId: owner,
  exported_at: '2026-10-16T00:00:00.000Z', points: 0, coins: 0, style: EMPTY_STYLE, progress: [],
  catalog: { provinces: [catalog.provinces[0]], rivals: [catalog.rivals[0]] } }, 'signed-update-fixture')
campaign = startDuel(campaign, catalog.rivals[0].id, 16, '00000000-0000-4000-a016-000000000001')
for (let n = 0; n < 4000 && campaign.trial!.game.status === 'playing'; n++) {
  const trial = campaign.trial!, game = trial.game
  const bot = game.envido_state.status === 'declaring' ? game.envido_state.declare_turn === game.player2_id : game.current_turn === game.player2_id
  const actions = legalActions(trial, owner)
  const action = actions.find(a => a.type === 'advance_hand') ?? actions.find(a => a.type.startsWith('respond_') && a.accept)
    ?? actions.find(a => a.type === 'envido_say' && a.value === 'tengo') ?? actions.find(a => a.type === 'play_card')!
  campaign = applyTurn(campaign, game.awaiting_deal ? step(trial, { player: owner, type: 'advance_hand' }) : bot ? botStep(trial) : step(trial, action), '2026-10-16T00:00:00.000Z')
}
assert.equal(campaign.pending.length, 1)
campaign = startDuel(campaign, catalog.rivals[0].id, 17, '00000000-0000-4000-a016-000000000002')
assert.equal(campaign.trial!.game.status, 'playing')
// Primera escritura del fixture; la revisión interna del motor queda intacta.
campaign.revision = 0
const directory = 'apps/mobile/android/app/src/androidTest/assets'
await mkdir(directory, { recursive: true })
await writeFile(directory + '/update-fixture.json', JSON.stringify(campaign))
console.log('Fixture aislado: una partida abierta y un resultado pendiente, sin cuenta ni autorización real.')
