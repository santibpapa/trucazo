import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { syncFixture, SYNC_OWNER } from './offline-sync-fixture'
import { createCampaign, startDuel, applyTurn, confirmResults, type Snapshot, type Campaign } from '../src/lib/offline-campaign/model'
import { synchronize } from '../src/lib/offline-campaign/sync'
import { legalActions, step, botStep } from '../src/lib/offline-trial/engine'

async function main() {
 const {db,catalog,defs}=await syncFixture(), owner=SYNC_OWNER
 try {
  const prepare=async()=>(await db.query<{value:Snapshot}>('select prepare_offline_campaign() value')).rows[0].value
  const sync=async(c:Campaign,complete=true)=>(await db.query<{value:any}>('select sync_offline_campaign($1::jsonb,$2) value',[JSON.stringify(c.pending),complete])).rows[0].value
  const run=(c:Campaign,rival=catalog.rivals[0].id)=>{
   c=startDuel(c,rival,1,randomUUID())
   for(let n=0;n<4000&&c.trial!.game.status==='playing';n++) {
    const t=c.trial!,g=t.game,bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
    const actions=legalActions(t,owner),a=actions.find(a=>a.type==='advance_hand')??actions.find(a=>a.type.startsWith('respond_')&&a.accept)
      ??actions.find(a=>a.type==='envido_say'&&a.value==='tengo')??actions.filter(a=>a.type==='play_card').sort((a,b)=>a.card!.rank-b.card!.rank)[0]
    c=applyTurn(c,g.awaiting_deal?step(t,{player:owner,type:'advance_hand'}):bot?botStep(t):step(t,a),new Date().toISOString())
   }
   assert.equal(c.trial!.game.status,'finished');return c
  }
  const seeded=async(points=0,duel=77)=>{
   await db.query('update profiles set campaign_points=$1 where id=$2',[points,owner])
   const s=await prepare(),root=(duel^2654435761)>>>0
   await db.query('update offline_replay_v1.downloads set seed=$1 where id=$2',[root,s.grant!.id]);s.grant!.seed=root;return s
  }
  let c=run(createCampaign(await seeded(),'fixture'))
  const profile=async()=>(await db.query<{coins:number;campaign_points:number}>('select coins,campaign_points from profiles where id=$1',[owner])).rows[0]
  const before=await profile()
  const changes:Array<(c:Campaign)=>void>=[
   c=>c.pending[0].trial.seed++,c=>c.pending[0].trial.rng++,c=>c.pending[0].trial.owner=randomUUID(),
   c=>c.pending[0].trial.bot!.initial_style.hands_played++,c=>c.pending[0].trial.bot!.campaign_points++,
   c=>(c.pending[0].trial.bot!.rival as any).reward_coins++,c=>c.pending[0].trial.actions[0].rng++,
   c=>c.pending[0].trial.actions[0].action.player=randomUUID(),c=>c.pending[0].trial.actions.splice(0,1),
   c=>c.pending[0].trial.result!.scores[0]++,c=>delete (c.pending[0].trial.game as any).status,
   c=>c.pending[0].projected_reward.points++,c=>c.pending[0].dependencies.push(randomUUID()),
   c=>c.pending[0].sequence=(c.pending[0].sequence??0)+1,c=>c.pending[0].grant_id=randomUUID(),c=>c.pending[0].trial.version='otra',
   c=>c.pending[0].trial.hands[0].push({suit:'oro',value:1,rank:100} as any),
   c=>{const a=c.pending[0].trial.actions.find(a=>a.action.card)!;a.action.card!.rank++},
  ]
  for(const change of changes) {
   const altered=structuredClone(c);change(altered);await assert.rejects(sync(altered));assert.deepEqual(await profile(),before)
   assert.equal((await db.query('select * from offline_replay_v1.receipts')).rows.length,0)
   assert.equal((await db.query('select * from offline_replay_v1.games')).rows.length,0)
  }
  const accepted=await sync(c)
  assert.equal(accepted.receipts.length,1)
  const after=await profile()
  assert.deepEqual((await sync(c)).receipts,accepted.receipts)
  assert.deepEqual(await profile(),after)
  assert.equal((await db.query('select * from public.game_hands')).rows.length,0)
  assert.equal((await db.query('select * from offline_replay_v1.game_hands')).rows.length,0)
  const broken=structuredClone(c);broken.pending[0].trial.result!.scores[0]++
  await assert.rejects(sync(broken),/offline:conflict/)
  c=run(c)
  assert.equal((await sync(c)).receipts.length,2)
  const renewed=await synchronize(c,async(records,complete)=>sync({...c,pending:records},complete))
  assert.equal(renewed.pending.length,0);assert.equal(renewed.pending_coins,0);assert.equal(renewed.trial!.id,c.trial!.id)
  assert.equal(renewed.points,renewed.official.points);assert.equal(renewed.receipts!.length,2)
  assert.throws(()=>confirmResults(c,{...accepted.snapshot,userId:randomUUID()},accepted.receipts),/guardado/)
  // Todas las provincias desbloqueadas en la cuenta ficticia: misma validación,
  // bots clásicos y las 20 estrategias de Noroeste, a 15 y 30 puntos.
  await db.exec(`insert into campaign_progress(user_id,rival_id) select '${owner}',id from campaign_rivals on conflict do nothing;`)
  let chain=createCampaign(await seeded(50000,19),'fixture')
  const records:Campaign['pending']=[]
  for(const r of catalog.rivals) {
   // Los comprobantes anteriores ya están en SQL; abreviar sólo sus logs en
   // esta simulación evita copiar miles de turnos en cada movimiento nuevo.
   chain.pending=chain.pending.map(p=>({...p,trial:{...p.trial,actions:[]}}))
   chain=run(chain,r.id)
   records.push(chain.pending.at(-1)!)
   try {await sync({...chain,pending:chain.pending.slice(-1)},false)} catch(error) {console.error('Cadena, rival',r.slug);throw error}
  }
  console.log('Cadena de 66 partidas con proyección y dependencias aprobada.')
  const queue={...chain,pending:records},balanceBeforeRetry=await profile()
  let calls=0
  await assert.rejects(synchronize(queue,async(batch,complete)=>{
   if(++calls===2)throw new TypeError('Corte entre lotes')
   return sync({...queue,pending:batch},complete)
  }),/Corte entre lotes/)
  assert.equal(queue.pending.length,66);assert.deepEqual(await profile(),balanceBeforeRetry)
  calls=0
  const recovered=await synchronize(queue,async(batch,complete)=>{calls++;assert.ok(batch.length<=10);return sync({...queue,pending:batch},complete)})
  assert.equal(calls,7);assert.equal(recovered.pending.length,0);assert.equal(recovered.receipts!.length,66)
  assert.deepEqual(await profile(),balanceBeforeRetry)
  console.log('Siete lotes, corte entre lotes y reenvío completo sin duplicados aprobados.')
  let completed=0
  for(const r of catalog.rivals) {
   const all=run(createCampaign(await seeded(50000,19),'fixture'),r.id)
   try {await sync(all,false)} catch(error) {console.error('Rival',r.slug);throw error}
   completed++;if(completed%20===0)console.log('Rivales comprobados:',completed)
  }
  console.log(`${completed} rivales reconstruidos con SQL; ${changes.length} adulteraciones rechazadas; reintentos y reconciliación aprobados.`)
  // Dos descargas anteriores a la misma primera victoria: sólo una cobra monedas.
  await db.exec(`delete from campaign_progress where user_id='${owner}';update profiles set coins=1000,campaign_points=0 where id='${owner}';`)
  let winningSeed=1,first:Campaign
  do {first=run(createCampaign(await seeded(0,winningSeed++),'fixture'))} while(first.trial!.result!.winner!==owner)
  const other=run(createCampaign(await seeded(0,winningSeed-1),'fixture'))
  const firstResponse=await sync(first!),officialFirst=await profile()
  assert.equal(firstResponse.snapshot.coins,officialFirst.coins);assert.equal(firstResponse.snapshot.points,officialFirst.campaign_points)
  const a=firstResponse.receipts[0],b=(await sync(other)).receipts[0]
  assert.equal(a.coins,catalog.rivals[0].reward_coins);assert.equal(b.coins,0);assert.equal(b.points,Math.floor(catalog.rivals[0].points_reward/10))
  const capped=await sync(first!);assert.deepEqual(capped.receipts[0],a)
  assert.equal((await db.query<{wins:number}>('select wins from campaign_progress where user_id=$1 and rival_id=$2',[owner,catalog.rivals[0].id])).rows[0].wins,2)
  // Un triunfo online ocurre después de la descarga y antes de sincronizar.
  await db.exec(`delete from campaign_progress where user_id='${owner}';update profiles set coins=1000,campaign_points=0 where id='${owner}';`)
  const simultaneous=run(createCampaign(await seeded(0,winningSeed-1),'fixture'))
  const onlineId=randomUUID(),r=catalog.rivals[0]
  await db.query(`insert into tables(id,name,creator_id,creator_username,bet,status) values($1,'Online',$2,'Jugador',0,'playing')`,[onlineId,owner])
  await db.query(`insert into games(id,player1_id,player2_id,player1_username,player2_username,bet,target_score,current_turn,mano_player,campaign_rival_id)
    values($1,$2,$3,'Jugador','Bot',0,$4,$2,$2,$5)`,[onlineId,owner,r.bot_id,r.target_score,r.id])
  await db.query('select finish_game($1,$2,$3,0)',[onlineId,owner,r.target_score])
  // La lectura de estilo online también cambia mientras el dispositivo está sin red.
  await db.query('update campaign_style set envido_sung=envido_sung+3 where user_id=$1',[owner])
  const sung=(await db.query<{n:number}>('select envido_sung n from campaign_style where user_id=$1',[owner])).rows[0].n
  const merged=(await sync(simultaneous)).receipts[0]
  assert.equal(merged.coins,0);assert.equal(merged.points,Math.floor(r.points_reward/10))
  assert.equal((await db.query<{n:number}>('select envido_sung n from campaign_style where user_id=$1',[owner])).rows[0].n,
    sung+simultaneous.style.envido_sung-simultaneous.official.style.envido_sung)
  const serverBalances=await profile();await sync(simultaneous);assert.deepEqual(await profile(),serverBalances)
  // Lote inválido: ni el primer resultado válido ni su estilo quedan acreditados.
  let rollback=run(run(createCampaign(await seeded(0,41),'fixture')))
  const balance=await profile(),styleBefore=(await db.query('select * from campaign_style')).rows
  rollback.pending[1].trial.rng++
  await assert.rejects(sync(rollback));assert.deepEqual(await profile(),balance);assert.deepEqual((await db.query('select * from campaign_style')).rows,styleBefore)
  assert.equal((await db.query('select * from offline_replay_v1.receipts where id=$1',[rollback.pending[0].id])).rows.length,0)
  // Permisos: ningún helper ni registro privado accesible al cliente.
  await db.exec('set role authenticated')
  await assert.rejects(db.query('select * from offline_replay_v1.downloads'),/permission denied/)
  await assert.rejects(db.query('select offline_replay_v1.random()'),/permission denied/)
  await assert.rejects(db.query('select export_offline_campaign()'),/permission denied/)
  assert.equal((await prepare()).userId,owner)
  await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":true}',false)`)
  await assert.rejects(prepare(),/registrada/);await assert.rejects(sync(first!),/registrada/)
  await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":false}',false),set_config('request.jwt.claim.sub','${catalog.rivals[0].bot_id}',false)`)
  await assert.rejects(prepare(),/disponible/)
  await db.exec('reset role; set role anon');await assert.rejects(prepare(),/permission denied/)
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','${owner}',false)`)
  // La instalación se niega si las reglas reales difieren del motor contrastado.
  await db.exec(defs.get('_envido_points')!.replace('declare','declare\n-- diferencia de versión'))
  await assert.rejects(db.exec(await readFile('supabase/migrations/20261011123215_offline_campaign_sync.sql','utf8')),/Regla SQL distinta/)
  await db.exec('rollback');await db.exec(defs.get('_envido_points')!)
  await db.query('delete from profiles where id=$1',[owner])
  assert.equal((await db.query('select * from offline_replay_v1.downloads')).rows.length,0)
  assert.equal((await db.query('select * from offline_replay_v1.receipts')).rows.length,0)
  await assert.rejects(prepare(),/disponible/)
  console.log('Dos dispositivos, mezcla online/offline, rollback total, privacidad, borrado de cuenta y detección de reglas distintas aprobados.')
 } finally {await db.close()}
}
void main().catch(error=>{console.error(error.message,error.where??'',error.detail??'',error.internalQuery??'');process.exitCode=1})
