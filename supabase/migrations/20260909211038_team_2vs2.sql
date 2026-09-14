-- Truco 2vs2: estado y manos separados del 1vs1; API autoritativa por equipo.
begin;

create schema if not exists team_internal;
revoke all on schema team_internal from public, anon, authenticated;

create table public.team_tables (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  name text not null check (length(name) between 1 and 60),
  bet integer not null check (bet between 10 and 1000000),
  target_score integer not null check (target_score in (15,30)),
  time_limit integer not null check (time_limit in (15,30)),
  is_private boolean not null default false,
  private_code text unique,
  status text not null default 'waiting' check (status in ('waiting','playing','finished','cancelled')),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_private = (private_code is not null))
);

-- Un miembro humano puede entrar y elegir lugar después. Los bots siempre tienen asiento.
create table public.team_seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.team_tables(id) on delete cascade,
  user_id uuid references public.profiles(id),
  seat integer check (seat between 0 and 3),
  username text not null,
  avatar_url text,
  paid integer not null check (paid >= 0),
  timeouts integer not null default 0,
  last_seen_at timestamptz not null default now(),
  unique(table_id, seat),
  unique(table_id, user_id),
  check (user_id is not null or seat is not null)
);
create index team_seats_user_idx on public.team_seats(user_id, table_id);

create table public.team_games (
  id uuid primary key references public.team_tables(id),
  hand_number integer not null default 1,
  mano integer not null default 0 check (mano between 0 and 3),
  turn integer not null default 0 check (turn between 0 and 3),
  round integer not null default 1 check (round between 1 and 3),
  scores integer[] not null default array[0,0],
  played jsonb not null default '[]',
  rounds jsonb not null default '[]',
  envido jsonb not null default '{"status":"none","chain":[]}',
  truco jsonb not null default '{"status":"none","value":1}',
  awaiting_deal boolean not null default false,
  winner_team integer check (winner_team in (0,1)),
  last_hand_winner integer check (last_hand_winner in (0,1)),
  finish_reason text,
  announcement jsonb,
  reveal jsonb,
  action_started_at timestamptz not null default now()
);

create table public.team_hands (
  table_id uuid not null references public.team_tables(id),
  seat integer not null check (seat between 0 and 3),
  cards jsonb not null,
  primary key(table_id,seat),
  foreign key(table_id,seat) references public.team_seats(table_id,seat)
);

-- No guarda respuestas con cartas privadas: los reintentos devuelven el estado actual.
create table team_internal.requests (
  actor uuid not null,
  request_id uuid not null,
  table_id uuid not null references public.team_tables(id),
  payload jsonb not null,
  primary key(actor,request_id)
);

alter table public.team_tables enable row level security;
alter table public.team_seats enable row level security;
alter table public.team_games enable row level security;
alter table public.team_hands enable row level security;
revoke all on public.team_tables, public.team_seats, public.team_games, public.team_hands from public, anon, authenticated;
grant select on public.team_tables, public.team_seats, public.team_games, public.team_hands to authenticated;

create function team_internal.member(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.team_seats where table_id=p_id and user_id=auth.uid());
$$;

-- La función de pertenencia no queda como API pública; las lecturas del cliente
-- pasan por las RPC. La política usa una lista propia sin recursión de tablas.
create policy team_own_seat on public.team_seats for select to authenticated
  using (user_id=auth.uid());
create policy team_table_read on public.team_tables for select to authenticated
  using (not is_private or id in (select table_id from public.team_seats where user_id=auth.uid()));
create policy team_game_read on public.team_games for select to authenticated
  using (id in (select table_id from public.team_seats where user_id=auth.uid()));
create policy team_hand_read on public.team_hands for select to authenticated
  using (exists(select 1 from public.team_seats s where s.table_id=team_hands.table_id
    and s.seat=team_hands.seat and s.user_id=auth.uid()));

-- La economía 2vs2 no debe entregar medallas nuevas por los cambios de saldo.
create or replace function public.award_medals_on_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('trucazo.team_coins',true) is distinct from 'on' then
    perform public.award_event_medals(new.id,false);
  end if;
  return new;
end;
$$;

