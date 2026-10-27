import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { playerFixture, ids } from './player-fixture'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
async function main() {
const f = await playerFixture()
const coins = async () => (await f.db.query<{coins:number}>('select coins from profiles where id=$1',[ids.A])).rows[0].coins
try {
  const before = await coins()
  for (const [kind, slug] of [['salon','cafetin'],['frame','dorado'],['accessory','agua']]) {
    await f.rpc('buy_' + kind, { p_slug: slug })
    const paid = await coins()
    await assert.rejects(() => f.rpc('buy_' + kind, { p_slug: slug }), /ya tenés/)
    assert.equal(await coins(), paid)
    await assert.rejects(() => f.rpc('set_active_' + kind, { p_slug: slug }, ids.B), /compraste|tenés/)
  }
  assert.equal(await coins(), before - 300)
  await f.db.query('update profiles set coins=0 where id=$1',[ids.B])
  await assert.rejects(() => f.rpc('buy_salon', {p_slug:'cafetin'}, ids.B), /alcanzan/)
  assert.equal(await f.rpc('claim_bonus', {}, ids.B),100)
  await assert.rejects(() => f.rpc('claim_bonus', {}, ids.B), /tenés monedas/)
  await assert.rejects(() => f.rpc('set_active_medal', {p_slug:'rey'}, ids.B), /medalla/)
  let objectives = await f.rpc('get_my_objectives', {p_game_id:null})
  const assignment = objectives.daily[0]
  await assert.rejects(() => f.rpc('claim_objective_reward', {p_type:'daily',p_identifier:assignment.identifier}), /completa/)
  // Preparación de un objetivo cumplido únicamente en la base descartable.
  await f.db.query('update daily_mission_assignments set progress=999,completed_at=now() where profile_id=$1 and template_slug=$2',[ids.A,assignment.identifier])
  const beforeClaim = await coins()
  await f.rpc('claim_objective_reward', {p_type:'daily',p_identifier:assignment.identifier})
  await f.rpc('claim_objective_reward', {p_type:'daily',p_identifier:assignment.identifier})
  assert.equal(await coins(), beforeClaim + assignment.reward)
  const saved = await f.rpc('get_my_objectives', {p_game_id:null})
  await f.rpc('get_my_objectives', {p_game_id:null}, ids.B)
  objectives = await f.rpc('get_my_objectives', {p_game_id:null})
  assert.deepEqual(objectives.daily, saved.daily)
  assert.deepEqual(await f.asUser(ids.B, async () => (await f.db.query('select * from daily_mission_assignments where profile_id=$1',[ids.A])).rows), [])
  const targets = new Set<number>()
  for (const rival of f.catalog.rivals) {
    // El servidor rechaza acceso directo sin requisitos, aun si se salta el mapa.
    if (rival.points_required > 0) await assert.rejects(() => f.rpc('start_campaign_duel', {p_rival_id:rival.id}), /desbloque|Irene|Salvador/)
    await f.db.query('update profiles set campaign_points=50000 where id=$1',[ids.A])
    for (const gate of f.catalog.provinces.map(p=>p.required_rival_id).filter(Boolean)) await f.db.query('insert into campaign_progress(user_id,rival_id) values($1,$2) on conflict do nothing',[ids.A,gate])
    const game = await f.rpc('start_campaign_duel', {p_rival_id:rival.id})
    assert.equal(game.target_score,rival.target_score); targets.add(game.target_score)
    assert.equal(game.campaign_rival_id,rival.id)
    assert.equal((await f.db.query('select * from game_hands where game_id=$1',[game.id])).rows.length,2)
    await f.db.query('insert into campaign_progress(user_id,rival_id) values($1,$2) on conflict do nothing',[ids.A,rival.id])
    await f.db.query('update profiles set campaign_points=0 where id=$1;',[ids.A])
    await f.rpc('forfeit', {p_game_id:game.id})
    const replay = await f.rpc('start_campaign_duel', {p_rival_id:rival.id})
    assert.equal(replay.target_score,rival.target_score)
    assert.notEqual(replay.id, game.id)
    await f.db.exec('delete from game_hands; delete from games; delete from tables; delete from campaign_progress;')
  }
  assert.deepEqual(Array.from(targets).sort(),[15,30])
  const report = {scope:'PostgreSQL aislado con funciones vigentes; sin producción',purchasesOnce:true,ownershipEnforced:true,insufficientFundsRejected:true,bonusOnce:true,objectiveClaimOnce:true,objectivesPrivateAndStable:true,provinces:f.catalog.provinces.length,rivals:f.catalog.rivals.length,onlineTargets:Array.from(targets),rematchesAtLowerPoints:true}
  await writeFile('android/generated/android-08-player-rules.json',JSON.stringify(report,null,2))
  console.log(report)
} finally { await f.db.close() }

}
void main().catch(error => { console.error(error.message); process.exitCode = 1 })
