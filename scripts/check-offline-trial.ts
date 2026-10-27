// PostgreSQL real en memoria, aislado. Carga reglas del historial sin tocar producción.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { createTrial, createBotTrial, botDecision, legalActions, step, botStep, random, BOT, type Trial, type Action } from '../src/lib/offline-trial/engine'
import { EMPTY_STYLE, BOTS_VERSION, STRATEGIES, northwestChoice, type BotConfig, type CampaignStyle, type BotSetup } from '../src/lib/offline-trial/bots'
import { createDeck, getEnvidoPoints, type Card } from '../src/lib/truco'

async function main() {
const HUMAN = '00000000-0000-4000-a000-000000000001'
const ID = '00000000-0000-4000-a000-000000000002'
const sources = ['supabase/schema/functions.sql', ...readdirSync('supabase/migrations').sort().map(f => 'supabase/migrations/' + f)]
const definitions = new Map<string, string>()
const pattern = /create(?:\s+or\s+replace)?\s+function\s+(?:public\.)?(\w+)\s*\([\s\S]*?\bas\s+(\$(?:\w+)?\$)[\s\S]*?\2\s*;/gi
for (const file of sources) {
  for (const match of Array.from(readFileSync(file, 'utf8').matchAll(pattern))) definitions.set(match[1].toLowerCase(), match[0])
}
const botSource = readFileSync('supabase/migrations/20260815_bots_lobby.sql', 'utf8')
const botSQL = Array.from(botSource.matchAll(pattern)).find(m => m[1] === 'bot_step')![0]
// La entrada vigente conserva esta rama y delega Noroeste a sus ayudantes actuales.
assert.match(definitions.get('bot_step')!, /_bot_step_pre_noroeste/)
assert.match(readFileSync('supabase/migrations/20260705_campana_provincias_2_rasgos.sql','utf8'), /'novato',\s+1,\s+2/)
const db = new PGlite()
let transitions = 0, botChecks = 0, completed = 0, tactics = 0
const coverage = new Map<string, Set<string>>()
try {
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;
    create table games (
      id uuid primary key, player1_id uuid, player2_id uuid, status text,
      player1_score int, player2_score int, target_score int, winner_id uuid,
      mano_player uuid, current_turn uuid, hand_number int, round_number int,
      played_cards jsonb, round_results jsonb, envido_state jsonb, truco_state jsonb,
      awaiting_deal boolean, envido_reveal jsonb, updated_at timestamptz, campaign_rival_id uuid
    );
    create table game_hands (game_id uuid, player_id uuid, cards jsonb);
    create table profiles (id uuid, is_bot boolean, campaign_points int default 0);
    ${readFileSync('supabase/schema/tables.sql','utf8').match(/create table if not exists public\.campaign_rivals \([\s\S]*?\);/)![0]}
    alter table campaign_rivals add primary key (id);
    alter table campaign_rivals add column if not exists strategy_profile text;
    create table campaign_style (user_id uuid primary key, hands_played int default 0, envido_bluff int default 0, truco_bluff int default 0,
      envido_sung int default 0, truco_sung int default 0, envido_folded int default 0, truco_folded int default 0, updated_at timestamptz);
    create table lobby_bots (bot_id uuid, difficulty int, trait_liar int, trait_aggressive int);
    create table bot_decisions (game_id uuid,rival_id uuid,situation text,action text,detail text,
      numbers jsonb,ok boolean,error text,created_at timestamptz default now());
    insert into profiles(id,is_bot) values ('${HUMAN}',false),('${BOT}',true);
    create function finish_game(p_game_id uuid,p_winner_id uuid,p_p1_score int,p_p2_score int)
      returns void language sql as $$update games set status='finished',winner_id=p_winner_id,
      player1_score=p_p1_score,player2_score=p_p2_score where id=p_game_id$$;
    create function _deal_hands(out h1 jsonb,out h2 jsonb) returns record language sql as $$
      select current_setting('test.h1')::jsonb,current_setting('test.h2')::jsonb$$;
    create function test_random() returns double precision language plpgsql as $$
      declare i int := current_setting('test.draw_index')::int; v double precision;
      begin
        v := (current_setting('test.draws')::jsonb->>i)::double precision;
        perform set_config('test.draw_index',(i+1)::text,false);
        if v is null then raise exception 'azar agotado'; end if;
        return v;
      end $$;
    set check_function_bodies=off;
  `)
  for (const name of ['_bot_hand_power','_truco_deck','_envido_points','_envido_quiero_value','_envido_reject_value',
    '_envido_winning_cards','_envido_reveal_for','_round_leader','_who_plays_next','_turn_after_envido',
    'play_card','sing_envido','respond_envido','envido_say','sing_truco','respond_truco','irse_al_mazo','advance_hand']) {
    assert.ok(definitions.has(name), 'Falta SQL vigente: ' + name)
    await db.exec(definitions.get(name)!)
  }
  await db.exec(botSQL.replace(/function public\.bot_step\(/i, 'function public._bot_step_pre_noroeste(').replace(/\brandom\(\)/g, 'test_random()'))
  for (const name of ['_record_style','_northwest_win_probability','_northwest_card_choice','_northwest_plan','_northwest_bot_step','bot_step']) {
    await db.exec(definitions.get(name)!.replace(/\brandom\(\)/g,'test_random()'))
  }
  // Sembrar las fichas reales desde SQL, sin inventar un catálogo de pruebas.
  for (const file of ['20260629_modo_historia.sql','20260705_campana_provincias_2_rasgos.sql',
    '20260705_campana_provincias_3_rivales.sql','20260817_campana_ruta_patagonica.sql','20260923120000_campana_ruta_noroeste.sql']) {
    const source=readFileSync('supabase/migrations/'+file,'utf8')
    if (file.includes('ruta_noroeste')) {
      await db.exec(source.match(/create temporary table northwest_roster[\s\S]*?;/i)![0].replace(' on commit drop',''))
      await db.exec(source.match(/insert into northwest_roster(?:'(?:''|[^'])*'|[^';])*;/i)![0])
    }
    for (const m of Array.from(source.matchAll(/(?:insert into public\.campaign_rivals|update public\.campaign_rivals cr)(?:'(?:''|[^'])*'|[^';])*;/gi))) await db.exec(m[0])
  }
  const rivals=(await db.query<BotConfig & {slug:string;display_name:string}>('select * from campaign_rivals order by order_index')).rows
  assert.equal(rivals.length,66)
  assert.equal(rivals.filter(r=>r.strategy_profile).length,20)
  assert.deepEqual(new Set(rivals.filter(r=>r.strategy_profile).map(r=>r.strategy_profile)),new Set(STRATEGIES))
  assert.match(definitions.get('_northwest_plan')!,/No regalar el punto del partido/)
  const setup = (rival: BotConfig, campaign_points=0, style: CampaignStyle=EMPTY_STYLE): BotSetup =>
    ({rival,campaign_points,style:structuredClone(style)})
  // Casos de noroeste_tactica.sql: cartas ya tiradas, parda que cierra,
  // 33 siendo mano/pie, y no regalar el último punto al rechazar.
  const deck=createDeck(), card=(suit:string,value:number)=>deck.find(c=>c.suit===suit&&c.value===value)!
  const ace=card('espada',1), four=card('oro',4), twoB=card('basto',2), twoO=card('oro',2)
  const threeO=card('oro',3), sixE=card('espada',6), sevenE=card('espada',7)
  for (const rival of rivals.filter(r=>r.strategy_profile)) {
    const bot=rival.bot_id
    const fresh=()=>{const t=createBotTrial(HUMAN,setup(rival),77,ID);t.game.current_turn=bot;t.game.mano_player=HUMAN;return t}
    const checkPlan=async(t:Trial, expected:Partial<Action>)=>{
      const copy=structuredClone(t), local=botDecision(copy)
      assert.ok(local);assert.deepEqual(Object.fromEntries(Object.keys(expected).map(k=>[k,local[k as keyof Action]])),expected)
      const full=[...t.hands[1],...t.game.played_cards.filter(c=>c.player_id===bot).map(c=>c.card)],g=t.game
      const draws=structuredClone(t),seed=random(draws)
      const params:unknown[]=[t.hands[1],full,g.played_cards,g.round_results,g.envido_state,g.truco_state].map(x=>JSON.stringify(x))
      params.push(bot,g.mano_player,g.round_number,true,g.player2_score,g.player1_score,rival.strategy_profile,
        rival.trait_liar,rival.trait_aggressive,'{}',seed)
      const sql=(await db.query<{plan:{action:string;type?:string;card?:Card}}>(
        'select _northwest_plan($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::uuid,$8::uuid,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::numeric) plan',
        params
      )).rows[0].plan
      const type=sql.action==='play'?'play_card':sql.action.startsWith('respond_')?sql.action.replace(/_(yes|no)$/,''):sql.action
      const action:Action={player:bot,type}
      if(sql.type)action.value=sql.type
      if(sql.card)action.card=sql.card
      if(sql.action.startsWith('respond_'))action.accept=sql.action.endsWith('_yes')
      assert.deepEqual(local,action,'Táctica diferente al SQL vigente');tactics++
    }
    let t=fresh();t.hands[1]=[ace,four];t.game.round_number=2
    t.game.played_cards=[{player_id:bot,card:twoB,round:1},{player_id:HUMAN,card:twoO,round:1}]
    t.game.round_results=[{round:1,winner_id:null}];t.game.truco_state={status:'truco',value:2,last_singer:HUMAN}
    await checkPlan(t,{type:'sing_truco',value:'retruco'})
    t=fresh();t.hands[1]=[];t.game.round_number=3
    t.game.round_results=[{round:1,winner_id:HUMAN},{round:2,winner_id:bot}]
    t.game.played_cards=[{player_id:bot,card:four,round:1},{player_id:HUMAN,card:twoB,round:1},
      {player_id:bot,card:threeO,round:2},{player_id:HUMAN,card:twoO,round:2},{player_id:bot,card:ace,round:3}]
    t.game.truco_state={status:'retruco',value:3,last_singer:HUMAN}
    await checkPlan(t,{type:'sing_truco',value:'vale_cuatro'})
    t.game.played_cards=[{player_id:bot,card:four,round:3},{player_id:HUMAN,card:ace,round:3}]
    await checkPlan(t,{type:'respond_truco',accept:false})
    t=fresh();t.hands[1]=[ace,twoB];t.game.round_number=2
    t.game.played_cards=[{player_id:bot,card:threeO,round:1},{player_id:HUMAN,card:twoO,round:2}]
    t.game.round_results=[{round:1,winner_id:bot}]
    const full=[threeO,ace,twoB],localChoice=northwestChoice({game:t.game,remaining:t.hands[1],full})
    const sqlChoice=(await db.query<{choice:{card:Card;hand_chance:number}}>(
      'select _northwest_card_choice($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::uuid,$6::uuid,$7,$8) choice',
      [JSON.stringify(t.hands[1]),JSON.stringify(full),JSON.stringify(t.game.played_cards),JSON.stringify(t.game.round_results),bot,HUMAN,2,rival.strategy_profile]
    )).rows[0].choice
    assert.deepEqual(localChoice,{card:twoB,chance:1});assert.deepEqual(sqlChoice.card,localChoice.card);assert.equal(Number(sqlChoice.hand_chance),1);tactics++
    t=fresh();t.hands[1]=[ace,twoB,four];t.game.player1_score=29;t.game.player2_score=20
    t.game.envido_state={status:'envido',value:2,chain:['envido'],last_singer:HUMAN}
    await checkPlan(t,{type:'respond_envido',accept:true})
    t=fresh();t.hands[1]=[sixE,sevenE,four];t.game.mano_player=bot
    await checkPlan(t,{type:'sing_envido',value:'falta_envido'})
    t.game.mano_player=HUMAN
    await checkPlan(t,{type:'sing_envido',value:'envido'})
    t.game.player2_score=28
    await checkPlan(t,{type:'sing_envido',value:'real_envido'})
  }
  console.log('Tácticas del Noroeste: '+tactics+' comprobaciones aprobadas.')
  const sqlDeck = (await db.query<{cards: Card[]}>('select _truco_deck() cards')).rows[0].cards
  assert.deepEqual(sqlDeck, createDeck())
  for (let seed=1; seed<=150; seed++) {
    const t = createTrial(HUMAN,15,seed,ID)
    const actual = (await db.query<{points:number}>('select _envido_points($1::jsonb) points',[JSON.stringify(t.hands[0])])).rows[0].points
    assert.equal(actual, getEnvidoPoints(t.hands[0]))
  }
  const fixture = async (t: Trial, player: string) => {
    await db.exec('delete from games; delete from game_hands; delete from bot_decisions; delete from campaign_style; delete from profiles where is_bot;')
    await db.query('insert into profiles (id,is_bot) values ($1,true)',[t.game.player2_id])
    await db.query('update profiles set campaign_points=$1 where id=$2',[t.bot?.campaign_points??0,HUMAN])
    await db.query('insert into campaign_style select (jsonb_populate_record(null::campaign_style,$1::jsonb)).*',
      [JSON.stringify({user_id:HUMAN,...(t.bot?.style??EMPTY_STYLE)})])
    await db.query('insert into games select (jsonb_populate_record(null::games,$1::jsonb)).*',
      [JSON.stringify({...t.game, campaign_rival_id:t.rival})])
    for (const [i,p] of Array.from([HUMAN,t.game.player2_id].entries())) await db.query('insert into game_hands values ($1,$2,$3::jsonb)',[ID,p,JSON.stringify(t.hands[i])])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[player])
  }
  const comparable = (g: Trial['game']) => {
    const { envido_reveal, played_cards, round_results, ...rest } = g
    // SQL cierra directamente al alcanzar el objetivo; no persiste la última
    // carta en games. El ensayo la muestra, pero conserva el mismo resultado.
    return g.status === 'finished' ? rest : {...rest,played_cards,round_results}
  }
  const compare = async (t: Trial, a?: Action, bot = false) => {
    let next: Trial
    if (bot) next = botStep(t)
    else next = step(t,a!)
    await fixture(t,bot ? HUMAN : a!.player)
    let sql: Trial['game']
    if (bot) {
      const draws = [], copy = structuredClone(t)
      for (let i=0;i<20;i++) draws.push(random(copy))
      await db.query("select set_config('test.draws',$1,false),set_config('test.draw_index','0',false)",[JSON.stringify(draws)])
      sql = (await db.query<{g:Trial['game']}>('select to_jsonb(bot_step($1)) g',[ID])).rows[0].g
      const decision = (await db.query<{action:string;detail:string;numbers:{card:Card};ok:boolean;error:string}>('select * from bot_decisions')).rows[0]
      assert.ok(decision?.ok, 'SQL bot falló: '+decision?.error)
      const expected = next.actions.at(-1)!.action
      const type = decision.action === 'play' ? 'play_card' : decision.action === 'mazo' ? 'irse_al_mazo'
        : decision.action.startsWith('respond_') ? decision.action.replace(/_(yes|no)$/,'') : decision.action
      assert.equal(type,expected.type)
      if (type === 'play_card') assert.deepEqual(decision.numbers.card,expected.card)
      else if (type.startsWith('respond_')) assert.equal(decision.action.endsWith('_yes'),expected.accept)
      else assert.equal(decision.detail,expected.value ?? null)
      assert.equal(Number((await db.query<{i:string}>("select current_setting('test.draw_index') i")).rows[0].i),
        (()=>{let n=0,c=structuredClone(t);while(c.rng!==next.rng && n<20){random(c);n++}return n})())
      botChecks++
      const covered=coverage.get(t.rival)??new Set<string>()
      covered.add(type+(expected.value?':'+expected.value:expected.accept!=null?':'+expected.accept:''))
      coverage.set(t.rival,covered)
    } else {
      const args: unknown[] = [ID]
      if (a!.type === 'advance_hand') {
        await db.query("select set_config('test.h1',$1,false),set_config('test.h2',$2,false)",next.hands.map(h=>JSON.stringify(h)))
      } else if (a!.type === 'play_card') args.push(JSON.stringify(a!.card))
      else if (a!.type.startsWith('sing_') || a!.type === 'envido_say') args.push(a!.value)
      else if (a!.type.startsWith('respond_')) args.push(a!.accept)
      sql = (await db.query<{g:Trial['game']}>('select to_jsonb('+a!.type+'('+args.map((_,i)=>'$'+(i+1)+(a!.type==='play_card'&&i===1?'::jsonb':'')).join(',')+')) g',args)).rows[0].g
    }
    const projected = Object.fromEntries(Object.keys(next.game).map(k=>[k,(sql as unknown as Record<string,unknown>)[k]])) as Trial['game']
    assert.deepEqual(comparable(next.game),comparable(projected),'Estado diferente: '+JSON.stringify(a??next.actions.at(-1)?.action))
    const hands = (await db.query<{player_id:string;cards:Card[]}>('select player_id,cards from game_hands')).rows
    assert.deepEqual(next.hands,[hands.find(h=>h.player_id===HUMAN)!.cards,hands.find(h=>h.player_id===t.game.player2_id)!.cards])
    if (next.game.envido_reveal && sql.envido_reveal) {
      assert.equal(next.game.envido_reveal.player_id,sql.envido_reveal.player_id)
      const played = next.game.played_cards.filter(c=>c.player_id===sql.envido_reveal!.player_id).map(c=>c.card)
      assert.equal(getEnvidoPoints([...next.game.envido_reveal.cards,...played]),getEnvidoPoints([...sql.envido_reveal.cards,...played]))
    }
    // Dos combinaciones pueden probar el mismo tanto. SQL no fija el orden
    // entre palos empatados; comparar validez, incluso si ya están en la mesa.
    const winner = next.game.envido_state.winner_id
    const exposed = winner === HUMAN ? next.game.envido_state.player1_points : next.game.envido_state.player2_points
    if (winner && exposed != null && next.game.awaiting_deal && next.game.status !== 'finished' && (next.game.envido_reveal || sql.envido_reveal)) {
      const played = next.game.played_cards.filter(c=>c.player_id===winner).map(c=>c.card)
      const full = [...next.hands[winner===HUMAN?0:1],...played]
      for (const reveal of [next.game.envido_reveal,sql.envido_reveal]) {
        assert.equal(getEnvidoPoints([...played,...(reveal?.cards??[])]),getEnvidoPoints(full))
      }
    }
    if (next.bot) {
      const sqlStyle=(await db.query<CampaignStyle>('select '+Object.keys(EMPTY_STYLE).join(',')+' from campaign_style where user_id=$1',[HUMAN])).rows[0]
      assert.deepEqual(next.bot.style,sqlStyle,'Lectura de estilo diferente')
    }
    transitions++; return next
  }
  const paths = [[1,1],[1,0],[0,1],[-1,-1],[-1,0],[0,-1],[1,-1,1],[1,-1,-1],[1,-1,0],
    [-1,1,1],[-1,1,-1],[-1,1,0],[0,0,1],[0,0,-1],[0,0,0]]
  for (const target of [15,30] as const) for (const mano of [HUMAN,BOT]) for (const value of [1,2,4]) {
    for (const path of paths) for (const close of [false,true]) {
      let t = createTrial(HUMAN,target,123,ID), pool = createDeck()
      t.game.mano_player = mano; t.game.current_turn = mano
      t.game.player1_score = close ? target-1 : 0; t.game.player2_score = close ? target-1 : 0
      if(value>1) t.game.truco_state = {status:'accepted',value,last_singer:HUMAN}
      const pick = (rank:number) => {const i=pool.findIndex(c=>c.rank===rank);assert.ok(i>=0);return pool.splice(i,1)[0]}
      t.hands=[[],[]]
      for(let r=0;r<3;r++) {
        const result=path[r]??1, tieRank=8+r
        t.hands[0].push(pick(result===0?tieRank:result===1?5:12))
        t.hands[1].push(pick(result===0?tieRank:result===1?12:5))
      }
      const original=structuredClone(t.hands)
      for(let r=0;r<path.length;r++) {
        for(let play=0;play<2;play++){
          const player=t.game.current_turn, i=player===HUMAN?0:1
          t=await compare(t,{player,type:'play_card',card:original[i][r]})
        }
      }
      assert.ok(t.game.awaiting_deal||t.game.status==='finished')
    }
  }
  // Cadenas completas, aceptadas/rechazadas, empate por mano y mazo declarando.
  const chains = [['envido'],['real_envido'],['falta_envido'],['envido','envido'],
    ['envido','real_envido'],['envido','envido','real_envido','falta_envido'],['real_envido','falta_envido']]
  for(const target of [15,30] as const) for(const mano of [HUMAN,BOT]) for(const chain of chains) {
    for(const ending of ['no','tengo','son_buenas','mazo-first','mazo-pie']) {
      let t=createTrial(HUMAN,target,9,ID)
      t.game.mano_player=mano;t.game.current_turn=mano;t.game.player1_score=4;t.game.player2_score=7
      for(const value of chain)t=await compare(t,{player:t.game.current_turn,type:'sing_envido',value})
      t=await compare(t,{player:t.game.current_turn,type:'respond_envido',accept:ending!=='no'})
      if(ending!=='no'){
        t=await compare(t,{player:mano,type:'envido_say',value:ending==='mazo-first'?'mazo':'tengo'})
        if(ending!=='mazo-first')t=await compare(t,{player:mano===HUMAN?BOT:HUMAN,type:'envido_say',
          value:ending==='mazo-pie'?'mazo':ending==='son_buenas'?'son_buenas':'tengo'})
      }
    }
  }
  // Igualdad de tantos: el empate siempre favorece a la mano.
  for (const mano of [HUMAN,BOT]) {
    let t=createTrial(HUMAN,15,99,ID);t.game.mano_player=mano;t.game.current_turn=mano
    const deck=createDeck(),card=(suit:string,value:number)=>deck.find(c=>c.suit===suit&&c.value===value)!
    t.hands=[[card('espada',7),card('espada',6),card('oro',1)],[card('basto',7),card('basto',6),card('copa',1)]]
    t=await compare(t,{player:mano,type:'sing_envido',value:'envido'})
    t=await compare(t,{player:t.game.current_turn,type:'respond_envido',accept:true})
    t=await compare(t,{player:mano,type:'envido_say',value:'tengo'})
    t=await compare(t,{player:mano===HUMAN?BOT:HUMAN,type:'envido_say',value:'tengo'})
    assert.equal(t.game.envido_state.winner_id,mano)
  }
  // El truco espera al envido, también durante la declaración.
  let waiting=createTrial(HUMAN,15,123,ID);waiting.game.current_turn=HUMAN;waiting.game.mano_player=HUMAN
  waiting=await compare(waiting,{player:HUMAN,type:'sing_truco',value:'truco'})
  waiting=await compare(waiting,{player:BOT,type:'sing_envido',value:'envido'})
  for(const declaring of [false,true]){
    if(declaring)waiting=await compare(waiting,{player:HUMAN,type:'respond_envido',accept:true})
    for(const action of [{player:BOT,type:'respond_truco',accept:true},{player:BOT,type:'sing_truco',value:'retruco'}]){
      assert.throws(()=>step(waiting,action))
      await fixture(waiting,BOT)
      await assert.rejects(db.query('select '+action.type+'($1,$2)',[ID,action.type==='sing_truco'?'retruco':true]))
    }
  }
  // Subidas aceptadas y rechazadas, mazo, turno retomado después de cantos.
  for(const target of [15,30] as const) for(const reject of [0,2,3,4]){
    let t=createTrial(HUMAN,target,77,ID);t.game.current_turn=HUMAN;t.game.mano_player=HUMAN
    for(const [i,value]of Array.from(['truco','retruco','vale_cuatro'].entries())){
      t=await compare(t,{player:i%2===0?HUMAN:BOT,type:'sing_truco',value})
      if(reject===i+2){t=await compare(t,{player:t.game.current_turn,type:'respond_truco',accept:false});break}
    }
    if(!t.game.awaiting_deal){
      t=await compare(t,{player:t.game.current_turn,type:'respond_truco',accept:true})
      t=await compare(t,{player:t.game.current_turn,type:'irse_al_mazo'})
    }
    await compare(t,{player:HUMAN,type:'advance_hand'})
  }
  // Partidas completas y bot contrastado con el mismo flujo de azar.
  for(let seed=1;seed<=24;seed++){
    let t=createTrial(HUMAN,seed%2?15:30,seed,ID), count=0
    while(t.game.status==='playing'){
      assert.ok(count++<600,'Partida sin salida')
      if(t.game.awaiting_deal)t=await compare(t,{player:HUMAN,type:'advance_hand'})
      else if(t.game.envido_state.status==='declaring'?t.game.envido_state.declare_turn===BOT:t.game.current_turn===BOT)t=await compare(t,undefined,true)
      else{
        const options=legalActions(t,HUMAN), a=options[(seed+count*7)%options.length]
        assert.ok(a,'Humano sin opciones')
        t=await compare(t,a)
      }
      assert.deepEqual(JSON.parse(JSON.stringify(t)),t,'La partida no es serializable')
    }
    assert.ok(t.result); completed++
    let replay = createTrial(HUMAN,t.game.target_score,t.seed,ID)
    for (const entry of t.actions) replay = entry.action.player === BOT ? botStep(replay) : step(replay,entry.action)
    assert.deepEqual(replay,t,'El registro no reproduce la partida completa')
  }
  // Todos los rivales, con lectura vacía y estilos públicos distintos.
  const styles: [number,CampaignStyle][] = [[0,EMPTY_STYLE],[2000,{
    hands_played:24,envido_sung:12,envido_bluff:10,envido_folded:2,truco_sung:18,truco_bluff:16,truco_folded:1,
  }],[45000,{
    hands_played:40,envido_sung:2,envido_bluff:0,envido_folded:20,truco_sung:2,truco_bluff:0,truco_folded:18,
  }]]
  for (const rival of rivals) for (const [scenario,[points,style]] of Array.from(styles.entries())) {
    const initial=setup(rival,points,style), seed=101+rivals.indexOf(rival)*7+scenario
    let t=createBotTrial(HUMAN,initial,seed,ID), count=0, bot=rival.bot_id
    assert.equal(t.version,BOTS_VERSION)
    assert.deepEqual(initial,setup(rival,points,style),'Crear el duelo mutó la entrada')
    while(t.game.status==='playing') {
      assert.ok(count++<800,rival.id+' quedó sin salida')
      if(t.game.awaiting_deal)t=await compare(t,{player:HUMAN,type:'advance_hand'})
      else if(t.game.envido_state.status==='declaring'?t.game.envido_state.declare_turn===bot:t.game.current_turn===bot) {
        const changed=structuredClone(t)
        // Cambiar TODAS las cartas ocultas no puede cambiar decisión ni azar.
        changed.hands[0]=createDeck().filter(c=>!t.hands[1].some(k=>k.suit===c.suit&&k.value===c.value)).slice(0,t.hands[0].length)
        const original=structuredClone(t)
        assert.deepEqual(botDecision(changed),botDecision(original),'El bot miró cartas ocultas')
        assert.equal(changed.rng,original.rng)
        t=await compare(t,undefined,true)
      } else {
        const options=legalActions(t,HUMAN)
        const a=scenario===0?options[(seed+count*7)%options.length]
          : options.find(a=>a.type.startsWith('respond_')&&a.accept)
          ?? options.find(a=>a.type==='envido_say'&&a.value==='tengo')
          ?? options.find(a=>a.type==='play_card') ?? options[0]
        assert.ok(a,'Humano sin opciones');t=await compare(t,a)
      }
      // Cierre/reapertura se simula antes de cada decisión con el guardado serializado.
      t=JSON.parse(JSON.stringify(t))
    }
    assert.ok(t.result);completed++
    const savedSetup=setup(t.bot!.rival,t.bot!.campaign_points,t.bot!.initial_style)
    let replay=createBotTrial(t.owner,savedSetup,t.seed,t.id)
    for(const entry of t.actions) replay=entry.action.player===bot?botStep(replay):step(replay,entry.action)
    assert.deepEqual(replay,t,rival.id+' no se recupera desde su registro')
    if(scenario===2&&(rivals.indexOf(rival)+1)%11===0)console.log('Rivales comprobados: '+(rivals.indexOf(rival)+1)+'/66')
  }
  assert.deepEqual(new Set(coverage.keys()),new Set(rivals.map(r=>r.id)))
  console.log('OK: '+transitions+' transiciones contra SQL vigente; '+botChecks+' decisiones; '+completed+' partidas completas; '+coverage.size+' rivales.')
  for(const strategy of [null,...STRATEGIES]) {
    const ids=rivals.filter(r=>r.strategy_profile===strategy).map(r=>r.id)
    console.log(strategy??'clásicos',Array.from(new Set(ids.flatMap(id=>Array.from(coverage.get(id)??[])))).sort().join(', '))
  }
} finally { await db.close() }

}
void main().catch(error => { console.error(error); process.exitCode = 1 })
