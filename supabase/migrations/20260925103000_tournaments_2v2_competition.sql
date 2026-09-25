-- PR 4: motor de torneos 2v2. Aplicar después de PR 3; no altera migraciones aplicadas.
begin;

alter table public.team_tables add column tournament_id uuid references public.tournaments(id);
alter table public.team_tables add column tournament_match_id uuid references public.tournament_matches(id);
create unique index team_tables_tournament_match_idx on public.team_tables(tournament_match_id)
  where tournament_match_id is not null;
alter table public.team_tables drop constraint team_tables_bet_check;
alter table public.team_tables add constraint team_tables_bet_check check (
  (bet between 10 and 1000000 and tournament_match_id is null and tournament_id is null)
  or (bet = 0 and tournament_id is not null
    and (tournament_match_id is not null or status='cancelled'))
);

-- Solo un cruce 2v2 activo puede crear la mesa, y sus participantes se fijan
-- en asientos pares e impares al crearla dentro de la misma transacción.
create function tournament_internal.guard_team_table() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m public.tournament_matches; t public.tournaments;
begin
  if new.tournament_match_id is null then return new; end if;
  select * into m from public.tournament_matches where id = new.tournament_match_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if m.id is null or t.mode <> '2v2' or t.status <> 'running'
    or m.status <> 'ready' or m.result_applied_at is not null
    or new.tournament_id is distinct from t.id or new.status <> 'playing'
    or new.bet <> 0 or new.creator_id not in (
      select member.user_id from public.tournament_entry_members member
      where member.entry_id = m.side_a_entry_id and member.status = 'accepted'
    ) then raise exception 'Mesa de torneo inválida'; end if;
  return new;
end; $$;
create trigger tournament_team_table_guard before insert on public.team_tables
  for each row execute function tournament_internal.guard_team_table();

create or replace function tournament_internal.guard_normal_team_seat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_match public.tournament_matches;
begin
  select m.* into v_match from public.team_tables t
    join public.tournament_matches m on m.id = t.tournament_match_id
    where t.id = new.table_id;
  if found then
    if new.user_id is null or new.seat is null or new.paid <> 0 or not exists (
      select 1 from public.tournament_entry_members member
      where member.user_id = new.user_id and member.status = 'accepted'
        and member.entry_id = case when new.seat % 2 = 0
          then v_match.side_a_entry_id else v_match.side_b_entry_id end
    ) then raise exception 'Asiento de torneo inválido'; end if;
  elsif tournament_internal.has_ready_match(new.user_id) then
    raise exception 'Tenés un cruce de torneo listo; entrá primero a esa partida';
  end if;
  return new;
end; $$;

create function tournament_internal.lock_tournament_seats() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.team_tables t
    where t.id = old.table_id and t.tournament_match_id is not null) then
    if tg_op='DELETE' then
      raise exception 'Los asientos del torneo no se pueden cambiar';
    end if;
    if new.user_id is distinct from old.user_id
      or new.seat is distinct from old.seat or new.paid is distinct from old.paid
      or new.table_id is distinct from old.table_id then
      raise exception 'Los asientos del torneo no se pueden cambiar';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger tournament_seat_update_guard before update or delete on public.team_seats
  for each row execute function tournament_internal.lock_tournament_seats();