create function team_internal.coins(p_user uuid,p_delta integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_previous text := current_setting('trucazo.team_coins',true); v_balance integer;
begin
  select coins into v_balance from public.profiles where id=p_user for update;
  if not found or v_balance+p_delta<0 then raise exception 'Monedas insuficientes'; end if;
  perform set_config('trucazo.team_coins','on',true);
  update public.profiles set coins=coins+p_delta where id=p_user;
  perform set_config('trucazo.team_coins',coalesce(v_previous,''),true);
end;
$$;

create function team_internal.deal(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare deck jsonb[]; s integer;
begin
  select array_agg(c order by random()) into deck from jsonb_array_elements(public._truco_deck()) c;
  for s in 0..3 loop
    insert into public.team_hands(table_id,seat,cards)
      values(p_id,s,jsonb_build_array(deck[s*3+1],deck[s*3+2],deck[s*3+3]))
      on conflict(table_id,seat) do update set cards=excluded.cards;
  end loop;
end;
$$;

create function team_internal.full_hand(p_id uuid,p_seat integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select h.cards || coalesce((select jsonb_agg(c->'card')
    from public.team_games g, jsonb_array_elements(g.played) c
    where g.id=p_id and (c->>'seat')::integer=p_seat),'[]'::jsonb)
  from public.team_hands h where h.table_id=p_id and h.seat=p_seat;
$$;

create function team_internal.responder(p_id uuid,p_team integer,p_mano integer) returns integer
language sql stable security definer set search_path = '' as $$
  select seat from public.team_seats where table_id=p_id and seat%2=p_team
  order by (user_id is null), (seat-p_mano+4)%4 limit 1;
$$;

create function team_internal.actor(g public.team_games) returns integer
language plpgsql stable security definer set search_path = '' as $$
begin
  if g.envido->>'status'='declaring' then return (g.envido->>'declare_turn')::integer; end if;
  if g.envido->>'status'='pending' then
    return team_internal.responder(g.id,1-(g.envido->>'team')::integer,g.mano);
  end if;
  if g.truco->>'status'='pending' then
    return team_internal.responder(g.id,1-(g.truco->>'team')::integer,g.mano);
  end if;
  return g.turn;
end;
$$;

create function team_internal.stake(g public.team_games) returns integer
language sql immutable as $$
  select case when g.truco->>'status'='pending' then (g.truco->>'value')::integer-1
    else coalesce((g.truco->>'value')::integer,1) end;
$$;

-- Las mismas opciones alimentan la validación, los controles y el bot.
create function team_internal.legal(g public.team_games,p_seat integer) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare a text[] := '{}'; es text := g.envido->>'status'; ts text := g.truco->>'status';
  actor integer; target integer; v integer; points integer; n integer;
begin
  if g.id is null or p_seat is null or g.awaiting_deal then return a; end if;
  if not exists(select 1 from public.team_tables where id=g.id and status='playing') then return a; end if;
  actor:=team_internal.actor(g);
  if actor=p_seat then a:=array_append(a,'mazo'); end if;
  if es='declaring' then
    if actor=p_seat then
      points:=public._envido_points(team_internal.full_hand(g.id,p_seat));
      a:=array_append(a,case when points>coalesce((g.envido->>'high')::integer,-1) then 'tengo' else 'son_buenas' end);
    end if;
    return a;
  end if;
  if es='pending' then
    target:=1-(g.envido->>'team')::integer;
    if p_seat%2<>target then return a; end if;
    a:=a || array['envido_yes','envido_no'];
    v:=jsonb_array_length(g.envido->'chain');
    if g.envido->'chain'->>(v-1)='envido' then
      select count(*) into n from jsonb_array_elements_text(g.envido->'chain') c where c='envido';
      if n<2 then a:=array_append(a,'envido'); end if;
      a:=array_append(a,'real_envido');
    end if;
    if g.envido->'chain'->>(v-1)<>'falta_envido' then a:=array_append(a,'falta_envido'); end if;
    return a;
  end if;
  if ts='pending' then
    if p_seat%2=(g.truco->>'team')::integer then return a; end if;
    a:=a || array['truco_yes','truco_no'];
    v:=(g.truco->>'value')::integer;
    if v<4 then a:=array_append(a,case v when 2 then 'retruco' else 'vale_cuatro' end); end if;
  elsif g.turn=p_seat then
    a:=array_append(a,'play');
    if ts='none' then a:=array_append(a,'truco');
    elsif ts='accepted' and p_seat%2<>(g.truco->>'team')::integer then
      v:=(g.truco->>'value')::integer;
      if v<4 then a:=array_append(a,case v when 2 then 'retruco' else 'vale_cuatro' end); end if;
    end if;
  else return a;
  end if;
  if es='none' and ts<>'accepted' and g.round=1 and not exists(
    select 1 from jsonb_array_elements(g.played) c where (c->>'seat')::integer=p_seat
  ) then a:=a || array['envido','real_envido','falta_envido']; end if;
  return a;
end;
$$;

create function team_internal.snapshot(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.team_tables; g public.team_games; me public.team_seats; members jsonb; hand jsonb; actor integer;
begin
  select * into t from public.team_tables where id=p_id;
  if not found then raise exception 'Mesa no disponible'; end if;
  select * into me from public.team_seats where table_id=p_id and user_id=auth.uid();
  if not found and t.creator_id is distinct from auth.uid() then raise exception 'No sos participante'; end if;
  select * into g from public.team_games where id=p_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'user_id',s.user_id,'seat',s.seat,
    'username',s.username,'avatar_url',s.avatar_url,'is_bot',s.user_id is null,'timeouts',s.timeouts)
    order by s.seat nulls last),'[]') into members from public.team_seats s where table_id=p_id;
  select cards into hand from public.team_hands where table_id=p_id and seat=me.seat;
  if g.id is not null then actor:=team_internal.actor(g); end if;
  return jsonb_build_object('table',to_jsonb(t),'members',members,'game',case when g.id is null then null else to_jsonb(g) end,
    'my_seat',me.seat,'hand',coalesce(hand,'[]'),'legal',team_internal.legal(g,me.seat),
    'actor',actor,'actor_is_bot',exists(select 1 from public.team_seats where table_id=p_id and seat=actor and user_id is null),
    'server_now',clock_timestamp(),'coins',(select coins from public.profiles where id=auth.uid()));
end;
$$;

create function public.team_snapshot(p_table_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  return team_internal.snapshot(p_table_id);
end;
$$;

create function public.team_lobby() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  return jsonb_build_object('tables',coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select t.id,t.name,t.bet,t.target_score,t.time_limit,t.created_at,
      (select count(*) from public.team_seats s where s.table_id=t.id) as occupied
    from public.team_tables t where t.status='waiting' and not t.is_private
  ) x),'[]'::jsonb),'mine',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status))
    from public.team_tables t join public.team_seats s on s.table_id=t.id
    where s.user_id=auth.uid() and t.status in ('waiting','playing')),'[]'::jsonb));
