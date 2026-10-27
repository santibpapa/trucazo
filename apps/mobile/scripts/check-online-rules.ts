import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { onlineFixture, ids } from './online-fixture'
import { createDeck } from '../../../src/lib/truco'
import { fileURLToPath } from 'node:url'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))

async function main() {
  const f = await onlineFixture()
  const game = async (id: string) => (await f.db.query<any>('select * from games where id=$1',[id])).rows[0]
  async function humanGame(target = 15) {
    const table = await f.rpc('create_table',{p_name:'Reglas Android',p_bet:10,p_is_private:false,p_target_score:target,p_time_limit:15},ids.A) as any
    await f.rpc('join_table',{p_table_id:table.id},ids.B)
    await f.rpc('start_game',{p_game_id:table.id},ids.A)
    return table.id as string
  }
  try {
    // Toda la falta y sus tantos se calculan en el SQL vigente.
    const falta = await humanGame(30)
    await f.rpc('sing_envido',{p_game_id:falta,p_type:'falta_envido'},ids.A)
    await f.rpc('respond_envido',{p_game_id:falta,p_accept:true},ids.B)
    await f.rpc('envido_say',{p_game_id:falta,p_action:'tengo'},ids.A)
    await f.rpc('envido_say',{p_game_id:falta,p_action:'tengo'},ids.B)
    const faltaResult = await game(falta)
    assert.equal(faltaResult.status,'finished')
    assert.equal(Math.max(faltaResult.player1_score,faltaResult.player2_score),30)

    // Tres pardas: cartas conocidas de igual rango, no reglas copiadas al APK.
    const parda = await humanGame()
    const deck = createDeck(), h1 = [4,5,6].map(value=>deck.find(c=>c.suit==='oro'&&c.value===value)!)
    const h2 = [4,5,6].map(value=>deck.find(c=>c.suit==='basto'&&c.value===value)!)
    await f.db.query('update game_hands set cards=$1::jsonb where game_id=$2 and player_id=$3',[JSON.stringify(h1),parda,ids.A])
    await f.db.query('update game_hands set cards=$1::jsonb where game_id=$2 and player_id=$3',[JSON.stringify(h2),parda,ids.B])
    for(let i=0;i<3;i++) {
      await f.rpc('play_card',{p_game_id:parda,p_card:h1[i]},ids.A)
      await f.rpc('play_card',{p_game_id:parda,p_card:h2[i]},ids.B)
    }
    const pardaResult = await game(parda)
    assert.equal(pardaResult.player1_score,1)
    assert.equal(pardaResult.player2_score,0)
    assert.equal(pardaResult.awaiting_deal,true)

    // El reloj real del servidor rechaza adelantar el mazo; tres vencimientos
    // confirmados terminan una sola vez y no duplican monedas al reabrir.
    const timed = await humanGame()
    await assert.rejects(()=>f.rpc('timeout_mazo',{p_game_id:timed},ids.A),/hay tiempo/)
    for(let i=0;i<3;i++) {
      await f.db.query("update games set current_turn=$1,turn_started_at=now()-interval '16 seconds' where id=$2",[ids.B,timed])
      await f.rpc('timeout_mazo',{p_game_id:timed},ids.A)
      if(i<2)await f.rpc('advance_hand',{p_game_id:timed},ids.A)
    }
    assert.equal((await game(timed)).winner_id,ids.A)
    assert.equal((await game(timed)).mazo_count_p2,3)
    const coins = (await f.db.query('select id,coins from profiles order by id')).rows
    await f.rpc('start_game',{p_game_id:timed},ids.A)
    assert.deepEqual((await f.db.query('select id,coins from profiles order by id')).rows,coins)
    const bots: unknown[] = []
    for(const target of [15,30]) {
      const table = await f.rpc('create_table',{p_name:'Bot Android '+target,p_bet:10,p_is_private:false,p_target_score:target,p_time_limit:30},ids.A) as any
      await f.rpc('bot_join_table',{p_table_id:table.id},ids.A)
      await f.rpc('start_game',{p_game_id:table.id},ids.A)
      for(let action=0;action<700;action++) {
        const g = await game(table.id)
        if(g.status==='finished')break
        const envido = ['envido','real_envido','falta_envido'].includes(g.envido_state.status)
        const truco = ['truco','retruco','vale_cuatro'].includes(g.truco_state.status)
        if(g.awaiting_deal)await f.rpc('advance_hand',{p_game_id:g.id},ids.A)
        else if(g.envido_state.status==='declaring') {
          await f.rpc(g.envido_state.declare_turn===ids.A?'envido_say':'bot_step',g.envido_state.declare_turn===ids.A?{p_game_id:g.id,p_action:'tengo'}:{p_game_id:g.id},ids.A)
        } else if(envido && g.envido_state.last_singer!==ids.A)await f.rpc('respond_envido',{p_game_id:g.id,p_accept:false},ids.A)
        else if(truco && g.truco_state.last_singer!==ids.A)await f.rpc('respond_truco',{p_game_id:g.id,p_accept:false},ids.A)
        else if(g.current_turn!==ids.A || envido || truco)await f.rpc('bot_step',{p_game_id:g.id},ids.A)
        else {
          const hand = (await f.read('game_hands',new URLSearchParams({game_id:'eq.'+g.id,player_id:'eq.'+ids.A}),ids.A))[0] as any
          await f.rpc('play_card',{p_game_id:g.id,p_card:hand.cards[0]},ids.A)
        }
      }
      const end = await game(table.id)
      assert.equal(end.status,'finished')
      assert.ok(Math.max(end.player1_score,end.player2_score)>=target)
      assert.equal((await f.db.query<{n:number}>('select count(*)::int n from bot_decisions where game_id=$1 and not ok',[table.id])).rows[0].n,0)
      bots.push({target,score:[end.player1_score,end.player2_score],hands:end.hand_number})
    }
    await mkdir('android/generated',{recursive:true})
    await writeFile('android/generated/android-05-rules-fixture.json',JSON.stringify({scope:'SQL 1v1 vigente y RLS en PostgreSQL PGlite aislado; sin triggers de ranking/objetivos',falta:true,threePardas:true,serverTimeout:true,threeTimeouts:true,noDuplicateCoins:true,bots},null,2))
    console.log('OK SQL vigente: falta envido, tres pardas, reloj, tres tiempos, monedas idempotentes y bots completos a 15/30.',bots)
  } finally {await f.db.close()}
}
void main().catch(error=>{console.error(error);process.exitCode=1})
