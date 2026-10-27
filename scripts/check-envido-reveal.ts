import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { currentFunctions, statement } from './offline-catalog'
import type { Game } from '../src/lib/types'

// Reglas SQL reales sobre PostgreSQL aislado; no usa cuentas ni partidas reales.
async function main() {
const db = new PGlite()
const a = randomUUID(), b = randomUUID()
const other = (id: string) => id === a ? b : a
const fixtures: {name: string; before: Game; after: Game; user: string; hand: unknown}[] = []
let checks = 0
try {
  await db.exec(`create schema auth; create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;
    set check_function_bodies=off;`)
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  for (const name of ['games', 'game_hands', 'profiles', 'game_history', 'campaign_rivals', 'campaign_progress']) {
    await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + name + ' (')))
  }
  await db.exec('alter table campaign_progress add primary key(user_id,rival_id)')
  await db.query('insert into profiles(id,username) values($1,$3),($2,$4)', [a,b,'Prueba A','Prueba B'])
  const migration='supabase/migrations/20261023191310_envido_reveal_cierres.sql'
  const definitions = await currentFunctions(basename(migration))
  for (const name of ['_truco_deck', '_envido_points', '_envido_winning_cards', '_envido_reveal_for',
    '_envido_quiero_value', '_envido_reject_value', '_round_leader', '_who_plays_next', '_turn_after_envido',
    'sing_envido', 'respond_envido', 'envido_say', 'sing_truco', 'respond_truco', 'irse_al_mazo', 'play_card', 'finish_game']) {
    assert.ok(definitions.has(name), name)
    await db.exec(definitions.get(name)!)
  }
  // CREATE OR REPLACE debe conservar los permisos de las funciones aplicadas.
  await db.exec(`revoke all on all functions in schema public from public,anon,authenticated;
    grant execute on function public.respond_truco(uuid,boolean),public.play_card(uuid,jsonb) to authenticated;`)
  const permissions=()=>db.query("select proname,prosecdef,proconfig,proacl::text from pg_proc where pronamespace='public'::regnamespace and proname in ('respond_truco','play_card','finish_game') order by proname")
  const beforePermissions=(await permissions()).rows
  const sql=await readFile(migration,'utf8')
  await db.exec(sql)
  await db.exec(sql)
  assert.deepEqual((await permissions()).rows,beforePermissions,'La migración conserva permisos y se puede repetir')
  const snapshot=await readFile('supabase/schema/functions.sql','utf8')
  // finish_game se modifica sobre la variante aplicada (vidas/ranking/offline);
  // sus recorridos y permisos se comprueban abajo, sin exigir otro cuerpo base.
  for (const name of ['respond_truco','play_card']) {
    const body=(await db.query<{body:string}>('select prosrc as body from pg_proc where pronamespace=\'public\'::regnamespace and proname=$1',[name])).rows[0].body.trim()
    assert.ok(snapshot.replace(/\r/g,'').includes(body),'Foto SQL actualizada: '+name)
  }
  async function rpc(name: string, actor: string, gid: string, ...args: unknown[]): Promise<Game> {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [actor])
    return (await db.query<{g: Game}>(`select to_jsonb(public.${name}(${[gid,...args].map((_,i)=>'$'+(i+1)).join(',')})) as g`, [gid,...args])).rows[0].g
  }
  async function fresh(winner: string, mano: string, target: number, points = 25) {
    const id = randomUUID()
    await db.query(`insert into games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score)
      values($1,$2,$3,'Prueba A','Prueba B',$4,$4,0,$5)`, [id,a,b,mano,target])
    // 25 = 5 y figura de basto; 32 = 7 y 5. El rival tiene 4 sin pareja.
    await db.query(`insert into game_hands(game_id,player_id,cards)
      select $1,$2,jsonb_agg(c) from jsonb_array_elements(_truco_deck()) c where
        (c->>'suit'='basto' and (c->>'value')::int in (5,$3)) or (c->>'suit'='oro' and (c->>'value')::int=11)`, [id,winner,points===32?7:10])
    await db.query(`insert into game_hands(game_id,player_id,cards)
      select $1,$2,jsonb_agg(c) from jsonb_array_elements(_truco_deck()) c where
        (c->>'suit'='espada' and (c->>'value')::int=4) or
        (c->>'suit'='copa' and (c->>'value')::int=10) or (c->>'suit'='oro' and (c->>'value')::int=12)`, [id,other(winner)])
    return id
  }
  async function declare(id: string, mano: string, response = 'tengo') {
    const singer = (await db.query<{singer: string}>("select envido_state->>'last_singer' as singer from games where id=$1",[id])).rows[0].singer
    await rpc('respond_envido', other(singer), id, true)
    const before = await rpc('envido_say', mano, id, 'tengo')
    const after = await rpc('envido_say', other(mano), id, response)
    if (before.envido_state.chain.includes('falta_envido') && before.target_score===30 && mano===a && after.winner_id===b) {
      const hand=(await db.query<{cards: unknown}>('select cards from game_hands where game_id=$1 and player_id=$2',[id,a])).rows[0].cards
      fixtures.push({name:'falta',before,after,user:a,hand})
    }
    return after
  }
  async function proof(g: Game, winner: string, points: number, label: string) {
    assert.equal(g.envido_reveal?.player_id, winner, label + ': revela al ganador del envido')
    const played = g.played_cards.filter(c=>c.player_id===winner).map(c=>c.card)
    const cards = g.envido_reveal!.cards
    assert.ok(cards.every(c=>!played.some(p=>p.suit===c.suit&&p.value===c.value)), label + ': sin duplicar cartas jugadas')
    const result = await db.query<{points: number}>('select _envido_points($1::jsonb) as points', [JSON.stringify([...played,...cards])])
    assert.equal(result.rows[0].points, points, label + ': las cartas prueban el tanto')
    assert.ok(cards.every(c=>c.suit==='basto'), label + ': sólo muestra las cartas necesarias')
    checks++
  }
  for (const target of [15,30]) for (const winner of [a,b]) for (const mano of [a,b]) {
    const id = await fresh(winner, mano, target)
    await rpc('sing_envido', mano, id, 'envido')
    let g = await declare(id, mano)
    assert.equal(g.envido_reveal, null, 'No expone cartas mientras sigue la mano')
    g = await rpc('sing_truco', g.current_turn, id, 'truco')
    const before = g
    g = await rpc('respond_truco', other(g.truco_state.last_singer!), id, false)
    if (target===30 && winner===b && mano===b) {
      const hand=(await db.query<{cards: unknown}>('select cards from game_hands where game_id=$1 and player_id=$2',[id,a])).rows[0].cards
      fixtures.push({name:'truco',before,after:g,user:a,hand})
    }
    assert.equal(g.awaiting_deal, true)
    await proof(g,winner,25,'Envido 25 seguido de truco no querido')

    // Última mano reportada: real → falta → quiero; el ganador es pie.
    const final = await fresh(winner, mano, target,32)
    await db.query('update games set player1_score=case when player1_id=$2 then 3 else 0 end,player2_score=case when player2_id=$2 then 3 else 0 end where id=$1', [final,winner])
    await rpc('sing_envido', mano, final, 'real_envido')
    await rpc('sing_envido', other(mano), final, 'falta_envido')
    g = await declare(final,mano, winner===mano?'son_buenas':'tengo')
    assert.equal(g.status,'finished')
    assert.equal(g.winner_id,winner)
    await proof(g,winner,32,'Real/falta que termina la partida')
  }
  for (const closing of ['truco','mazo','cartas','mazo_declarando','campana']) {
    const id = await fresh(a,a,15,32)
    await rpc('sing_envido',a,id,'envido')
    let g: Game
    if (closing==='mazo_declarando') {
      await rpc('respond_envido',b,id,true)
      await rpc('envido_say',a,id,'tengo')
      await db.query('update games set player1_score=14 where id=$1',[id])
      g=await rpc('envido_say',b,id,'mazo')
    } else {
      g=await declare(id,a,'son_buenas')
      if (closing==='campana') await db.query('update games set campaign_rival_id=$2 where id=$1',[id,randomUUID()])
      await db.query('update games set player1_score=14 where id=$1',[id])
      if (closing==='truco') {
        await rpc('sing_truco',a,id,'truco')
        g=await rpc('respond_truco',b,id,false)
      } else if (closing==='mazo') {
        await db.query('update games set current_turn=$2 where id=$1',[id,b])
        g=await rpc('irse_al_mazo',b,id)
        // Este camino finaliza al pedir la próxima mano.
        await rpc('finish_game',b,id,a,g.player1_score,g.player2_score)
      } else if (closing==='cartas') {
        // Primera parda; el ganador del envido juega último y cierra la segunda.
        await db.query(`update game_hands set cards=(select jsonb_agg(c) from jsonb_array_elements(_truco_deck()) c where
          (c->>'suit'='copa' and (c->>'value')::int=11) or (c->>'suit'='espada' and (c->>'value')::int=4))
          where game_id=$1 and player_id=$2`,[id,b])
        for (const [player,suit] of [[a,'oro'],[b,'copa']]) {
          const card = (await db.query<{card: unknown}>("select c as card from game_hands,jsonb_array_elements(cards) c where game_id=$1 and player_id=$2 and c->>'suit'=$3",[id,player,suit])).rows[0].card
          await db.query("update games set played_cards=played_cards||jsonb_build_array(jsonb_build_object('player_id',$2::text,'round',1,'card',$3::jsonb)) where id=$1",[id,player,JSON.stringify(card)])
          await db.query('update game_hands set cards=(select jsonb_agg(c) from jsonb_array_elements(cards) c where c<>$3::jsonb) where game_id=$1 and player_id=$2',[id,player,JSON.stringify(card)])
        }
        await db.query("update games set round_number=2,round_results='[{\"round\":1,\"winner_id\":null}]',current_turn=$2 where id=$1",[id,b])
        for (const player of [b,a]) {
          const card = (await db.query<{card: unknown}>('select cards->0 as card from game_hands where game_id=$1 and player_id=$2',[id,player])).rows[0].card
          g=await rpc('play_card',player,id,JSON.stringify(card))
        }
      } else await rpc('finish_game',a,id,a,15,0)
    }
    g=(await db.query<{g: Game}>('select to_jsonb(g) as g from games g where id=$1',[id])).rows[0].g
    assert.equal(g.status,'finished',closing)
    await proof(g,a,32,closing)
  }
  for (const closing of ['sin_envido','rechazado','sin_declarar']) {
    const id=await fresh(a,a,15)
    if (closing!=='sin_envido') {
      await rpc('sing_envido',a,id,'envido')
      if (closing==='rechazado') await rpc('respond_envido',b,id,false)
      else {
        await rpc('respond_envido',b,id,true)
        await rpc('envido_say',a,id,'mazo')
      }
    }
    await rpc('finish_game',a,id,b,0,15)
    const g=(await db.query<{g:Game}>('select to_jsonb(g) as g from games g where id=$1',[id])).rows[0].g
    assert.equal(g.envido_reveal,null,closing+': no hay tanto declarado que probar')
    checks++
  }
  if (process.env.ENVIDO_REVEAL_FIXTURES) await writeFile(process.env.ENVIDO_REVEAL_FIXTURES,JSON.stringify(fixtures))
  console.log(`Envido: ${checks} cierres comprobados con SQL real; cartas, privacidad y resultado correctos.`)
} finally { await db.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