-- Apuesta cero significa que ni siquiera se toca el saldo o el disparador
-- de economía. La función normal sigue entregando apuestas como siempre.
create function tournament_internal.freeze_teams(p_tournament_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_solos uuid[]; v_first uuid; v_second uuid; v_member uuid;
  v_checkin public.tournament_checkins; i integer;
begin
  -- El orden aleatorio se elige una sola vez; las parejas ya confirmadas no se tocan.
  select array_agg(e.id order by random()) into v_solos
  from public.tournament_entries e where e.tournament_id=p_tournament_id
    and e.status='active' and e.kind='solo';
  if coalesce(cardinality(v_solos),0) > 1 then
    for i in 1..(cardinality(v_solos)/2) loop
      v_first := v_solos[2*i-1]; v_second := v_solos[2*i];
      update public.tournament_entry_members set status='rejected',rejected_at=now()
        where entry_id in (v_first,v_second) and status='pending';
      select user_id into strict v_member from public.tournament_entry_members
        where entry_id=v_second and status='accepted';
      select * into v_checkin from public.tournament_checkins where entry_id=v_second;
      delete from public.tournament_checkins where entry_id=v_second;
      update public.tournament_entry_members set status='replaced', replaced_at=now(),
        replaced_by=v_member where entry_id=v_second and status='accepted';
      update public.tournament_entries set status='replaced', replaced_entry_id=v_first,
        updated_at=now() where id=v_second;
      update public.tournament_entries set kind='team',updated_at=now() where id=v_first;
      insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
        values(p_tournament_id,v_first,v_member,'assigned','accepted',now());
      if v_checkin.entry_id is not null then
        insert into public.tournament_checkins(entry_id,tournament_id,confirmed_by)
          values(v_first,p_tournament_id,v_checkin.confirmed_by)
          on conflict (entry_id) do nothing;
      end if;
      perform tournament_internal.audit(p_tournament_id,p_actor_id,'team_assigned',v_first,
        jsonb_build_object('partner_entry_id',v_second));
    end loop;
  end if;
  if coalesce(cardinality(v_solos),0) % 2 = 1 then
    v_first := v_solos[cardinality(v_solos)];
    delete from public.tournament_checkins where entry_id=v_first;
    update public.tournament_entries set status='waitlisted',updated_at=now(),
      priority_at=least(priority_at,coalesce((select min(priority_at)-interval '1 microsecond'
        from public.tournament_entries where tournament_id=p_tournament_id
          and status='waitlisted'),priority_at)) where id=v_first;
    perform tournament_internal.audit(p_tournament_id,p_actor_id,'unpaired_waitlisted',v_first);
  end if;
end; $$;

-- Diferir hasta el final de la inscripción evita emparejar al capitán en
-- medio de la aceptación de una invitación (antes de cambiar kind a team).
create function tournament_internal.freeze_full_roster() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t public.tournaments;
begin
  if new.status<>'accepted' then return new; end if;
  if pg_trigger_depth()>1 then return new; end if;
  select * into t from public.tournaments where id=new.tournament_id for update;
  if t.mode='2v2' and t.status='published'
    and tournament_internal.active_player_count(t.id,null)=t.capacity then
    perform tournament_internal.freeze_teams(t.id,null);
  end if;
  return new;
end; $$;
create constraint trigger tournament_freeze_full_roster
  after insert or update of status on public.tournament_entry_members
  deferrable initially deferred for each row
  execute function tournament_internal.freeze_full_roster();

create or replace function tournament_internal.start_one(p_tournament_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tournaments;
  v_entries uuid[];
  v_count integer;
  v_group_id uuid;
  v_group integer;
  v_round integer;
  v_pair integer;
  v_indices integer[][] := array[
    array[1,4,2,3], array[1,3,4,2], array[1,2,3,4]
  ];
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.status <> 'published' or t.mode not in ('1v1','2v2')
     or t.roster_frozen_at is not null or now() < t.starts_at then
    raise exception 'El torneo todavía no se puede iniciar';
  end if;

  if t.mode='2v2' then perform tournament_internal.freeze_teams(t.id,p_actor_id); end if;
  -- Reemplazar ausentes por espera en orden estricto. Cada ascenso queda
  -- confirmado: tendrá cinco minutos para entrar a su primer cruce.
  update public.tournament_entries e set status = 'replaced', updated_at = now()
   where e.tournament_id = t.id and e.status = 'active'
     and not exists (select 1 from public.tournament_checkins c where c.entry_id = e.id);
  perform tournament_internal.promote_waitlist(t.id, p_actor_id);
  insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
    select e.id, t.id, m.user_id from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id and m.status = 'accepted'
    where e.tournament_id = t.id and e.status = 'active'
      and not exists (select 1 from public.tournament_checkins c where c.entry_id = e.id)
    on conflict (entry_id) do nothing;

  if t.mode = '2v2' then
    perform tournament_internal.freeze_teams(t.id, p_actor_id);
  end if;
  select array_agg(e.id order by e.draw_seed) into v_entries
    from public.tournament_entries e where e.tournament_id = t.id and e.status = 'active'
      and (t.mode = '1v1' or e.kind = 'team');
  v_count := coalesce(cardinality(v_entries), 0);
  if v_count < 4 then raise exception 'Hacen falta al menos cuatro competidores completos'; end if;
  if t.format = 'groups' and (v_count < 8 or v_count % 4 <> 0) then
    raise exception 'Grupos requiere al menos dos grupos completos de cuatro';
  end if;

  update public.tournaments set status = 'running', roster_frozen_at = now(),
    updated_at = now(), updated_by = coalesce(p_actor_id, updated_by) where id = t.id;
  if t.format = 'knockout' then
    perform tournament_internal.create_bracket(t.id, v_entries, 1::smallint);
  else
    for v_group in 1..v_count/4 loop
      insert into public.tournament_groups(tournament_id, group_number, status)
        values(t.id, v_group, 'running') returning id into v_group_id;
      for v_pair in 1..4 loop
        insert into public.tournament_group_members(group_id, tournament_id, entry_id, position)
        values(v_group_id, t.id, v_entries[(v_group-1)*4+v_pair], v_pair);
      end loop;
      for v_round in 1..3 loop
        for v_pair in 1..2 loop
          insert into public.tournament_matches(
            tournament_id, group_id, phase, round_number, match_number,
            side_a_entry_id, side_b_entry_id
          ) values (
            t.id, v_group_id, 'group', v_round, v_pair,
            v_entries[(v_group-1)*4+v_indices[v_round][(v_pair-1)*2+1]],
            v_entries[(v_group-1)*4+v_indices[v_round][(v_pair-1)*2+2]]
          );
        end loop;
      end loop;
    end loop;
    perform tournament_internal.open_round(t.id, 1::smallint);
  end if;
  perform tournament_internal.audit(t.id, p_actor_id, 'tournament_started', null,
    jsonb_build_object('competitors', v_count, 'format', t.format));
end;
$$;

create or replace function tournament_internal.settle_match(
  p_match_id uuid, p_winner_id uuid, p_score_a integer, p_score_b integer,
  p_reason text, p_game_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.tournament_matches;
  t public.tournaments;
  v_loser uuid;
  v_entry_a uuid;
  v_entry_b uuid;
begin
  select tournament_id into t.id from public.tournament_matches where id = p_match_id;
  if not found then raise exception 'Cruce inexistente'; end if;
  select * into t from public.tournaments where id = t.id for update;
  select * into m from public.tournament_matches where id = p_match_id for update;
  if m.result_applied_at is not null then return; end if;
  if m.status not in ('ready', 'playing', 'pending') or
     p_winner_id not in (m.side_a_entry_id, m.side_b_entry_id) then
    raise exception 'Resultado de torneo invalido';
  end if;
  if p_game_id is not null and (m.status <> 'playing' or (case when t.mode = '2v2' then m.team_game_id else m.game_id end) <> p_game_id) then
    raise exception 'La partida no corresponde al cruce';
  end if;
  v_loser := case when p_winner_id = m.side_a_entry_id then m.side_b_entry_id
                  else m.side_a_entry_id end;
  update public.tournament_matches set
    status = case when p_game_id is null then 'forfeit' else 'finished' end,
    winner_entry_id = p_winner_id, loser_entry_id = v_loser,
    score_a = p_score_a, score_b = p_score_b,
    finish_reason = p_reason, finished_at = now(), result_applied_at = now(),
    updated_at = now(),
    side_a_username = tournament_internal.current_name(m.side_a_entry_id),
    side_b_username = tournament_internal.current_name(m.side_b_entry_id)
  where id = m.id;

  if m.phase = 'group' then
    -- Ausencia: el ganador recibe victoria; no se inventan puntos de juego.
    update public.tournament_group_members gm set
      wins = wins + (case when gm.entry_id = p_winner_id then 1 else 0 end),
      losses = losses + (case when gm.entry_id = v_loser then 1 else 0 end),
      points_for = points_for + (case when gm.entry_id = m.side_a_entry_id then coalesce(p_score_a,0)
                                 else coalesce(p_score_b,0) end),
      points_against = points_against + (case when gm.entry_id = m.side_a_entry_id then coalesce(p_score_b,0)
                                         else coalesce(p_score_a,0) end)
    where gm.group_id = m.group_id and gm.entry_id in (m.side_a_entry_id, m.side_b_entry_id);
  elsif m.phase not in ('semifinal') and v_loser is not null then
    update public.tournament_entries e set status = 'eliminated', updated_at = now()
      where e.id = v_loser and e.status = 'active';
  end if;
  perform tournament_internal.audit(m.tournament_id, null, 'match_settled', p_winner_id,
    jsonb_build_object('match_id', m.id, 'reason', p_reason));
  perform tournament_internal.advance_bracket(m.tournament_id);
end;
$$;

create function tournament_internal.enter_team_match(p_match_id uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; m public.tournament_matches; v_entry uuid;
  v_id uuid := gen_random_uuid(); v_count integer; v_member record;
  v_creator uuid;
begin
  select tournament_id into t.id from public.tournament_matches where id=p_match_id;
  if not found then raise exception 'Cruce no disponible'; end if;
  select * into t from public.tournaments where id=t.id for update;
  select * into m from public.tournament_matches where id=p_match_id for update;
  select member.entry_id into v_entry from public.tournament_entry_members member
    where member.user_id=p_actor and member.status='accepted'
      and member.entry_id in (m.side_a_entry_id,m.side_b_entry_id);
  if t.mode <> '2v2' or t.status <> 'running' or m.status not in ('ready','playing')
    or v_entry is null or not exists(select 1 from public.tournament_entries
      where id=v_entry and status='active') then
    raise exception 'No podés entrar a este cruce';
  end if;
  if m.status='playing' then
    if not exists(select 1 from public.tournament_match_presence
      where match_id=m.id and user_id=p_actor) then
      raise exception 'No entraste dentro del plazo'; end if;
    return jsonb_build_object('match_id',m.id,'team_game_id',m.team_game_id);
  end if;
  if now()>=m.entry_deadline then raise exception 'El plazo de entrada venció'; end if;
  insert into public.tournament_match_presence(match_id,tournament_id,entry_id,user_id)
    values(m.id,t.id,v_entry,p_actor) on conflict(match_id,user_id) do nothing;
  select count(*) into v_count from public.tournament_entry_members mem
    where mem.entry_id in (m.side_a_entry_id,m.side_b_entry_id) and mem.status='accepted';
  if v_count<>4 then raise exception 'El cruce necesita dos equipos completos'; end if;
  select count(*) into v_count from public.tournament_match_presence p
    join public.tournament_entry_members mem on mem.user_id=p.user_id
      and mem.entry_id=p.entry_id and mem.status='accepted'
    where p.match_id=m.id;
  if v_count<4 then return jsonb_build_object('match_id',m.id,'team_game_id',null); end if;

  select user_id into v_creator from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted'
    order by accepted_at,user_id limit 1;
  insert into public.team_tables(id,creator_id,name,bet,target_score,time_limit,
    is_private,private_code,status,tournament_id,tournament_match_id)
    values(v_id,v_creator,left(t.name,60),0,t.target_score,30,true,
      upper(substr(replace(v_id::text,'-',''),1,8)),'playing',t.id,m.id);
  -- Asientos enfrentados pertenecen al mismo equipo: 0 y 2, 1 y 3.
  for v_member in
    select mem.user_id, p.username, p.avatar_url,
      case when mem.entry_id=m.side_a_entry_id then 0 else 1 end +
        2*(row_number() over(partition by mem.entry_id order by mem.accepted_at,mem.user_id)-1) as seat
    from public.tournament_entry_members mem
    join public.profiles p on p.id=mem.user_id
    where mem.entry_id in (m.side_a_entry_id,m.side_b_entry_id)
      and mem.status='accepted'
  loop
    insert into public.team_seats(table_id,user_id,seat,username,avatar_url,paid)
      values(v_id,v_member.user_id,v_member.seat,v_member.username,v_member.avatar_url,0);
  end loop;
  insert into public.team_games(id) values(v_id);
  perform team_internal.deal(v_id);
  update public.tournament_matches set status='playing',team_game_id=v_id,
    started_at=now(),updated_at=now() where id=m.id;
  return jsonb_build_object('match_id',m.id,'team_game_id',v_id);
end; $$;

create function tournament_internal.replace_absent_member(p_match_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare m public.tournament_matches; t public.tournaments; v_side uuid;
  v_missing uuid; v_wait public.tournament_entries; v_new uuid; v_count integer;
begin
  select tournament_id into t.id from public.tournament_matches where id=p_match_id;
  select * into t from public.tournaments where id=t.id for update;
  select * into m from public.tournament_matches where id=p_match_id for update;
  if t.mode<>'2v2' or m.status<>'ready' or m.entry_deadline>now() then return false; end if;
  select count(*) into v_count from public.tournament_entry_members mem
    where mem.entry_id in (m.side_a_entry_id,m.side_b_entry_id)
      and mem.status='accepted' and not exists(
        select 1 from public.tournament_match_presence p
        where p.match_id=m.id and p.user_id=mem.user_id);
  if v_count<>1 then return false; end if;
  select mem.entry_id,mem.user_id into v_side,v_missing
    from public.tournament_entry_members mem
    where mem.entry_id in (m.side_a_entry_id,m.side_b_entry_id)
      and mem.status='accepted' and not exists(
        select 1 from public.tournament_match_presence p
        where p.match_id=m.id and p.user_id=mem.user_id);
  select e.* into v_wait from public.tournament_entries e
    where e.tournament_id=t.id and e.status='waitlisted'
      and e.kind='solo' and (select count(*) from public.tournament_entry_members mem
        where mem.entry_id=e.id and mem.status='accepted')=1
    order by e.priority_at,e.sequence_no limit 1 for update;
  if not found then return false; end if;
  select user_id into v_new from public.tournament_entry_members
    where entry_id=v_wait.id and status='accepted';
  update public.tournament_entry_members set status='replaced',replaced_at=now(),
    replaced_by=v_new where entry_id=v_side and user_id=v_missing and status='accepted';
  update public.tournament_entry_members set status='replaced',replaced_at=now()
    where entry_id=v_wait.id and status='accepted';
  update public.tournament_entries set status='replaced',replaced_entry_id=v_side,
    updated_at=now() where id=v_wait.id;
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
    values(t.id,v_side,v_new,'replacement','accepted',now());
  update public.tournament_matches set entry_deadline=now()+interval '5 minutes',
    updated_at=now() where id=m.id;
  perform tournament_internal.audit(t.id,null,'team_member_replaced',v_side,
    jsonb_build_object('match_id',m.id,'from',v_missing,'to',v_new));
  return true;
end; $$;

create or replace function public.tournament_enter_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_participant();
  t public.tournaments;
  m public.tournament_matches;
  v_entry uuid;
  v_a uuid;
  v_b uuid;
  v_name_a text;
  v_name_b text;
  v_hands record;
  v_game_id uuid := gen_random_uuid();
begin
  select tournament_id into t.id from public.tournament_matches where id = p_match_id;
  if not found then raise exception 'Cruce no disponible'; end if;
  select * into t from public.tournaments where id = t.id for update;
  select * into m from public.tournament_matches where id = p_match_id for update;
  if t.mode = '2v2' then
    return tournament_internal.enter_team_match(p_match_id, v_actor);
  end if;
  select member.entry_id into v_entry from public.tournament_entry_members member
    where member.user_id = v_actor and member.status = 'accepted'
      and member.entry_id in (m.side_a_entry_id, m.side_b_entry_id);
  if not exists (select 1 from public.tournament_entries e
    where e.id = v_entry and e.status = 'active') then
    raise exception 'Esta inscripcion ya no puede jugar';
  end if;
  if v_entry is null or t.mode <> '1v1' or t.status <> 'running'
     or m.status not in ('ready', 'playing') then
    raise exception 'No podes entrar a este cruce';
  end if;
  if m.status = 'playing' then
    if not exists (select 1 from public.tournament_match_presence p
        where p.match_id = m.id and p.user_id = v_actor) then
      raise exception 'No entraste dentro del plazo';
    end if;
    return jsonb_build_object('match_id', m.id, 'game_id', m.game_id);
  end if;
  if now() >= m.entry_deadline then raise exception 'El plazo de entrada vencio'; end if;

  insert into public.tournament_match_presence(match_id, tournament_id, entry_id, user_id)
    values(m.id, t.id, v_entry, v_actor) on conflict (match_id, user_id) do nothing;
  select a.user_id, pa.username into v_a, v_name_a
    from public.tournament_entry_members a join public.profiles pa on pa.id = a.user_id
    where a.entry_id = m.side_a_entry_id and a.status = 'accepted';
  select b.user_id, pb.username into v_b, v_name_b
    from public.tournament_entry_members b join public.profiles pb on pb.id = b.user_id
    where b.entry_id = m.side_b_entry_id and b.status = 'accepted';
  if v_a is null or v_b is null then raise exception 'Plantel del cruce incompleto'; end if;
  if not exists (select 1 from public.tournament_match_presence
    where match_id = m.id and user_id = v_a) or not exists (
      select 1 from public.tournament_match_presence where match_id = m.id and user_id = v_b
    ) then
    return jsonb_build_object('match_id', m.id, 'game_id', null);
  end if;

  -- La partida y las dos manos se crean una sola vez al llegar ambos. Cada
  -- intento usa un ID nuevo si el administrador reabrió el cruce.
  insert into public.tables(id, tournament_match_id, tournament_id, name, creator_id,
    creator_username, opponent_id, opponent_username, bet, is_private,
    status, target_score, time_limit)
  values(v_game_id, m.id, t.id, t.name, v_a, v_name_a, v_b, v_name_b,
    0, true, 'playing', t.target_score, 30);
  select * into v_hands from public._deal_hands();
  insert into public.games(id, tournament_match_id, player1_id, player2_id, player1_username,
    player2_username, current_turn, mano_player, bet, target_score,
    time_limit, turn_started_at)
  values(v_game_id, m.id, v_a, v_b, v_name_a, v_name_b, v_a, v_a,
    0, t.target_score, 30, now());
  insert into public.game_hands(game_id, player_id, cards)
    values (v_game_id, v_a, v_hands.h1), (v_game_id, v_b, v_hands.h2);
  update public.tournament_matches set status = 'playing', game_id = v_game_id,
    started_at = now(), updated_at = now() where id = m.id;
  return jsonb_build_object('match_id', m.id, 'game_id', v_game_id);
end;
$$;

create or replace function tournament_internal.advance_due()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  t record;
  m public.tournament_matches;
  v_a boolean;
  v_b boolean;
  v_count integer := 0;
  v_expected_a integer;
  v_expected_b integer;
  v_present_a integer;
  v_present_b integer;
begin
  for t in select id from public.tournaments
     where status = 'published' and mode in ('1v1','2v2') and starts_at <= now()
     order by starts_at loop
    if tournament_internal.active_player_count(t.id) = (
      select capacity from public.tournaments where id = t.id
    ) then
      begin
        perform tournament_internal.start_one(t.id, null);
        v_count := v_count + 1;
      exception when raise_exception then
        -- Si los no-show dejaron menos de cuatro, espera decisión del admin.
        null;
      end;
    end if;
  end loop;
  for m in select match_due.* from public.tournament_matches match_due
     join public.tournaments tournament_due on tournament_due.id = match_due.tournament_id
     where match_due.status = 'ready' and match_due.entry_deadline <= now()
       and tournament_due.status = 'running'
     order by entry_deadline loop
    perform 1 from public.tournaments where id = m.tournament_id for update;
    select * into m from public.tournament_matches where id = m.id for update;
    if m.status <> 'ready' or m.entry_deadline > now() then continue; end if;
    if exists(select 1 from public.tournaments where id=m.tournament_id and mode='2v2') then
      perform tournament_internal.replace_absent_member(m.id);
      select * into m from public.tournament_matches where id=m.id;
      select count(*) into v_present_a from public.tournament_match_presence p
        where p.match_id=m.id and p.entry_id=m.side_a_entry_id;
      select count(*) into v_present_b from public.tournament_match_presence p
        where p.match_id=m.id and p.entry_id=m.side_b_entry_id;
      select count(*) into v_expected_a from public.tournament_entry_members e
        where e.entry_id=m.side_a_entry_id and e.status='accepted';
      select count(*) into v_expected_b from public.tournament_entry_members e
        where e.entry_id=m.side_b_entry_id and e.status='accepted';
      v_a := v_present_a = v_expected_a and v_expected_a = 2;
      v_b := v_present_b = v_expected_b and v_expected_b = 2;
      if m.entry_deadline > now() then continue; end if;
    else
    select exists(select 1 from public.tournament_match_presence p
       where p.match_id = m.id and p.entry_id = m.side_a_entry_id),
      exists(select 1 from public.tournament_match_presence p
       where p.match_id = m.id and p.entry_id = m.side_b_entry_id)
    into v_a, v_b;
    end if;
    if v_a <> v_b then
      perform tournament_internal.settle_match(m.id,
        case when v_a then m.side_a_entry_id else m.side_b_entry_id end,
        null, null, 'absence');
    else
      update public.tournament_matches set status = 'pending',
        finish_reason = 'attendance_review', updated_at = now()
        where id = m.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- El evento único por persona separa misiones 2v2 de objective_game_events,
-- cuya FK apunta a games 1v1. Las misiones de torneo cuentan como humanas.
create table tournament_internal.team_objective_events (
  team_game_id uuid not null references public.team_games(id),
  profile_id uuid not null references public.profiles(id),
  won boolean not null,
  progress_delta jsonb not null default '[]'::jsonb,
  streak_event text not null default 'unchanged',
  primary key(team_game_id,profile_id)
);
alter table tournament_internal.team_objective_events enable row level security;
revoke all on tournament_internal.team_objective_events from public,anon,authenticated;

create function tournament_internal.record_team_objectives(p_game uuid,p_user uuid,p_won boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_week date; v_delta jsonb := '[]'::jsonb; v_step integer; v_old integer;
  v_new integer; v_streak public.profile_activity_streaks; v_streak_event text := 'unchanged';
  v_partner uuid; r record;
begin
  insert into tournament_internal.team_objective_events(team_game_id,profile_id,won)
    values(p_game,p_user,p_won) on conflict do nothing;
  if not found then return; end if;
  v_week := v_day-(extract(isodow from v_day)::integer-1);
  perform public._ensure_objectives(p_user,v_day);
  for r in select a.template_slug,a.progress,a.reward_amount_snapshot,
      d.name,d.event_type,d.target_value from public.daily_mission_assignments a
      join public.daily_mission_templates d on d.slug=a.template_slug
      where a.profile_id=p_user and a.local_date=v_day for update of a
  loop
    v_step := case when r.event_type = 'game_finished'
      or (r.event_type='human_game_won' and p_won) then 1 else 0 end;
    if v_step=0 or r.progress>=r.target_value then continue; end if;
    v_old:=r.progress; v_new:=least(r.target_value,v_old+v_step);
    update public.daily_mission_assignments set progress=v_new,
      completed_at=case when v_new>=r.target_value then coalesce(completed_at,now())
        else completed_at end
      where profile_id=p_user and local_date=v_day and template_slug=r.template_slug;
    v_delta:=v_delta || jsonb_build_array(jsonb_build_object(
      'type','daily','identifier',r.template_slug,'name',r.name,
      'previous',v_old,'current',v_new,'target',r.target_value,
      'reward',r.reward_amount_snapshot,'mode','privada',
      'completed',v_new>=r.target_value,'newly_completed',v_new>=r.target_value));
  end loop;
  select c.*,p.progress as player_progress into r
    from public.weekly_challenges c join public.weekly_challenge_progress p
      on p.week_start=c.week_start
    where c.week_start=v_week and p.profile_id=p_user for update of p;
  if found and r.player_progress<r.target_value_snapshot then
    v_step:=case when r.event_type_snapshot='game_finished'
      or (r.event_type_snapshot='game_won' and p_won) then 1 else 0 end;
    if r.event_type_snapshot='human_unique_opponent' then
      -- De los dos rivales se usa una identidad estable para la misión única.
      select min(s.user_id) into v_partner from public.team_seats s
        join public.team_seats mine on mine.table_id=s.table_id
          and mine.user_id=p_user and s.seat%2<>mine.seat%2
        where s.table_id=p_game;
      if v_partner is not null then
        insert into public.weekly_challenge_uniques(profile_id,week_start,unique_key)
          values(p_user,v_week,v_partner) on conflict do nothing;
        get diagnostics v_step = row_count;
      end if;
    end if;
    if v_step>0 then
      v_old:=r.player_progress;
      v_new:=least(r.target_value_snapshot,v_old+v_step);
      update public.weekly_challenge_progress set progress=v_new,
        completed_at=case when v_new>=r.target_value_snapshot
          then coalesce(completed_at,now()) else completed_at end
        where profile_id=p_user and week_start=v_week;
      v_delta:=v_delta || jsonb_build_array(jsonb_build_object(
        'type','weekly','identifier',r.template_slug,'name',r.name_snapshot,
        'previous',v_old,'current',v_new,'target',r.target_value_snapshot,
        'reward',r.reward_amount_snapshot,'mode','privada',
        'completed',v_new>=r.target_value_snapshot,'newly_completed',v_new>=r.target_value_snapshot));
    end if;
  end if;
  insert into public.profile_activity_streaks(profile_id,current_streak_days,
    longest_streak_days,last_active_local_date,updated_at)
    values(p_user,1,1,v_day,now()) on conflict(profile_id) do nothing;
  if found then v_streak_event:='started';
  else
    select * into v_streak from public.profile_activity_streaks
      where profile_id=p_user for update;
    if v_streak.last_active_local_date=v_day then v_streak_event:='unchanged';
    elsif v_streak.last_active_local_date=v_day-1 then
      update public.profile_activity_streaks set
        current_streak_days=current_streak_days+1,
        longest_streak_days=greatest(longest_streak_days,current_streak_days+1),
        last_active_local_date=v_day,updated_at=now() where profile_id=p_user;
      v_streak_event:='continued';
    elsif v_streak.last_active_local_date=v_day-2
      and (v_streak.protection_week_start is distinct from v_week
        or v_streak.protection_used_at is null) then
      update public.profile_activity_streaks set
        current_streak_days=current_streak_days+1,
        longest_streak_days=greatest(longest_streak_days,current_streak_days+1),
        last_active_local_date=v_day,protection_week_start=v_week,
        protection_used_at=now(),updated_at=now() where profile_id=p_user;
      v_streak_event:='protection_used';
    else
      update public.profile_activity_streaks set current_streak_days=1,
        longest_streak_days=greatest(longest_streak_days,1),
        last_active_local_date=v_day,updated_at=now() where profile_id=p_user;
      v_streak_event:='reset';
    end if;
  end if;
  update tournament_internal.team_objective_events set progress_delta=v_delta,
    streak_event=v_streak_event where team_game_id=p_game and profile_id=p_user;
end; $$;

create function tournament_internal.on_team_game_finished()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.tournament_matches; t public.team_tables; s record;
begin
  if new.winner_team is null or old.winner_team is not null then return new; end if;
  select * into m from public.tournament_matches where team_game_id=new.id;
  if not found then return new; end if;
  select * into t from public.team_tables where id=new.id;
  if t.bet<>0 or t.tournament_match_id is distinct from m.id
    or (select count(*) from public.team_seats where table_id=new.id
      and user_id is not null and seat is not null and paid=0)<>4 then
    raise exception 'Partida 2v2 de torneo inválida'; end if;
  perform tournament_internal.settle_match(m.id,
    case when new.winner_team=0 then m.side_a_entry_id else m.side_b_entry_id end,
    new.scores[1],new.scores[2],'played',new.id);
  for s in select user_id,seat from public.team_seats
    where table_id=new.id and user_id is not null order by user_id loop
    update public.profiles set games_played=games_played+1,
      games_won=games_won+case when s.seat%2=new.winner_team then 1 else 0 end,
      games_lost=games_lost+case when s.seat%2=new.winner_team then 0 else 1 end
      where id=s.user_id;
    perform tournament_internal.record_team_objectives(new.id,s.user_id,
      s.seat%2=new.winner_team);
  end loop;
  return new;
end; $$;
create trigger tournament_team_game_finished after update of winner_team on public.team_games
  for each row execute function tournament_internal.on_team_game_finished();
create or replace function team_internal.finish(p_id uuid,p_winner integer,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.team_tables; s record;
begin
  select * into t from public.team_tables where id=p_id for update;
  if t.status<>'playing' then return; end if;
  if p_winner not in (0,1) or p_winner is null then raise exception 'Equipo inválido'; end if;
  update public.team_tables set status='finished' where id=p_id;
  update public.team_games set winner_team=p_winner,finish_reason=p_reason,awaiting_deal=false where id=p_id;
  if t.bet > 0 then
    for s in select user_id from public.team_seats where table_id=p_id and seat%2=p_winner and user_id is not null order by user_id loop
      perform team_internal.coins(s.user_id,t.bet*2);
    end loop;
  end if;
end;
$$;

create function tournament_internal.on_team_cancelled() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status='cancelled' and old.status<>'cancelled'
    and new.tournament_match_id is not null then
    update public.tournament_matches set status='pending',
      finish_reason='attendance_review',ready_at=null,entry_deadline=null,
      updated_at=now() where id=new.tournament_match_id and result_applied_at is null;
  end if;
  return new;
end; $$;
create trigger tournament_team_cancelled after update of status on public.team_tables
  for each row execute function tournament_internal.on_team_cancelled();

create or replace function public.tournament_admin_retry_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  m public.tournament_matches;
  t public.tournaments;
begin
  select tournament_id into t.id from public.tournament_matches where id = p_match_id;
  if not found then raise exception 'Cruce no disponible'; end if;
  select * into t from public.tournaments where id = t.id for update;
  select * into m from public.tournament_matches where id = p_match_id for update;
  if t.status <> 'running' or m.status <> 'pending'
     or m.finish_reason <> 'attendance_review' then
    raise exception 'Solo se puede reabrir un cruce detenido por ausencia';
  end if;
  if m.game_id is not null then
    if not exists(select 1 from public.games g where g.id = m.game_id
      and g.status = 'finished' and g.winner_id is null) then
      raise exception 'La partida no esta anulada';
    end if;
    -- games.id referencia tables.id con borrado en cascada. Conservar la mesa
    -- cerrada mantiene la partida anulada y libera el índice del cruce.
    update public.tables set tournament_match_id = null, status = 'finished'
      where id = m.game_id;
    update public.tournament_matches set game_id = null where id = m.id;
  end if;
  if m.team_game_id is not null then
    if not exists(select 1 from public.team_tables team
      where team.id=m.team_game_id and team.status='cancelled') then
      raise exception 'La partida de parejas no está anulada'; end if;
    update public.team_tables set tournament_match_id=null where id=m.team_game_id;
    update public.tournament_matches set team_game_id=null where id=m.id;
  end if;
  delete from public.tournament_match_presence where match_id = m.id;
  update public.tournament_matches set status = 'ready', finish_reason = null,
    ready_at = now(), entry_deadline = now() + interval '5 minutes',
    started_at = null, updated_at = now() where id = m.id;
  perform tournament_internal.audit(t.id, v_actor, 'match_reopened', null,
    jsonb_build_object('match_id', m.id));
  return jsonb_build_object('match_id', m.id);
end;
$$;

create or replace function tournament_internal.current_name(p_entry_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select string_agg(p.username,' + ' order by member.accepted_at,member.user_id)
  from public.tournament_entry_members member
  join public.profiles p on p.id=member.user_id
  where member.entry_id=p_entry_id and member.status='accepted';
$$;

create or replace function public.tournament_detail(p_tournament_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  t public.tournaments;
begin
  if v_user_id is null then raise exception 'Necesitas iniciar sesion'; end if;
  v_is_admin := tournament_internal.is_admin(v_user_id);
  select * into t from public.tournaments where id = p_tournament_id;
  if not found or (t.published_at is null and not v_is_admin) then
    raise exception 'Torneo no disponible'; end if;
  return jsonb_build_object(
    'tournament', to_jsonb(t) - 'created_by' - 'updated_by',
    'active_players', tournament_internal.active_player_count(t.id, null),
    'participants', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'kind', e.kind, 'status', e.status,
      'checked_in', exists(select 1 from public.tournament_checkins c where c.entry_id = e.id),
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', mem.user_id, 'username', p.username, 'avatar_url', p.avatar_url)
        order by mem.created_at) from public.tournament_entry_members mem
        join public.profiles p on p.id = mem.user_id
        where mem.entry_id = e.id and mem.status = 'accepted'), '[]'::jsonb)
    ) order by e.priority_at, e.sequence_no) from public.tournament_entries e
      where e.tournament_id = t.id and e.status = 'active'), '[]'::jsonb),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'kind', e.kind,
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', mem.user_id, 'username', p.username, 'avatar_url', p.avatar_url)
        order by mem.created_at) from public.tournament_entry_members mem
        join public.profiles p on p.id = mem.user_id
        where mem.entry_id = e.id and mem.status = 'accepted'), '[]'::jsonb)
    ) order by e.priority_at, e.sequence_no) from public.tournament_entries e
      where e.tournament_id = t.id and e.status = 'waitlisted'), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(to_jsonb(g) order by g.group_number)
      from public.tournament_groups g where g.tournament_id = t.id), '[]'::jsonb),
    'group_members', coalesce((select jsonb_agg(to_jsonb(gm) || jsonb_build_object(
      'rank', array_position(tournament_internal.group_order(g.id), gm.entry_id))
      order by g.group_number, array_position(tournament_internal.group_order(g.id), gm.entry_id))
      from public.tournament_group_members gm join public.tournament_groups g on g.id = gm.group_id
      where gm.tournament_id = t.id), '[]'::jsonb),
    'competition_entries', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'username', tournament_internal.current_name(e.id),
      'avatar_url', (select p.avatar_url from public.tournament_entry_members mem
        join public.profiles p on p.id=mem.user_id
        where mem.entry_id=e.id and mem.status='accepted'
        order by mem.accepted_at,mem.user_id limit 1),
      'status', e.status) order by e.sequence_no)
      from public.tournament_entries e where e.tournament_id=t.id
        and exists(select 1 from public.tournament_entry_members mem
          where mem.entry_id=e.id and mem.status='accepted')), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object(
      'side_a_username', coalesce(m.side_a_username,
        tournament_internal.current_name(m.side_a_entry_id)),
      'side_b_username', coalesce(m.side_b_username,
        tournament_internal.current_name(m.side_b_entry_id)))
      order by m.round_number, m.phase, m.match_number)
      from public.tournament_matches m where m.tournament_id = t.id), '[]'::jsonb),
    'admin_entries', case when v_is_admin then coalesce((
      select jsonb_agg(jsonb_build_object(
        'entry', to_jsonb(e), 'members', coalesce((
          select jsonb_agg(to_jsonb(mem) order by mem.created_at)
          from public.tournament_entry_members mem where mem.entry_id = e.id
        ), '[]'::jsonb)) order by e.priority_at, e.sequence_no)
      from public.tournament_entries e where e.tournament_id = t.id
    ), '[]'::jsonb) else null end
  );
