import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { seedCatalog, readCatalog, statement } from './offline-catalog'
import { CAMPAIGN_VERSION, canonical, createCampaign, provinceUnlocked, rivalUnlocked, reward, startDuel, applyTurn,
  type Snapshot, type Progress } from '../src/lib/offline-campaign/model'
import { EMPTY_STYLE, BOTS_VERSION } from '../src/lib/offline-trial/bots'
import { step, botStep, legalActions } from '../src/lib/offline-trial/engine'
import { campaignView, campaignRanking } from '../src/offline-campaign/views'
import { downloadAvatar } from '../src/lib/offline-campaign/avatar'

async function main() {
  const db = new PGlite(), A = '00000000-0000-4000-a000-000000000001', B = '00000000-0000-4000-a000-000000000002'
  const definition = (sql: string, name: string) => Array.from(sql.matchAll(/create(?:\s+or\s+replace)?\s+function\s+(?:(?:public|auth)\.)?(\w+)\s*\([\s\S]*?\bas\s+(\$(?:\w+)?\$)[\s\S]*?\2\s*;/gi)).find(m => m[1] === name)![0]
  try {
    await seedCatalog(db)
    const catalog = await readCatalog(db), schema = await readFile('supabase/schema/tables.sql', 'utf8')
    await db.exec(`create schema auth; create role anon; create role authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select current_setting('test.jwt',true)::jsonb$$;
      create table profiles (id uuid primary key, username text, is_bot boolean default false, coins int default 1000, campaign_points int default 0);
      insert into profiles(id,username) values ('${A}','A'),('${B}','B');
      insert into profiles(id,username,is_bot) select bot_id,display_name,true from campaign_rivals;
      set check_function_bodies=off;
      select set_config('test.uid','${A}',false),set_config('test.jwt','{"is_anonymous":false}',false);`)
    for (const table of ['campaign_progress','campaign_style','games']) {
      await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + table + ' (')))
    }
    await db.exec('alter table campaign_progress add primary key(user_id,rival_id)')
    const migration = await readFile('supabase/migrations/20261011092658_offline_campaign_export.sql', 'utf8')
    assert.equal(definition(migration,'export_offline_campaign').replace(/\r/g,''),definition(await readFile('supabase/schema/functions.sql','utf8'),'export_offline_campaign').replace(/\r/g,''))
    await db.exec(migration)
    const snapshot = async () => (await db.query<{value:Snapshot}>('select public.export_offline_campaign() value')).rows[0].value
    const initial = await snapshot()
    assert.equal(initial.userId,A); assert.equal(initial.version,CAMPAIGN_VERSION); assert.equal(initial.engine_version,BOTS_VERSION)
    assert.equal(canonical(initial.catalog),canonical(catalog)); assert.deepEqual(initial.style,EMPTY_STYLE)
    assert.deepEqual(initial.progress,[])
    await db.exec(`update profiles set campaign_points=39500,coins=4321 where id='${B}';
      insert into campaign_progress(user_id,rival_id,wins,rematch_points) values ('${B}','${catalog.rivals[65].id}',4,555);
      insert into campaign_style(user_id,hands_played,envido_bluff) values ('${B}',50,7);`)
    await db.exec('set role authenticated')
    assert.deepEqual((await snapshot()).progress,[])
    await db.exec(`select set_config('test.uid','${B}',false)`)
    const second = await snapshot(); assert.equal(second.points,39500); assert.equal(second.coins,4321)
    assert.equal(second.style.hands_played,50); assert.equal(second.progress.length,1)
    assert.equal(second.progress[0].wins,4)
    assert.equal(Object.keys(second).some(k => /email|token|session|password|username/.test(k)),false)
    await db.exec('reset role; set role anon')
    await assert.rejects(snapshot(),/permission denied/)
    await db.exec(`reset role; set role authenticated; select set_config('test.jwt','{"is_anonymous":true}',false)`)
    await assert.rejects(snapshot(),/registrada/)
    await db.exec(`select set_config('test.jwt','{}',false)`); await assert.rejects(snapshot(),/registrada/)
    await db.exec(`select set_config('test.uid','${catalog.rivals[0].bot_id}',false),set_config('test.jwt','{"is_anonymous":false}',false)`)
    await assert.rejects(snapshot(),/disponible/)
    await db.exec(`select set_config('test.uid','00000000-0000-4000-a000-000000000003',false)`)
    await assert.rejects(snapshot(),/disponible/)
    await db.exec(`select set_config('test.uid','',false)`); await assert.rejects(snapshot(),/registrada/)
    await db.exec(`reset role; select set_config('test.uid','${A}',false)`)
    assert.deepEqual((await db.query<{proconfig:string[];prosecdef:boolean}>('select proconfig,prosecdef from pg_proc where proname=\'export_offline_campaign\'')).rows[0],{proconfig:['search_path=""'],prosecdef:true})
    await db.exec(definition(await readFile('supabase/migrations/20260817_campana_ruta_patagonica.sql','utf8'),'get_campaign_map'))
    let unlockChecks = 0
    const points = Array.from(new Set([0, ...catalog.rivals.flatMap(r=>[r.points_required-1,r.points_required,r.points_required+1]), ...catalog.provinces.flatMap(p=>[p.points_required-1,p.points_required,p.points_required+1])])).filter(n=>n>=0)
    const gates = [[],[catalog.rivals.find(r=>r.slug==='mudo')!.id],[catalog.rivals.find(r=>r.slug==='antartica')!.id],[catalog.rivals[65].id]]
    for (const count of points) for (const winners of gates) {
      await db.query('update profiles set campaign_points=$1 where id=$2::uuid',[count,A])
      await db.exec(`delete from campaign_progress where user_id='${A}'`)
      for (const id of winners) await db.query('insert into campaign_progress(user_id,rival_id) values($1::uuid,$2::uuid)',[A,id])
      const local = createCampaign(await snapshot(),'fixture')
      const sql = (await db.query<{value:{provinces:{id:string;unlocked:boolean;rivals:{id:string;unlocked:boolean}[]}[]}}>('select get_campaign_map() value')).rows[0].value
      for (const p of sql.provinces) {
        assert.equal(provinceUnlocked(local,catalog.provinces.find(v=>v.id===p.id)!),p.unlocked,'Provincia: '+p.id); unlockChecks++
        for (const r of p.rivals) { assert.equal(rivalUnlocked(local,catalog.rivals.find(v=>v.id===r.id)!),r.unlocked,'Rival: '+r.id); unlockChecks++ }
      }
    }
    const rewardSQL = await readFile('supabase/migrations/20260705_campana_provincias_1_backend.sql','utf8')
    await db.exec(definition(await readFile('supabase/schema/functions.sql','utf8'),'get_campaign_ranking'))
    for (const counts of [[0,0,0,0,0,0,0],[8,5,3,2,7,1,2],[100,80,50,40,60,33,30]]) {
      await db.exec(`delete from campaign_style where user_id='${A}'`)
      await db.query(`insert into campaign_style(user_id,hands_played,envido_sung,envido_bluff,envido_folded,truco_sung,truco_bluff,truco_folded)
        values($1::uuid,$2,$3,$4,$5,$6,$7,$8)`,[A,...counts])
      const local = createCampaign(await snapshot(),'fixture'), view = campaignView(local)
      local.presentation = { username: 'A', avatar_url: null, active_salon: 'clasico', active_frame: null, active_medal: null, active_accessory: null }
      const map = (await db.query<{value:ReturnType<typeof campaignView>}>('select get_campaign_map() value')).rows[0].value
      assert.deepEqual(view.style,map.style); assert.equal(view.fama,map.fama)
      assert.deepEqual(view.provinces.map(p=>({id:p.id,rivals:p.rivals.map(r=>r.id)})),map.provinces.map(p=>({id:p.id,rivals:p.rivals.map(r=>r.id)})))
      assert.deepEqual(campaignRanking(local),(await db.query<{value:ReturnType<typeof campaignRanking>}>('select get_campaign_ranking() value')).rows[0].value)
    }
    let avatarFetches = 0
    const photo = async () => { avatarFetches++; return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/webp'}}) }
    const photoFetcher = photo as typeof fetch
    const storage = 'https://fixture.supabase.co'
    assert.equal(await downloadAvatar(null,A,storage,photoFetcher),null)
    assert.equal(await downloadAvatar(storage+'/storage/v1/object/public/avatars/'+A+'/1.jpg',A,storage,photoFetcher),'data:image/webp;base64,AQID')
    assert.equal(await downloadAvatar('https://lh3.googleusercontent.com/photo',A,storage,photoFetcher),'data:image/webp;base64,AQID')
    for (const url of ['http://localhost/private','https://example.com/photo','https://lh3.googleusercontent.com.example.com/photo',storage+'/storage/v1/object/public/avatars/'+B+'/1.jpg','https://user@lh3.googleusercontent.com/photo']) await assert.rejects(downloadAvatar(url,A,storage,photoFetcher),/compatible/)
    assert.equal(avatarFetches,2)
    await assert.rejects(downloadAvatar('https://lh3.googleusercontent.com/photo',A,storage,async()=>new Response('HTML',{headers:{'Content-Type':'text/html'}})),/disponible/)
    await assert.rejects(downloadAvatar('https://lh3.googleusercontent.com/photo',A,storage,async()=>new Response(new Uint8Array(2*1024*1024+1),{headers:{'Content-Type':'image/webp'}})),/grande/)
    console.log('Fama, estilo, orden y ranking idénticos al SQL; fotos privadas y orígenes verificados.')
    await db.exec(definition(rewardSQL,'finish_game'))
    let rewardChecks = 0
    const gameId = '00000000-0000-4000-a000-000000000099'
    for (const rival of catalog.rivals) {
      const cases = [undefined,0,Math.floor(rival.points_reward*.3)-1,Math.floor(rival.points_reward*.3),99999]
      for (const acc of cases) for (const margin of [0,1,Math.floor(rival.target_score/2),rival.target_score,rival.target_score+3]) {
        await db.exec(`delete from campaign_progress where user_id='${A}'; delete from games;
          update profiles set campaign_points=0,coins=1000 where id='${A}';`)
        let progress: Progress | undefined
        if (acc !== undefined) {
          progress = {rival_id:rival.id,beaten_at:initial.exported_at,wins:1,rematch_points:acc}
          await db.query('insert into campaign_progress(user_id,rival_id,rematch_points) values($1::uuid,$2::uuid,$3)',[A,rival.id,acc])
        }
        await db.query(`insert into games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score,campaign_rival_id)
          values($1::uuid,$2::uuid,$3::uuid,'A','Bot',$2::uuid,$2::uuid,0,$4,$5::uuid)`,[gameId,A,rival.bot_id,rival.target_score,rival.id])
        await db.query('select finish_game($1::uuid,$2::uuid,$3,$4)',[gameId,A,rival.target_score+3,rival.target_score+3-margin])
        const sql = (await db.query<{points:number;coins:number}>(`select campaign_points points,coins-1000 coins from profiles where id='${A}'`)).rows[0]
        assert.deepEqual(reward(rival,progress,[rival.target_score+3,rival.target_score+3-margin],true),sql,rival.slug); rewardChecks++
        await db.query('select finish_game($1::uuid,$2::uuid,$3,$4)',[gameId,A,100,0])
        assert.deepEqual((await db.query(`select campaign_points points,coins-1000 coins from profiles where id='${A}'`)).rows[0],sql)
        assert.deepEqual(reward(rival,progress,[0,rival.target_score],false),{points:0,coins:0})
      }
    }
    let local = createCampaign(initial,'fixture'), completed = 0
    for (let seed=1; seed<=6; seed++) {
      local = startDuel(local,catalog.rivals[0].id,seed,'duelo-'+seed)
      if (seed>1) assert.equal(local.dependencies.length,seed-1)
      for (let n=0;n<1500&&local.trial!.game.status==='playing';n++) {
        const t=local.trial!,g=t.game
        const bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
        const actions=legalActions(t,A)
        const a=actions.find(a=>a.type==='advance_hand') ?? actions.find(a=>a.type.startsWith('respond_')&&a.accept)
          ?? actions.find(a=>a.type==='envido_say'&&a.value==='tengo') ?? actions.filter(a=>a.type==='play_card').sort((a,b)=>a.card!.rank-b.card!.rank)[0]
        const next=g.awaiting_deal?step(t,{player:A,type:'advance_hand'}):bot?botStep(t):step(t,a)
        local=applyTurn(local,next,new Date().toISOString())
      }
      assert.equal(local.trial!.game.status,'finished'); assert.equal(local.pending.length,seed); completed++
      assert.equal(local.official.coins,1000); assert.deepEqual(JSON.parse(JSON.stringify(local)),local)
      await assert.rejects(async()=>applyTurn(local,local.trial!,new Date().toISOString()),/cambió/)
    }
    assert.throws(()=>startDuel(createCampaign(initial,'fixture'),catalog.rivals[65].id,1,'bloqueado'),/bloqueado/)
    const policies = await readFile('supabase/schema/policies.sql','utf8')
    await db.exec(statement(policies,policies.indexOf('alter table public.campaign_provinces add constraint campaign_provinces_required_rival_id_fkey')))
    await assert.rejects(db.query('update campaign_provinces set required_rival_id=$1::uuid where id=$2::uuid',[A,catalog.provinces[0].id]),/foreign key/)
    await db.exec(definition(await readFile('supabase/schema/00_supabase_local.sql','utf8'),'jwt'))
    await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":false}',false)`)
    assert.equal((await snapshot()).userId,A)
    await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":true}',false)`)
    await assert.rejects(snapshot(),/registrada/)
    await db.exec(`select set_config('request.jwt.claims','',false)`)
    await assert.rejects(snapshot(),/registrada/)
    console.log(`Historia: exportación y permisos aprobados; ${unlockChecks} desbloqueos y ${rewardChecks} premios iguales al SQL; ${completed} partidas con cola, estilo y dependencias.`)
  } finally { await db.close() }
}
void main().catch(error=>{console.error(error);process.exitCode=1})