end;
$$;

-- La llave por usuario impide doble creación/ingreso con el mismo identificador.
create function public.team_create(p_request_id uuid,p_name text,p_bet integer,
  p_target_score integer default 30,p_time_limit integer default 30,p_is_private boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.team_tables; r team_internal.requests; p jsonb;
begin
  if uid is null or p_request_id is null then raise exception 'Solicitud inválida'; end if;
  p:=jsonb_build_object('action','create','name',p_name,'bet',p_bet,'score',p_target_score,'time',p_time_limit,'private',p_is_private);
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into r from team_internal.requests q where q.actor=uid and q.request_id=p_request_id;
  if found then
    if r.payload<>p then raise exception 'Identificador de solicitud reutilizado'; end if;
    return team_internal.snapshot(r.table_id);
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 60 or p_bet is null or p_bet not between 10 and 1000000
    or p_target_score is null or p_target_score not in (15,30) or p_time_limit is null or p_time_limit not in (15,30)
    or p_is_private is null then raise exception 'Opciones inválidas'; end if;
  if exists(select 1 from public.team_seats s join public.team_tables active on active.id=s.table_id
    where s.user_id=uid and active.status in ('waiting','playing')) then raise exception 'Ya tenés una mesa 2vs2 en curso'; end if;
  perform team_internal.coins(uid,-p_bet);
  insert into public.team_tables(creator_id,name,bet,target_score,time_limit,is_private,private_code)
    values(uid,btrim(p_name),p_bet,p_target_score,p_time_limit,p_is_private,
      case when p_is_private then 'P'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,9)) else null end) returning * into t;
  insert into public.team_seats(table_id,user_id,username,avatar_url,paid)
    select t.id,uid,username,avatar_url,p_bet from public.profiles where id=uid;
  insert into team_internal.requests values(uid,p_request_id,t.id,p);
  return team_internal.snapshot(t.id);
end;
$$;

