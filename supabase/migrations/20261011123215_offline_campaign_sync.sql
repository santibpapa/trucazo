-- Historia offline v1: reparto verificable, replay SQL y comprobantes únicos.
-- Nueva migración. Aplicar después de la exportación, según el README central.
begin;

create schema if not exists offline_replay_v1;
revoke all on schema offline_replay_v1 from public, anon, authenticated;

create table if not exists offline_replay_v1.downloads (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  seed bigint not null check (seed between 1 and 4294967295),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists offline_downloads_owner on offline_replay_v1.downloads(owner);
create table if not exists offline_replay_v1.receipts (
  owner uuid not null references public.profiles(id) on delete cascade,
  id uuid not null,
  download_id uuid not null references offline_replay_v1.downloads(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  record jsonb not null,
  receipt jsonb not null,
  local_state jsonb not null,
  accepted_at timestamptz not null default now(),
  primary key (owner,id), unique (download_id,sequence)
);

-- Las filas de replay no pertenecen al juego online ni a Realtime. Se crean
-- y eliminan en la misma transacción, bajo el lock del perfil humano.
create table if not exists offline_replay_v1.games (like public.games including defaults);
create unique index if not exists offline_replay_games_id on offline_replay_v1.games(id);
create table if not exists offline_replay_v1.game_hands (like public.game_hands including defaults);
create table if not exists offline_replay_v1.profiles (id uuid primary key, is_bot boolean not null, campaign_points integer not null default 0);
create table if not exists offline_replay_v1.campaign_style (like public.campaign_style including defaults);
create unique index if not exists offline_replay_style_user on offline_replay_v1.campaign_style(user_id);
create table if not exists offline_replay_v1.campaign_rivals (like public.campaign_rivals including defaults);
create unique index if not exists offline_replay_rivals_id on offline_replay_v1.campaign_rivals(id);
create table if not exists offline_replay_v1.lobby_bots (like public.lobby_bots including defaults);
create table if not exists offline_replay_v1.bot_decisions (like public.bot_decisions including defaults including identity);
create table if not exists offline_replay_v1.random_state (game_id uuid primary key, value bigint not null);

insert into offline_replay_v1.campaign_rivals select * from public.campaign_rivals on conflict (id) do nothing;
insert into offline_replay_v1.profiles(id,is_bot)
  select bot_id,true from public.campaign_rivals on conflict (id) do nothing;

do $security$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='offline_replay_v1' loop
    execute format('alter table offline_replay_v1.%I enable row level security',t.tablename);
  end loop;
end $security$;
revoke all on all tables in schema offline_replay_v1 from public, anon, authenticated;
revoke all on all sequences in schema offline_replay_v1 from public, anon, authenticated;

-- Semilla por ordinal: mismo cálculo entero que el paquete descargado.
create or replace function offline_replay_v1.duel_seed(p_seed bigint,p_sequence integer)
returns bigint language sql immutable set search_path='' as $$
  select greatest(1,(p_seed # (((p_sequence::bigint+1)*2654435761) & 4294967295)) & 4294967295);
$$;
create or replace function offline_replay_v1.random()
returns double precision language plpgsql volatile set search_path='' as $$
declare x bigint; gid uuid := current_setting('trucazo.offline_game')::uuid;
begin
  select value into strict x from offline_replay_v1.random_state where game_id=gid;
  x := (x # ((x << 13) & 4294967295)) & 4294967295;
  x := (x # (x >> 17)) & 4294967295;
  x := (x # ((x << 5) & 4294967295)) & 4294967295;
  update offline_replay_v1.random_state set value=x where game_id=gid;
  return x::double precision / 4294967296.0;
end $$;
create or replace function offline_replay_v1._deal_hands(out h1 jsonb,out h2 jsonb)
returns record language plpgsql set search_path='' as $$
declare deck jsonb := offline_replay_v1._truco_deck(); i integer; j integer; card jsonb;
begin
  for i in reverse 39..1 loop
    j := floor(offline_replay_v1.random()*(i+1))::integer;
    card := deck->i;
    deck := jsonb_set(deck,array[i::text],deck->j);
    deck := jsonb_set(deck,array[j::text],card);
  end loop;
  select jsonb_agg(value order by ordinal) filter(where ordinal<=3),
         jsonb_agg(value order by ordinal) filter(where ordinal between 4 and 6)
    into h1,h2 from jsonb_array_elements(deck) with ordinality e(value,ordinal);
end $$;
create or replace function offline_replay_v1.finish_game(p_game_id uuid,p_winner_id uuid,p_p1_score integer,p_p2_score integer)
returns void language sql set search_path='' as $$
  update offline_replay_v1.games set status='finished',winner_id=p_winner_id,
    player1_score=p_p1_score,player2_score=p_p2_score where id=p_game_id;
$$;

-- RULES_FREEZE_BEGIN: congelar sólo las reglas que ya coinciden con el motor v1.
do $freeze$
declare expected record; f record; def text;
begin
  for expected in select * from (values
    ('_bot_hand_power','83f036218bb821de312345ccb556e73e'),
    ('_truco_deck','751b6218ad5e46af29879aea662df3f0'),
    ('_envido_points','c4ff33c952aa8afa96fd00ec8b7a2060'),
    ('_envido_quiero_value','acfa205235f5ff5a111610ea9dfebf0e'),
    ('_envido_reject_value','9a73a1f0397089546cc1af950478dc25'),
    ('_envido_winning_cards','59e4d2cd55e3219dc2d1532f8aebb47c'),
    ('_envido_reveal_for','fe8a87268252a98c17d31fa4ba8c17c6'),
    ('_round_leader','6cf588e27750b3e50aad817b52ada9e2'),
    ('_who_plays_next','f4ced8217a204fe7fb475bf724c2491b'),
    ('_turn_after_envido','2ff68fdbbaaa7e84b99231847199b0f6'),
    ('play_card','97a5d53ab457b7c345014ce56fe2d72a'),
    ('sing_envido','6f6bebebf88726fd0e3b4de756dd3311'),
    ('respond_envido','5f52a4afb5bf1e91fec16941da218f01'),
    ('envido_say','cb3b36aae5b0001bd9f7556824b23bac'),
    ('sing_truco','bd66afee85ee3594670ef306bdd42f36'),
    ('respond_truco','f12eccf9001069247b0f7392a53ac3f0'),
    ('irse_al_mazo','a9b342a650e53db0d8ade452f0fade71'),
    ('advance_hand','496e08b79ad7acb14a9e5a84d9e7dbd1'),
    ('_record_style','bb51cf5d3fdb8d6dc04007173d30fc4d'),
    ('_northwest_win_probability','97dd10ca9b1b78244faf0233883beaae'),
    ('_northwest_card_choice','e61ba694cc1f22301eb6cba5667f8faf'),
    ('_northwest_plan','c62b592d6483434913dddca9ef96eb23'),
    ('_northwest_bot_step','d57506478c6880b98ff089638443fbf7'),
    ('_bot_step_pre_noroeste','495ae381980000ceac572627044c5faf'),
    ('bot_step','382f398d29a8c2c55eb92d73456b9de1')
  ) e(name,hash) loop
    select p.oid,p.prosrc into strict f from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=expected.name;
    if md5(replace(f.prosrc,chr(13),''))<>expected.hash then raise exception 'Regla SQL distinta: %',expected.name; end if;
    def := replace(pg_get_functiondef(f.oid),'public.','offline_replay_v1.');
    def := regexp_replace(def,'(?<!\.)\mgames\M','offline_replay_v1.games','g');
    def := regexp_replace(def,'SET search_path TO [^\n]+','SET search_path TO offline_replay_v1, pg_catalog, pg_temp');
    def := replace(def,'random()','offline_replay_v1.random()');
    execute def;
  end loop;
end $freeze$;
-- RULES_FREEZE_END

create or replace function public.prepare_offline_campaign()
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; d offline_replay_v1.downloads%rowtype;
begin
  s := public.export_offline_campaign();
  insert into offline_replay_v1.downloads(owner,seed,snapshot)
    values(auth.uid(),1+floor(random()*4294967295)::bigint,s) returning * into d;
  return s || jsonb_build_object('grant',jsonb_build_object('id',d.id,'seed',d.seed,'rules','historia-sql-v1'));
end $$;
revoke all on function public.prepare_offline_campaign() from public, anon;
grant execute on function public.prepare_offline_campaign() to authenticated;

create or replace function offline_replay_v1.validate_game(p_trial jsonb,p_base jsonb,p_seed bigint)
returns jsonb language plpgsql set search_path=offline_replay_v1,pg_catalog,pg_temp as $$
declare
  uid uuid := auth.uid(); gid uuid := (p_trial->>'id')::uuid;
  rival jsonb; g offline_replay_v1.games%rowtype; a jsonb; item jsonb; expected jsonb;
  decision offline_replay_v1.bot_decisions%rowtype; h1 jsonb; h2 jsonb; initial_style jsonb;
  expected_game jsonb; key text; actor uuid; n integer := 0; rng bigint; mano uuid; bot uuid;
  saved_claims text := current_setting('request.jwt.claims',true);
  saved_sub text := current_setting('request.jwt.claim.sub',true);
begin
  select value into rival from jsonb_array_elements(p_base->'catalog'->'rivals') where value->>'id'=p_trial->>'rival';
  bot := (rival->>'bot_id')::uuid;
  if rival is null or p_trial->>'version' is distinct from 'historia-bots-v1' or p_trial->>'owner' is distinct from uid::text
    or (p_trial->>'seed')::bigint is distinct from p_seed or p_trial->'bot'->'rival' is distinct from rival
    or p_trial->'bot'->'initial_style' is distinct from p_base->'style'
    or (p_trial->'bot'->>'campaign_points')::integer is distinct from (p_base->>'points')::integer then
    raise exception 'offline:record';
  end if;
  if jsonb_typeof(p_trial->'actions') is distinct from 'array'
    or jsonb_array_length(p_trial->'actions') not between 1 and 4000 then raise exception 'offline:record'; end if;
  insert into offline_replay_v1.profiles values(uid,false,(p_base->>'points')::integer);
  insert into offline_replay_v1.campaign_style
    select (jsonb_populate_record(null::offline_replay_v1.campaign_style,p_base->'style'||jsonb_build_object('user_id',uid,'updated_at',now()))).*;
  insert into offline_replay_v1.random_state values(gid,p_seed);
  perform set_config('trucazo.offline_game',gid::text,true);
  mano := case when offline_replay_v1.random()<0.5 then uid else bot end;
  select * into h1,h2 from offline_replay_v1._deal_hands();
  insert into offline_replay_v1.games(id,player1_id,player2_id,player1_username,player2_username,bet,
    target_score,current_turn,mano_player,campaign_rival_id,envido_state,truco_state)
    values(gid,uid,bot,'Offline',rival->>'display_name',0,(rival->>'target_score')::integer,mano,mano,(rival->>'id')::uuid,
      '{"status":"none","value":0,"last_singer":null,"chain":[]}', '{"status":"none","value":1,"last_singer":null}');
  insert into offline_replay_v1.game_hands(game_id,player_id,cards) values(gid,uid,h1),(gid,bot,h2);
  perform offline_replay_v1._record_style(gid,'hand_played');
  for item in select value from jsonb_array_elements(p_trial->'actions') loop
    select * into strict g from offline_replay_v1.games where id=gid;
    if g.status<>'playing' then raise exception 'offline:record'; end if;
    a := item->'action'; actor := (a->>'player')::uuid;
    if actor=bot then
      if g.awaiting_deal or (case when g.envido_state->>'status'='declaring'
        then g.envido_state->>'declare_turn'<>bot::text else g.current_turn<>bot end) then raise exception 'offline:record'; end if;
      perform offline_replay_v1.bot_step(gid);
      select * into strict decision from offline_replay_v1.bot_decisions where game_id=gid order by id desc limit 1;
      if not decision.ok then raise exception 'offline:record'; end if;
      expected := jsonb_build_object('player',bot,'type',case decision.action
        when 'play' then 'play_card' when 'mazo' then 'irse_al_mazo'
        else regexp_replace(decision.action,'_(yes|no)$','') end);
      if decision.action='play' then expected := expected||jsonb_build_object('card',decision.numbers->'card');
      elsif decision.action ~ '^respond_.*_(yes|no)$' then expected := expected||jsonb_build_object('accept',decision.action ~ '_yes$');
      elsif decision.detail is not null then expected := expected||jsonb_build_object('value',decision.detail); end if;
    elsif actor=uid then
      expected := jsonb_build_object('player',uid,'type',a->>'type');
      case a->>'type'
        when 'play_card' then
          if not exists(select 1 from offline_replay_v1.game_hands h,jsonb_array_elements(h.cards) c
            where h.game_id=gid and h.player_id=uid and c.value=a->'card') then raise exception 'offline:record'; end if;
          expected := expected||jsonb_build_object('card',a->'card');
          perform offline_replay_v1.play_card(gid,a->'card');
        when 'sing_envido' then expected := expected||jsonb_build_object('value',a->'value'); perform offline_replay_v1.sing_envido(gid,a->>'value');
        when 'respond_envido' then expected := expected||jsonb_build_object('accept',a->'accept'); perform offline_replay_v1.respond_envido(gid,(a->>'accept')::boolean);
        when 'envido_say' then expected := expected||jsonb_build_object('value',a->'value'); perform offline_replay_v1.envido_say(gid,a->>'value');
        when 'sing_truco' then expected := expected||jsonb_build_object('value',a->'value'); perform offline_replay_v1.sing_truco(gid,a->>'value');
        when 'respond_truco' then expected := expected||jsonb_build_object('accept',a->'accept'); perform offline_replay_v1.respond_truco(gid,(a->>'accept')::boolean);
        when 'irse_al_mazo' then perform offline_replay_v1.irse_al_mazo(gid);
        when 'advance_hand' then
          if not g.awaiting_deal then raise exception 'offline:record'; end if;
          perform offline_replay_v1.advance_hand(gid);
        else raise exception 'offline:record';
      end case;
    else raise exception 'offline:record'; end if;
    select value into rng from offline_replay_v1.random_state where game_id=gid;
    if a is distinct from expected or (item->>'rng')::bigint is distinct from rng then
      raise exception 'offline:record' using detail=jsonb_build_object('turn',n,'expected',expected,'received',a,'rng',rng,'received_rng',item->'rng')::text;
    end if;
    n := n+1;
  end loop;
  perform set_config('request.jwt.claims',coalesce(saved_claims,''),true);
  perform set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
  select * into strict g from offline_replay_v1.games where id=gid;
  select jsonb_agg(cards order by case player_id when uid then 0 else 1 end) into h1
    from offline_replay_v1.game_hands where game_id=gid;
  select to_jsonb(s)-'user_id'-'updated_at' into initial_style from offline_replay_v1.campaign_style s where user_id=uid;
  expected_game := to_jsonb(g);
  -- El cliente muestra la última carta al cerrar; SQL cierra sin persistirla.
  -- Envidο empatado puede revelar otro palo con el mismo tanto. Ninguno altera premio.
  if (select array_agg(k order by k) from jsonb_object_keys(p_trial->'game') k) is distinct from
    array['awaiting_deal','current_turn','envido_reveal','envido_state','hand_number','id','mano_player',
      'played_cards','player1_id','player1_score','player2_id','player2_score','round_number','round_results',
      'status','target_score','truco_state','winner_id'] then raise exception 'offline:record'; end if;
  for key in select jsonb_object_keys(p_trial->'game') loop
    if key not in ('played_cards','round_results','envido_reveal')
      and p_trial->'game'->key is distinct from expected_game->key then raise exception 'offline:record'; end if;
  end loop;
  if g.status<>'finished' or (p_trial->>'revision')::integer is distinct from n or (p_trial->>'rng')::bigint is distinct from rng
    or p_trial->'hands' is distinct from h1 or p_trial->'bot'->'style' is distinct from initial_style
    or p_trial->'result' is distinct from jsonb_build_object('status','trial-only','winner',g.winner_id,'scores',jsonb_build_array(g.player1_score,g.player2_score)) then
    raise exception 'offline:record';
  end if;
  delete from offline_replay_v1.game_hands where game_id=gid;
  delete from offline_replay_v1.games where id=gid;
  delete from offline_replay_v1.bot_decisions where game_id=gid;
  delete from offline_replay_v1.random_state where game_id=gid;
  delete from offline_replay_v1.campaign_style where user_id=uid;
  delete from offline_replay_v1.profiles where id=uid;
  return jsonb_build_object('winner',g.winner_id,'scores',jsonb_build_array(g.player1_score,g.player2_score),'style',initial_style);
end $$;

revoke all on all functions in schema offline_replay_v1 from public, anon, authenticated;

-- ONLINE_REWARD_LOCK: serializa primeras victorias y topes online/offline.
create or replace function public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  g            games%rowtype;
  v_loser_id   uuid;
  v_winner_un  text;
  v_loser_un   text;
  v_net        numeric;
  v_human      uuid;
  r_base       integer;
  r_coins      integer;
  v_margin     integer;
  v_pts        integer;
  v_crumb      integer;
  v_acc        integer;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status = 'finished' then return; end if;  -- idempotente
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;
  if p_winner_id <> g.player1_id and p_winner_id <> g.player2_id then
    raise exception 'winner is not a player of this game';
  end if;

  -- --- Duelo de campaña: sin apuesta ni estadísticas; da puntos de ranking ---
  if g.campaign_rival_id is not null then
    update games
       set status = 'finished', winner_id = p_winner_id,
           player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
     where id = p_game_id;

    select id into v_human from profiles
     where id in (g.player1_id, g.player2_id) and not is_bot limit 1;
    perform 1 from profiles where id=v_human for update;

    if v_human is not null and p_winner_id = v_human then
      select points_reward, reward_coins into r_base, r_coins
        from campaign_rivals where id = g.campaign_rival_id;
      r_base  := coalesce(r_base, 0);
      r_coins := coalesce(r_coins, 0);

      -- Margen del marcador final (a favor del humano), para el plus.
      v_margin := case when v_human = g.player1_id
                       then p_p1_score - p_p2_score else p_p2_score - p_p1_score end;
      v_margin := greatest(coalesce(v_margin, 0), 0);

      insert into campaign_progress (user_id, rival_id)
      values (v_human, g.campaign_rival_id)
      on conflict (user_id, rival_id) do nothing;

      if found then
        -- Primera victoria: monedas + puntos base + plus por margen (hasta +20%).
        v_pts := r_base + round(r_base * 0.20 * v_margin::numeric / greatest(g.target_score, 1))::int;
        update profiles
           set coins = coins + r_coins, campaign_points = campaign_points + v_pts
         where id = v_human;
        update games
           set campaign_reward = r_coins, campaign_points_earned = v_pts
         where id = p_game_id;
      else
        -- Revancha ganada: miguita (10% del base) con tope acumulado (30% del base).
        select rematch_points into v_acc from campaign_progress
         where user_id = v_human and rival_id = g.campaign_rival_id;
        v_crumb := least(floor(r_base * 0.10)::int,
                         floor(r_base * 0.30)::int - coalesce(v_acc, 0));
        v_crumb := greatest(v_crumb, 0);

        update campaign_progress
           set wins = wins + 1, rematch_points = rematch_points + v_crumb
         where user_id = v_human and rival_id = g.campaign_rival_id;

        if v_crumb > 0 then
          update profiles set campaign_points = campaign_points + v_crumb where id = v_human;
          update games set campaign_points_earned = v_crumb where id = p_game_id;
        end if;
      end if;
    end if;
    return;
  end if;

  -- --- Partida normal (vs humano): comportamiento original intacto ---
  v_loser_id  := case when p_winner_id = g.player1_id then g.player2_id else g.player1_id end;
  v_winner_un := case when p_winner_id = g.player1_id then g.player1_username else g.player2_username end;
  v_loser_un  := case when p_winner_id = g.player1_id then g.player2_username else g.player1_username end;
  v_net       := g.bet / 2.0;

  update games
     set status = 'finished', winner_id = p_winner_id,
         player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
   where id = p_game_id;

  update profiles set coins = coins + g.bet where id = p_winner_id;

  update profiles set games_played = games_played + 1, games_won = games_won + 1 where id = p_winner_id;
  update profiles set games_played = games_played + 1, games_lost = games_lost + 1 where id = v_loser_id;

  insert into game_history (player_id, opponent_id, opponent_username, result, coins_change)
  values
    (p_winner_id, v_loser_id,  v_loser_un,  'win',   v_net),
    (v_loser_id,  p_winner_id, v_winner_un, 'loss', -v_net);
end;
$function$;

-- SYNC_COMMIT_BEGIN
create or replace function public.sync_offline_campaign(p_records jsonb,p_complete boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid(); snapshot jsonb; entry jsonb; d offline_replay_v1.downloads%rowtype;
  prior offline_replay_v1.receipts%rowtype; existing offline_replay_v1.receipts%rowtype;
  base jsonb; verified jsonb; rival jsonb; province jsonb; progress jsonb; dependencies jsonb;
  projection jsonb; receipt jsonb; receipts jsonb := '[]'; seq integer; gid uuid;
  won boolean; pts integer; coins integer; acc integer; b integer; margin integer; key text;
  before_points integer; before_coins integer;
begin
  -- La exportación rechaza sesión ausente, invitado, bot o cuenta eliminada.
  snapshot := public.export_offline_campaign();
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records) not between 1 and 10
    or octet_length(p_records::text)>2097152 then raise exception 'offline:batch'; end if;
  -- Orden de locks: estilo y luego perfil, como una jugada online que termina.
  insert into public.campaign_style(user_id) values(uid) on conflict (user_id) do nothing;
  perform 1 from public.campaign_style where user_id=uid for update;
  perform 1 from public.profiles where id=uid for update;
  for entry in select value from jsonb_array_elements(p_records) loop
    gid := (entry->>'id')::uuid; seq := (entry->>'sequence')::integer;
    if gid is null or seq is null or seq<0 or entry->>'status' is distinct from 'pending'
      or entry->'trial'->>'id' is distinct from gid::text or entry->>'finished_at' is null
      or (entry->>'finished_at')::timestamptz is null then raise exception 'offline:record'; end if;
    select * into d from offline_replay_v1.downloads where id=(entry->>'grant_id')::uuid and owner=uid;
    if not found then raise exception 'offline:download'; end if;
    select * into existing from offline_replay_v1.receipts where owner=uid and id=gid;
    if found then
      if existing.record is distinct from entry then raise exception 'offline:conflict'; end if;
      receipts := receipts||jsonb_build_array(existing.receipt); continue;
    end if;
    if exists(select 1 from offline_replay_v1.receipts where download_id=d.id and sequence=seq)
      or exists(select 1 from public.games where id=gid) or exists(select 1 from public.tables where id=gid)
      then raise exception 'offline:conflict'; end if;
    if d.snapshot->'catalog' is distinct from snapshot->'catalog' then raise exception 'offline:catalog'; end if;
    select coalesce(jsonb_agg(id order by sequence),'[]') into dependencies
      from offline_replay_v1.receipts where download_id=d.id and sequence<seq;
    if jsonb_array_length(dependencies)<>seq or entry->'dependencies' is distinct from dependencies then raise exception 'offline:dependencies'; end if;
    base := d.snapshot;
    if seq>0 then
      select * into strict prior from offline_replay_v1.receipts where download_id=d.id and sequence=seq-1;
      base := base||prior.local_state;
    end if;
    select value into rival from jsonb_array_elements(base->'catalog'->'rivals') where value->>'id'=entry->'trial'->>'rival';
    select value into province from jsonb_array_elements(base->'catalog'->'provinces') where value->>'id'=rival->>'province_id';
    select value into progress from jsonb_array_elements(base->'progress') where value->>'rival_id'=rival->>'id';
    if rival is null or province is null or (progress is null and
      ((base->>'points')::integer<(rival->>'points_required')::integer
      or (base->>'points')::integer<(province->>'points_required')::integer
      or (province->>'required_rival_id' is not null and not exists(select 1 from jsonb_array_elements(base->'progress') p where p->>'rival_id'=province->>'required_rival_id'))))
      then raise exception 'offline:locked'; end if;
    verified := offline_replay_v1.validate_game(entry->'trial',base,offline_replay_v1.duel_seed(d.seed,seq));
    won := verified->>'winner'=uid::text; b := (rival->>'points_reward')::integer; pts := 0; coins := 0;
    -- Proyección local original: sólo alimenta el próximo bot de esta descarga.
    if won then
      if progress is null then
        margin := greatest(0,(verified->'scores'->>0)::integer-(verified->'scores'->>1)::integer);
        pts := b+round(b*0.20*margin/(rival->>'target_score')::integer)::integer;
        coins := (rival->>'reward_coins')::integer;
        progress := jsonb_build_object('rival_id',rival->>'id','beaten_at',entry->>'finished_at','wins',1,'rematch_points',0);
      else
        acc := (progress->>'rematch_points')::integer;
        pts := greatest(0,least(floor(b*0.10)::integer,floor(b*0.30)::integer-acc));
        progress := progress||jsonb_build_object('wins',(progress->>'wins')::integer+1,'rematch_points',acc+pts);
      end if;
    end if;
    if entry->'projected_reward' is distinct from jsonb_build_object('points',pts,'coins',coins) then raise exception 'offline:record'; end if;
    projection := jsonb_build_object('points',(base->>'points')::integer+pts,'style',verified->'style','progress',base->'progress');
    if won then
      select coalesce(jsonb_agg(p),'[]') into dependencies from jsonb_array_elements(base->'progress') p where p->>'rival_id'<>rival->>'id';
      projection := projection||jsonb_build_object('progress',dependencies||jsonb_build_array(progress));
    end if;
    select campaign_points,profiles.coins into before_points,before_coins from public.profiles where id=uid;
    insert into public.tables(id,name,creator_id,opponent_id,creator_username,opponent_username,bet,target_score,status,is_private)
      select gid,'Modo Historia',uid,(rival->>'bot_id')::uuid,username,rival->>'display_name',0,(rival->>'target_score')::integer,'playing',true from public.profiles where id=uid;
    insert into public.games(id,player1_id,player2_id,player1_username,player2_username,bet,target_score,current_turn,mano_player,campaign_rival_id)
      select gid,uid,(rival->>'bot_id')::uuid,username,rival->>'display_name',0,(rival->>'target_score')::integer,uid,uid,(rival->>'id')::uuid from public.profiles where id=uid;
    -- Una vez validado, la función de premios habitual sigue siendo la autoridad.
    perform public.finish_game(gid,(verified->>'winner')::uuid,(verified->'scores'->>0)::integer,(verified->'scores'->>1)::integer);
    update public.tables set status='finished' where id=gid;
    for key in select jsonb_object_keys(verified->'style') loop
      if key not in ('hands_played','envido_sung','envido_bluff','envido_folded','truco_sung','truco_bluff','truco_folded') then raise exception 'offline:record'; end if;
      execute format('update public.campaign_style set %1$I=%1$I+$1,updated_at=now() where user_id=$2',key)
        using (verified->'style'->>key)::integer-(base->'style'->>key)::integer,uid;
    end loop;
    select jsonb_build_object('id',gid,'status','accepted','points',campaign_points-before_points,'coins',profiles.coins-before_coins,
      'winner',verified->'winner','scores',verified->'scores') into receipt from public.profiles where id=uid;
    insert into offline_replay_v1.receipts(owner,id,download_id,sequence,record,receipt,local_state)
      values(uid,gid,d.id,seq,entry,receipt,projection);
    receipts := receipts||jsonb_build_array(receipt);
  end loop;
  return jsonb_build_object('receipts',receipts,'snapshot',case when p_complete then public.prepare_offline_campaign() else null end);
end $$;
revoke all on function public.sync_offline_campaign(jsonb,boolean) from public,anon;
grant execute on function public.sync_offline_campaign(jsonb,boolean) to authenticated;
revoke execute on function public.export_offline_campaign() from authenticated;
-- SYNC_COMMIT_END
commit;