end;
$$;

create or replace function public.get_my_objectives(p_game_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_week_start date;
  v_daily jsonb;
  v_weekly jsonb;
  v_streak jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_coins integer;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if not exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = v_uid
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
  ) then
    raise exception 'perfil no encontrado';
  end if;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);
  perform public._ensure_objectives(v_uid, v_today);

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'daily',
    'identifier', a.template_slug,
    'name', t.name,
    'description', t.description,
    'category', t.category,
    'difficulty', t.difficulty,
    'progress', least(a.progress, t.target_value),
    'target', t.target_value,
    'reward', a.reward_amount_snapshot,
    'completed_at', a.completed_at,
    'claimed_at', a.claimed_at,
    'status', case when a.claimed_at is not null then 'claimed'
                   when a.completed_at is not null then 'ready'
                   else 'in_progress' end,
    'ends_label', 'Termina hoy'
  ) order by case t.category when 'participation' then 1 when 'competition' then 2 else 3 end), '[]'::jsonb)
    into v_daily
    from public.daily_mission_assignments a
    join public.daily_mission_templates t on t.slug = a.template_slug
   where a.profile_id = v_uid and a.local_date = v_today;

  select jsonb_build_object(
    'type', 'weekly',
    'identifier', c.template_slug,
    'name', c.name_snapshot,
    'description', c.description_snapshot,
    'category', 'weekly',
    'difficulty', 'weekly',
    'progress', least(p.progress, c.target_value_snapshot),
    'target', c.target_value_snapshot,
    'reward', c.reward_amount_snapshot,
    'completed_at', p.completed_at,
    'claimed_at', p.claimed_at,
    'status', case when p.claimed_at is not null then 'claimed'
                   when p.completed_at is not null then 'ready'
                   else 'in_progress' end,
    'ends_label', 'Termina el domingo'
  ) into v_weekly
    from public.weekly_challenges c
    join public.weekly_challenge_progress p on p.week_start = c.week_start
   where c.week_start = v_week_start and p.profile_id = v_uid;

  select jsonb_build_object(
    'current_days', coalesce(s.current_streak_days, 0),
    'longest_days', coalesce(s.longest_streak_days, 0),
    'last_active_date', s.last_active_local_date,
    'protection_available', s.protection_week_start is distinct from v_week_start
                            or s.protection_used_at is null,
    'protection_used', s.protection_week_start = v_week_start
                       and s.protection_used_at is not null
  ) into v_streak
    from public.profile_activity_streaks s where s.profile_id = v_uid;
  v_streak := coalesce(v_streak, jsonb_build_object(
    'current_days', 0, 'longest_days', 0, 'last_active_date', null,
    'protection_available', true, 'protection_used', false
  ));

  if p_game_id is not null then
    select e.progress_delta into v_recent
      from public.objective_game_events e
     where e.game_id = p_game_id and e.profile_id = v_uid;
    if v_recent is null then
      select e.progress_delta into v_recent
        from tournament_internal.team_objective_events e
        where e.team_game_id=p_game_id and e.profile_id=v_uid;
    end if;
    v_recent := coalesce(v_recent, '[]'::jsonb);
  end if;

  select p.coins into v_coins from public.profiles p where p.id = v_uid;

  return jsonb_build_object(
    'generated_at', now(),
    'local_date', v_today,
    'day_ends_at', (v_today + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires',
    'week_start', v_week_start,
    'week_ends_at', (v_week_start + 7)::timestamp at time zone 'America/Argentina/Buenos_Aires',
    'daily', v_daily,
    'weekly', v_weekly,
    'streak', v_streak,
    'coins', v_coins,
    'recent_progress', v_recent,
    'streak_event', case when p_game_id is null then 'unchanged' else coalesce((
      select streak_event from (
        select e.streak_event from public.objective_game_events e
          where e.game_id=p_game_id and e.profile_id=v_uid
        union all
        select e.streak_event from tournament_internal.team_objective_events e
          where e.team_game_id=p_game_id and e.profile_id=v_uid
      ) events limit 1
    ), 'unchanged') end
  );
end;
$function$;

create function tournament_internal.replace_one_player(
  p_tournament_id uuid, p_outgoing_entry_id uuid, p_waitlist_entry_id uuid,
  v_actor uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.tournaments;
  v_old_user uuid;
  v_new_user uuid;
begin
  if p_outgoing_entry_id = p_waitlist_entry_id then raise exception 'Elegí otro jugador'; end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.mode not in ('1v1','2v2') or t.status not in ('published', 'running') then
    raise exception 'Torneo no disponible'; end if;
  if not exists(select 1 from public.tournament_entries e where e.id = p_outgoing_entry_id
      and e.tournament_id = t.id and e.status = 'active')
    or not exists(select 1 from public.tournament_entries e where e.id = p_waitlist_entry_id
      and e.tournament_id = t.id and e.status = 'waitlisted') then
    raise exception 'El reemplazo requiere un titular y alguien en espera';
  end if;
  if exists(select 1 from public.tournament_matches m
    where m.tournament_id = t.id and m.status = 'playing'
      and p_outgoing_entry_id in (m.side_a_entry_id, m.side_b_entry_id)) then
    raise exception 'No se puede reemplazar mientras juega una partida';
  end if;
  select user_id into v_old_user from public.tournament_entry_members
    where entry_id = p_outgoing_entry_id and status = 'accepted';
  select user_id into v_new_user from public.tournament_entry_members
    where entry_id = p_waitlist_entry_id and status = 'accepted';
  if v_old_user is null or v_new_user is null then raise exception 'Plantel invalido'; end if;
  update public.tournament_entry_members set status = 'replaced',
    replaced_at = now(), replaced_by = v_new_user
    where entry_id in (p_outgoing_entry_id, p_waitlist_entry_id) and status = 'accepted';
  update public.tournament_entries set status = 'replaced', updated_at = now()
    where id = p_waitlist_entry_id;
  insert into public.tournament_entry_members(tournament_id, entry_id,
    user_id, role, status, accepted_at)
    values(t.id, p_outgoing_entry_id, v_new_user, 'replacement', 'accepted', now());
  insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by, confirmed_at)
    values(p_outgoing_entry_id, t.id, v_new_user, now())
    on conflict (entry_id) do update
      set confirmed_by = excluded.confirmed_by,
          confirmed_at = excluded.confirmed_at;
  delete from public.tournament_match_presence where tournament_id = t.id
    and entry_id = p_outgoing_entry_id and match_id in (
      select id from public.tournament_matches where status = 'ready'
    );
  perform tournament_internal.audit(t.id, v_actor, 'entry_replaced', p_outgoing_entry_id,
    jsonb_build_object('from', v_old_user, 'to', v_new_user));
  return tournament_internal.admin_snapshot(t.id);
end;
$$;

create or replace function public.tournament_admin_replace(
  p_tournament_id uuid,p_outgoing_entry_id uuid,p_waitlist_entry_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := tournament_internal.require_admin();
  t public.tournaments; v_in public.tournament_entries; v_out public.tournament_entries;
  v_member record;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.status not in ('published','running') then
    raise exception 'Torneo no disponible'; end if;
  if t.mode='1v1' or (exists(select 1 from public.tournament_entries
      where id=p_outgoing_entry_id and tournament_id=t.id and kind='solo')
    and exists(select 1 from public.tournament_entries
      where id=p_waitlist_entry_id and tournament_id=t.id and kind='solo')) then
    return tournament_internal.replace_one_player(
      p_tournament_id,p_outgoing_entry_id,p_waitlist_entry_id,v_actor);
  end if;
  select * into v_out from public.tournament_entries where id=p_outgoing_entry_id
    and tournament_id=t.id and status='active' and kind='team' for update;
  select * into v_in from public.tournament_entries where id=p_waitlist_entry_id
    and tournament_id=t.id and status='waitlisted' and kind='team' for update;
  if v_out.id is null or v_in.id is null then
    raise exception 'Elegí una pareja activa y una pareja en espera'; end if;
  if exists(select 1 from public.tournament_matches m where m.tournament_id=t.id
    and m.status='playing' and v_out.id in (m.side_a_entry_id,m.side_b_entry_id)) then
    raise exception 'Esperá a que termine la partida en curso'; end if;
  if (select count(*) from public.tournament_entry_members
    where entry_id=v_in.id and status='accepted')<>2 then
    raise exception 'La pareja de espera está incompleta'; end if;
  delete from public.tournament_checkins where entry_id=v_in.id;
  update public.tournament_entry_members set status='replaced',replaced_at=now()
    where entry_id in (v_out.id,v_in.id) and status='accepted';
  update public.tournament_entries set status='replaced',replaced_entry_id=v_out.id,
    updated_at=now() where id=v_in.id;
  for v_member in select user_id from public.tournament_entry_members
    where entry_id=v_in.id and status='replaced' order by accepted_at,user_id loop
    insert into public.tournament_entry_members(tournament_id,entry_id,user_id,
      role,status,accepted_at)
      values(t.id,v_out.id,v_member.user_id,'replacement','accepted',now());
  end loop;
  if t.status='running' or now()>=t.starts_at then
    insert into public.tournament_checkins(entry_id,tournament_id,confirmed_by)
      values(v_out.id,t.id,(select user_id from public.tournament_entry_members
        where entry_id=v_out.id and status='accepted' limit 1))
      on conflict(entry_id) do update set confirmed_by=excluded.confirmed_by,
        confirmed_at=now();
  else
    delete from public.tournament_checkins where entry_id=v_out.id;
  end if;
  delete from public.tournament_match_presence where tournament_id=t.id
    and entry_id=v_out.id and match_id in (
      select id from public.tournament_matches where tournament_id=t.id and status='ready');
  perform tournament_internal.audit(t.id,v_actor,'team_replaced',v_out.id,
    jsonb_build_object('incoming_entry',v_in.id));
  return tournament_internal.admin_snapshot(t.id);
end; $$;

create function public.tournament_admin_replace_team_member(
  p_tournament_id uuid,p_outgoing_entry_id uuid,p_outgoing_user_id uuid,
  p_waitlist_entry_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := tournament_internal.require_admin();
  t public.tournaments; v_new uuid;
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.mode<>'2v2' or t.status not in ('published','running')
    or not exists(select 1 from public.tournament_entries
      where id=p_outgoing_entry_id and tournament_id=t.id
        and status='active' and kind='team')
    or not exists(select 1 from public.tournament_entry_members
      where entry_id=p_outgoing_entry_id and user_id=p_outgoing_user_id
        and status='accepted')
    or not exists(select 1 from public.tournament_entries
      where id=p_waitlist_entry_id and tournament_id=t.id
        and status='waitlisted' and kind='solo') then
    raise exception 'El reemplazo necesita un integrante activo y un jugador solo en espera';
  end if;
  if exists(select 1 from public.tournament_matches m where m.tournament_id=t.id
    and m.status='playing'
    and p_outgoing_entry_id in (m.side_a_entry_id,m.side_b_entry_id)) then
    raise exception 'Esperá a que termine la partida en curso'; end if;
  select user_id into v_new from public.tournament_entry_members
    where entry_id=p_waitlist_entry_id and status='accepted';
  if v_new is null or (select count(*) from public.tournament_entry_members
    where entry_id=p_waitlist_entry_id and status='accepted')<>1 then
    raise exception 'El jugador de espera no está disponible'; end if;
  delete from public.tournament_checkins where entry_id=p_waitlist_entry_id;
  update public.tournament_entry_members set status='replaced',replaced_at=now(),
    replaced_by=v_new where entry_id=p_outgoing_entry_id
      and user_id=p_outgoing_user_id and status='accepted';
  update public.tournament_entry_members set status='replaced',replaced_at=now()
    where entry_id=p_waitlist_entry_id and status='accepted';
  update public.tournament_entries set status='replaced',
    replaced_entry_id=p_outgoing_entry_id,updated_at=now() where id=p_waitlist_entry_id;
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,
    role,status,accepted_at)
    values(t.id,p_outgoing_entry_id,v_new,'replacement','accepted',now());
  if t.status='running' or now()>=t.starts_at then
    insert into public.tournament_checkins(entry_id,tournament_id,confirmed_by)
      values(p_outgoing_entry_id,t.id,v_new)
      on conflict(entry_id) do nothing;
  end if;
  delete from public.tournament_match_presence where tournament_id=t.id
    and user_id=p_outgoing_user_id and match_id in (
      select id from public.tournament_matches where tournament_id=t.id and status='ready');
  perform tournament_internal.audit(t.id,v_actor,'team_member_replaced',
    p_outgoing_entry_id,jsonb_build_object('from',p_outgoing_user_id,'to',v_new));
  return tournament_internal.admin_snapshot(t.id);
end; $$;

revoke execute on all functions in schema tournament_internal from public,anon,authenticated;
revoke all on all tables in schema tournament_internal from public,anon,authenticated;
revoke execute on function public.tournament_admin_replace_team_member(uuid,uuid,uuid,uuid)
  from public,anon;
grant execute on function public.tournament_admin_replace_team_member(uuid,uuid,uuid,uuid)
  to authenticated;
commit;