create function public.team_join(p_request_id uuid,p_table_id uuid default null,p_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.team_tables; r team_internal.requests; p jsonb;
begin
  if uid is null or p_request_id is null then raise exception 'Solicitud inválida'; end if;
  p:=jsonb_build_object('action','join','id',p_table_id,'code',upper(btrim(p_code)));
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into r from team_internal.requests q where q.actor=uid and q.request_id=p_request_id;
  if found then
    if r.payload<>p then raise exception 'Identificador de solicitud reutilizado'; end if;
    return team_internal.snapshot(r.table_id);
  end if;
  select * into t from public.team_tables where
    (p_table_id is not null and id=p_table_id and not is_private)
    or (p_table_id is null and private_code=upper(btrim(p_code)) and is_private) for update;
  if not found then raise exception 'Mesa o código no disponible'; end if;
  if team_internal.member(t.id) then return team_internal.snapshot(t.id); end if;
  if t.status<>'waiting' or (select count(*) from public.team_seats where table_id=t.id)>=4 then raise exception 'La mesa está llena o ya comenzó'; end if;
  if exists(select 1 from public.team_seats s join public.team_tables x on x.id=s.table_id
    where s.user_id=uid and x.status in ('waiting','playing')) then raise exception 'Ya tenés una mesa 2vs2 en curso'; end if;
  perform team_internal.coins(uid,-t.bet);
  insert into public.team_seats(table_id,user_id,username,avatar_url,paid)
    select t.id,uid,username,avatar_url,t.bet from public.profiles where id=uid;
  update public.team_tables set version=version+1,updated_at=now() where id=t.id;
  insert into team_internal.requests values(uid,p_request_id,t.id,p);
  return team_internal.snapshot(t.id);
end;
$$;

create function team_internal.finish(p_id uuid,p_winner integer,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.team_tables; s record;
begin
  select * into t from public.team_tables where id=p_id for update;
  if t.status<>'playing' then return; end if;
  if p_winner not in (0,1) or p_winner is null then raise exception 'Equipo inválido'; end if;
  update public.team_tables set status='finished' where id=p_id;
  update public.team_games set winner_team=p_winner,finish_reason=p_reason,awaiting_deal=false where id=p_id;
  for s in select user_id from public.team_seats where table_id=p_id and seat%2=p_winner and user_id is not null order by user_id loop
    perform team_internal.coins(s.user_id,t.bet*2);
  end loop;
end;
$$;

create function team_internal.cancel(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  for s in select user_id,paid from public.team_seats where table_id=p_id and user_id is not null and paid>0 order by user_id loop
    perform team_internal.coins(s.user_id,s.paid);
  end loop;
  update public.team_seats set paid=0 where table_id=p_id;
  update public.team_tables set status='cancelled',version=version+1,updated_at=now() where id=p_id;
end;
$$;

create function team_internal.apply(p_id uuid,p_seat integer,p_action text,p_card jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.team_games; t public.team_tables; v_cards jsonb; matched jsonb; chain jsonb;
  winner integer; leader integer; best integer; teams integer[]; first_team integer; second_team integer;
  points integer; extra integer:=0; hand_over boolean:=false; count_played integer; dindex integer;
  phrase text:=p_action; c jsonb; shown jsonb:='[]'; full_cards jsonb;
begin
  select * into t from public.team_tables where id=p_id;
  select * into g from public.team_games where id=p_id;
  if not (p_action=any(team_internal.legal(g,p_seat))) then raise exception 'Esa acción no corresponde a tu turno'; end if;
  case
  when p_action='play' then
    if exists(select 1 from jsonb_array_elements(g.played) x where (x->>'seat')::integer=p_seat and (x->>'round')::integer=g.round) then raise exception 'Ya jugaste esta ronda'; end if;
    select h.cards into v_cards from public.team_hands h where table_id=p_id and seat=p_seat;
    select x into matched from jsonb_array_elements(v_cards) x where x->>'suit'=p_card->>'suit' and x->>'value'=p_card->>'value';
    if matched is null then raise exception 'No tenés esa carta'; end if;
    update public.team_hands set cards=(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(v_cards) x where x<>matched)
      where table_id=p_id and seat=p_seat;
    g.played:=g.played || jsonb_build_array(jsonb_build_object('seat',p_seat,'card',matched,'round',g.round));
    select count(*) into count_played from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round;
    if count_played<4 then g.turn:=(p_seat+1)%4;
    else
      select min((x->'card'->>'rank')::integer) into best from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round;
      select array_agg(distinct (x->>'seat')::integer%2) into teams from jsonb_array_elements(g.played) x
        where (x->>'round')::integer=g.round and (x->'card'->>'rank')::integer=best;
      if array_length(teams,1)=1 then
        winner:=teams[1];
        select (x->>'seat')::integer into leader from jsonb_array_elements(g.played) with ordinality e(x,n)
          where (x->>'round')::integer=g.round and (x->'card'->>'rank')::integer=best order by n limit 1;
      else
        winner:=null;
        select (x->>'seat')::integer into leader from jsonb_array_elements(g.played) with ordinality e(x,n)
          where (x->>'round')::integer=g.round order by n limit 1;
      end if;
      g.rounds:=g.rounds || jsonb_build_array(jsonb_build_object('round',g.round,'team',winner,'leader',leader));
      first_team:=(g.rounds->0->>'team')::integer; second_team:=(g.rounds->1->>'team')::integer;
      if g.round=2 and (first_team=second_team or first_team is null or second_team is null)
        and coalesce(first_team,second_team) is not null then
        winner:=coalesce(first_team,second_team); hand_over:=true;
      elsif g.round=3 then
        winner:=coalesce(winner,first_team,second_team,g.mano%2); hand_over:=true;
      else g.turn:=leader; g.round:=g.round+1;
      end if;
      if hand_over then points:=team_internal.stake(g); end if;
    end if;
    phrase:=null;
  when p_action in ('envido','real_envido','falta_envido') then
    chain:=coalesce(g.envido->'chain','[]') || jsonb_build_array(p_action);
    g.envido:=jsonb_build_object('status','pending','chain',chain,'singer',p_seat,'team',p_seat%2,
      'value',public._envido_quiero_value(chain,g.scores[1],g.scores[2],t.target_score));
    phrase:=case p_action when 'envido' then 'Envido' when 'real_envido' then 'Real envido' else 'Falta envido' end;
  when p_action='envido_yes' then
    g.envido:=g.envido || jsonb_build_object('status','declaring','declare_turn',g.mano,'declare_index',0,'high',-1,'declarations','[]'::jsonb);
    phrase:='Quiero';
  when p_action='envido_no' then
    winner:=(g.envido->>'team')::integer;
    points:=public._envido_reject_value(g.envido->'chain',g.scores[1],g.scores[2],t.target_score);
    g.envido:=g.envido || jsonb_build_object('status','rejected','winner_team',winner,'awarded',points);
    phrase:='No quiero';
  when p_action in ('tengo','son_buenas') then
    dindex:=(g.envido->>'declare_index')::integer+1;
    if p_action='tengo' then
      points:=public._envido_points(team_internal.full_hand(p_id,p_seat));
      g.envido:=g.envido || jsonb_build_object('high',points,'high_seat',p_seat);
      phrase:='Tengo '||points;
      g.envido:=jsonb_set(g.envido,'{declarations}',g.envido->'declarations' || jsonb_build_array(jsonb_build_object('seat',p_seat,'points',points)));
    else
      phrase:='Son buenas';
      g.envido:=jsonb_set(g.envido,'{declarations}',g.envido->'declarations' || jsonb_build_array(jsonb_build_object('seat',p_seat,'points',null)));
    end if;
    points:=null;
    if dindex=4 then
      winner:=(g.envido->>'high_seat')::integer%2;
      points:=(g.envido->>'value')::integer;
      g.envido:=g.envido || jsonb_build_object('status','resolved','winner_team',winner,'awarded',points,'declare_turn',null);
    else g.envido:=g.envido || jsonb_build_object('declare_index',dindex,'declare_turn',(g.mano+dindex)%4);
    end if;
  when p_action in ('truco','retruco','vale_cuatro') then
    g.truco:=jsonb_build_object('status','pending','value',case p_action when 'truco' then 2 when 'retruco' then 3 else 4 end,'singer',p_seat,'team',p_seat%2);
    phrase:=case p_action when 'truco' then 'Truco' when 'retruco' then 'Retruco' else 'Vale cuatro' end;
  when p_action='truco_yes' then
    g.truco:=g.truco || jsonb_build_object('status','accepted'); phrase:='Quiero';
  when p_action='truco_no' then
    winner:=(g.truco->>'team')::integer; points:=team_internal.stake(g); hand_over:=true;
    g.truco:=g.truco || jsonb_build_object('status','rejected'); phrase:='No quiero';
  when p_action='mazo' then
    winner:=1-p_seat%2; points:=team_internal.stake(g); hand_over:=true; phrase:='Me voy al mazo';
    if g.envido->>'status'='pending' then
      extra:=public._envido_reject_value(g.envido->'chain',g.scores[1],g.scores[2],t.target_score);
    elsif g.envido->>'status'='declaring' then extra:=(g.envido->>'value')::integer;
    end if;
    if extra>0 then
      g.envido:=g.envido || jsonb_build_object('status','mazo','winner_team',winner,'awarded',extra);
      if (g.envido->>'high_seat')::integer%2 is distinct from winner then
        g.envido:=g.envido-'high_seat'-'high';
      end if;
    end if;
    points:=points+extra;
  else raise exception 'Acción inválida';
  end case;
  if points is not null and winner is not null then g.scores[winner+1]:=g.scores[winner+1]+points; end if;
  if hand_over then g.awaiting_deal:=true; g.last_hand_winner:=winner; end if;
  if phrase is not null then g.announcement:=jsonb_build_object('seat',p_seat,'text',phrase,'action',p_action,'at',clock_timestamp()); end if;
  update public.team_games set turn=g.turn,round=g.round,scores=g.scores,played=g.played,rounds=g.rounds,
    envido=g.envido,truco=g.truco,awaiting_deal=g.awaiting_deal,last_hand_winner=g.last_hand_winner,
    announcement=g.announcement,action_started_at=now() where id=p_id;
  if g.scores[1]>=t.target_score or g.scores[2]>=t.target_score then
    perform team_internal.finish(p_id,case when g.scores[1]>=t.target_score then 0 else 1 end,'points');
  elsif hand_over and g.envido->>'status' in ('resolved','mazo') and g.envido->>'high_seat' is not null then
    leader:=(g.envido->>'high_seat')::integer;
    full_cards:=team_internal.full_hand(p_id,leader);
    for c in select value from jsonb_array_elements(public._envido_winning_cards(full_cards)) loop
      if not exists(select 1 from jsonb_array_elements(g.played) x where (x->>'seat')::integer=leader and x->'card'=c) then
        shown:=shown || jsonb_build_array(c);
      end if;
    end loop;
    if jsonb_array_length(shown)>0 then
      update public.team_games set reveal=jsonb_build_object('seat',leader,'cards',shown,'points',(g.envido->>'high')::integer) where id=p_id;
    end if;
  end if;
end;
$$;

-- Decisión pura: no consulta tablas ni recibe manos ajenas. p_roll permite probar
-- que cambiar cartas ocultas no cambia la decisión manteniendo igual información.
create function team_internal.bot_choice(g public.team_games,p_seat integer,p_hand jsonb,p_legal text[],p_roll double precision)
returns jsonb language plpgsql immutable as $$
declare chosen jsonb; strongest integer; team_leads boolean; remaining_rivals integer; n integer; power integer; env integer; a text;
begin
  if 'tengo'=any(p_legal) then return jsonb_build_object('action','tengo'); end if;
  if 'son_buenas'=any(p_legal) then return jsonb_build_object('action','son_buenas'); end if;
  env:=public._envido_points(p_hand || coalesce((select jsonb_agg(x->'card') from jsonb_array_elements(g.played) x where (x->>'seat')::integer=p_seat),'[]'));
  select min((x->>'rank')::integer),sum(15-(x->>'rank')::integer) into strongest,power from jsonb_array_elements(p_hand) x;
  if 'envido_yes'=any(p_legal) then
    a:=case when env>=26 or (env>=22 and p_roll<0.35) then 'envido_yes' else 'envido_no' end;
    if env>=31 and 'real_envido'=any(p_legal) and p_roll<0.5 then a:='real_envido'; end if;
    return jsonb_build_object('action',a);
  end if;
  if 'truco_yes'=any(p_legal) then
    if strongest<=3 and power>=18 and p_roll<0.35 then
      if 'vale_cuatro'=any(p_legal) then return jsonb_build_object('action','vale_cuatro'); end if;
      if 'retruco'=any(p_legal) then return jsonb_build_object('action','retruco'); end if;
    end if;
    return jsonb_build_object('action',case when strongest<=7 or power>=13 or p_roll<0.2 then 'truco_yes' else 'truco_no' end);
  end if;
  if 'envido'=any(p_legal) and (env>=27 or p_roll<0.05) then return jsonb_build_object('action','envido'); end if;
  if 'truco'=any(p_legal) and strongest<=4 and p_roll<0.3 then return jsonb_build_object('action','truco'); end if;
  if strongest<=3 and power>=18 and p_roll<0.2 then
    if 'vale_cuatro'=any(p_legal) then return jsonb_build_object('action','vale_cuatro'); end if;
    if 'retruco'=any(p_legal) then return jsonb_build_object('action','retruco'); end if;
  end if;
  if not ('play'=any(p_legal)) then return null; end if;
  select min((x->'card'->>'rank')::integer),count(*) into strongest,n from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round;
  if n>0 then
    select bool_and((x->>'seat')::integer%2=p_seat%2) into team_leads from jsonb_array_elements(g.played) x
      where (x->>'round')::integer=g.round and (x->'card'->>'rank')::integer=strongest;
    select count(*) into remaining_rivals from generate_series(0,3) s where s%2<>p_seat%2 and not exists(
      select 1 from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round and (x->>'seat')::integer=s);
    if team_leads and (remaining_rivals=0 or strongest<=4) then
      select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer desc limit 1;
    else
      select x into chosen from jsonb_array_elements(p_hand) x where (x->>'rank')::integer<strongest order by (x->>'rank')::integer desc limit 1;
    end if;
  else
    select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer asc limit 1;
  end if;
  if chosen is null then select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer desc limit 1; end if;
  return jsonb_build_object('action','play','card',chosen);
end;
$$;

create function public.team_action(p_table_id uuid,p_request_id uuid,p_version bigint,p_action text,p_seat integer default null,p_card jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.team_tables; me public.team_seats; r team_internal.requests;
  p jsonb; g public.team_games; member_count integer; actor integer; timed integer; choice jsonb; cards jsonb; a text[];
begin
  if uid is null or p_request_id is null or p_version is null or p_action is null then raise exception 'Solicitud inválida'; end if;
  -- Orden fijo: usuario, mesa, perfiles. No hay cambio de identidad para jugar bots.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into t from public.team_tables where id=p_table_id for update;
  if not found then raise exception 'Mesa no disponible'; end if;
  p:=jsonb_build_object('id',p_table_id,'version',p_version,'action',p_action,'seat',p_seat,'card',p_card);
  select * into r from team_internal.requests q where q.actor=uid and q.request_id=p_request_id;
  if found then
    if r.payload<>p then raise exception 'Identificador de solicitud reutilizado'; end if;
    if p_action='leave' and not team_internal.member(p_table_id) then return jsonb_build_object('left',true); end if;
    return team_internal.snapshot(p_table_id);
  end if;
  select * into me from public.team_seats where table_id=p_table_id and user_id=uid;
  if not found then raise exception 'No sos participante'; end if;
  if t.version<>p_version then return team_internal.snapshot(p_table_id) || '{"stale":true}'::jsonb; end if;
  if t.status in ('finished','cancelled') then return team_internal.snapshot(p_table_id); end if;
  if t.status='waiting' then
    case p_action
    when 'seat' then
      if p_seat is null or p_seat not between 0 and 3 then raise exception 'Asiento inválido'; end if;
      if exists(select 1 from public.team_seats where table_id=p_table_id and seat=p_seat and id<>me.id) then raise exception 'Ese asiento ya está ocupado'; end if;
      update public.team_seats set seat=p_seat where id=me.id;
    when 'add_bot' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede agregar bots'; end if;
      if p_seat is null or p_seat not between 0 and 3 then raise exception 'Asiento inválido'; end if;
      select count(*) into member_count from public.team_seats where table_id=p_table_id;
      if member_count>=4 then raise exception 'No quedan lugares'; end if;
      if exists(select 1 from public.team_seats where table_id=p_table_id and seat=p_seat) then raise exception 'Ese asiento ya está ocupado'; end if;
      insert into public.team_seats(table_id,seat,username,paid) values(p_table_id,p_seat,'Bot '||(p_seat+1),t.bet);
    when 'remove_bot' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede quitar bots'; end if;
      delete from public.team_seats where table_id=p_table_id and seat=p_seat and user_id is null;
      if not found then raise exception 'No hay un bot en ese asiento'; end if;
    when 'start' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede comenzar'; end if;
      if (select count(*) from public.team_seats where table_id=p_table_id and seat is not null)<>4 then raise exception 'Faltan jugadores por sentarse'; end if;
      insert into public.team_games(id) values(p_table_id);
      perform team_internal.deal(p_table_id);
      update public.team_tables set status='playing' where id=p_table_id;
    when 'leave' then
      if uid=t.creator_id then perform team_internal.cancel(p_table_id);
      else
        perform team_internal.coins(uid,me.paid);
        delete from public.team_seats where id=me.id;
        update public.team_tables set version=version+1,updated_at=now() where id=p_table_id;
        insert into team_internal.requests values(uid,p_request_id,p_table_id,p);
        return jsonb_build_object('left',true);
      end if;
    else raise exception 'Acción inválida en sala de espera';
    end case;
  else
    select * into g from public.team_games where id=p_table_id;
    if p_action='forfeit' then perform team_internal.finish(p_table_id,1-me.seat%2,'forfeit');
    elsif p_action='tick' then
      if g.awaiting_deal then
        if clock_timestamp()<g.action_started_at+interval '2500 milliseconds' then return team_internal.snapshot(p_table_id); end if;
        perform team_internal.deal(p_table_id);
        update public.team_games set hand_number=hand_number+1,mano=(mano+1)%4,turn=(mano+1)%4,round=1,
          played='[]',rounds='[]',envido='{"status":"none","chain":[]}',truco='{"status":"none","value":1}',
          awaiting_deal=false,reveal=null,announcement=null,action_started_at=now() where id=p_table_id;
      else
        actor:=team_internal.actor(g);
        if clock_timestamp()>=g.action_started_at+make_interval(secs=>t.time_limit) then
          update public.team_seats set timeouts=timeouts+1 where table_id=p_table_id and seat=actor returning timeouts into timed;
          perform team_internal.apply(p_table_id,actor,'mazo');
          update public.team_games set announcement=jsonb_build_object('seat',actor,'text','Sin tiempo · al mazo','action','timeout','at',clock_timestamp()) where id=p_table_id;
          if timed>=3 then perform team_internal.finish(p_table_id,1-actor%2,'timeouts'); end if;
        elsif clock_timestamp()>=g.action_started_at+interval '1200 milliseconds'
          and exists(select 1 from public.team_seats where table_id=p_table_id and seat=actor and user_id is null) then
          select h.cards into cards from public.team_hands h where table_id=p_table_id and seat=actor;
          a:=team_internal.legal(g,actor);
          choice:=team_internal.bot_choice(g,actor,cards,a,random());
          if choice is null then return team_internal.snapshot(p_table_id); end if;
          perform team_internal.apply(p_table_id,actor,choice->>'action',choice->'card');
        else return team_internal.snapshot(p_table_id);
        end if;
      end if;
    else
      if clock_timestamp()>=g.action_started_at+make_interval(secs=>t.time_limit) then raise exception 'Se terminó el tiempo de la jugada'; end if;
      perform team_internal.apply(p_table_id,me.seat,p_action,p_card);
    end if;
  end if;
  update public.team_tables set version=version+1,updated_at=now() where id=p_table_id;
  insert into team_internal.requests values(uid,p_request_id,p_table_id,p);
  return team_internal.snapshot(p_table_id);
end;
$$;

create function public.team_presence(p_table_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  update public.team_seats set last_seen_at=now() where table_id=p_table_id and user_id=auth.uid();
  if not found then raise exception 'No sos participante'; end if;
end;
$$;

create function team_internal.sweep() returns integer
language plpgsql security definer set search_path = '' as $$
declare t record; n integer:=0;
begin
  for t in select * from public.team_tables x where
    (status='waiting' and created_at<now()-interval '15 minutes')
    or (status='playing' and not exists(select 1 from public.team_seats s where s.table_id=x.id
      and s.user_id is not null and s.last_seen_at>now()-interval '10 minutes')) for update skip locked
  loop perform team_internal.cancel(t.id); n:=n+1; end loop;
  return n;
end;
$$;

revoke all on all functions in schema team_internal from public,anon,authenticated;
revoke all on all tables in schema team_internal from public,anon,authenticated;
revoke execute on function public.team_create(uuid,text,integer,integer,integer,boolean),
  public.team_join(uuid,uuid,text),public.team_action(uuid,uuid,bigint,text,integer,jsonb),
  public.team_snapshot(uuid),public.team_lobby(),public.team_presence(uuid) from public,anon;
grant execute on function public.team_create(uuid,text,integer,integer,integer,boolean) to authenticated;
grant execute on function public.team_join(uuid,uuid,text) to authenticated;
grant execute on function public.team_action(uuid,uuid,bigint,text,integer,jsonb) to authenticated;
grant execute on function public.team_snapshot(uuid) to authenticated;
grant execute on function public.team_lobby() to authenticated;
grant execute on function public.team_presence(uuid) to authenticated;

-- Realtime solo anuncia estado público; las manos y solicitudes NO se publican.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='team_tables'
  ) then alter publication supabase_realtime add table public.team_tables; end if;
end $$;
-- En Supabase pg_cron ejecuta el mantenimiento sin depender de pestañas abiertas.
select cron.schedule('sweep_team_tables','*/5 * * * *','select team_internal.sweep()');

commit;
