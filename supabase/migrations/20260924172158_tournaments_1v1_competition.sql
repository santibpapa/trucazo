-- PR 3: competencia 1v1. Aplicar después de los PR 1 y 2.
begin;

-- La mesa pertenece a un solo cruce; las escrituras del cliente siguen pasando
-- por RPC. Evita también que un INSERT directo fabrique una mesa sin apuesta.
alter table public.tables add column tournament_match_id uuid
  references public.tournament_matches(id);
alter table public.tables add column tournament_id uuid references public.tournaments(id);
-- Un cruce reabierto puede tener varias partidas históricas anuladas, pero
-- solo una mesa activa. Cada intento conserva su propia identidad.
alter table public.games add column tournament_match_id uuid
  references public.tournament_matches(id);
alter table public.tournament_matches
  add column side_a_username text,
  add column side_b_username text;
create unique index tables_tournament_match_idx on public.tables(tournament_match_id)
  where tournament_match_id is not null;
revoke insert on public.tables from public, anon, authenticated;
-- El rebuild local vuelve a otorgar privilegios amplios al final; RLS sigue
-- cerrando el INSERT directo. Todas las mesas reales se crean por RPC definer.
drop policy if exists "Los usuarios autenticados pueden crear mesas" on public.tables;

create function tournament_internal.has_ready_match(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tournament_matches m
    join public.tournaments t on t.id = m.tournament_id
    join public.tournament_entry_members member
      on member.entry_id in (m.side_a_entry_id, m.side_b_entry_id)
    join public.tournament_entries e on e.id = member.entry_id
    where member.user_id = p_user_id and member.status = 'accepted'
      and e.status = 'active'
      and m.status = 'ready' and t.status = 'running'
  );
$$;

create function tournament_internal.guard_normal_table()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_match public.tournament_matches;
begin
  if new.tournament_match_id is not null then
    select * into v_match from public.tournament_matches where id = new.tournament_match_id;
    if not found or v_match.status <> 'ready' or new.bet <> 0 or not new.is_private
       or new.status <> 'playing'
       or new.tournament_id is distinct from v_match.tournament_id
       or new.creator_id is distinct from (
         select member.user_id from public.tournament_entry_members member
         where member.entry_id = v_match.side_a_entry_id and member.status = 'accepted'
       ) or new.opponent_id is distinct from (
         select member.user_id from public.tournament_entry_members member
         where member.entry_id = v_match.side_b_entry_id and member.status = 'accepted'
       ) then
      raise exception 'Mesa de torneo invalida';
    end if;
  elsif (tg_op = 'INSERT' or new.creator_id is distinct from old.creator_id
         or new.opponent_id is distinct from old.opponent_id)
     and (tournament_internal.has_ready_match(new.creator_id)
          or tournament_internal.has_ready_match(new.opponent_id)) then
    raise exception 'Tenes un cruce de torneo listo. Entra desde el torneo.';
  end if;
  return new;
end;
$$;
create trigger guard_normal_table_before_write
  before insert or update of creator_id, opponent_id on public.tables
  for each row execute function tournament_internal.guard_normal_table();

-- team_seats cubre también la unión a una mesa 2v2 normal. No cambia el
-- motor competitivo 2v2, que se incorpora recién en PR 4.
create function tournament_internal.guard_normal_team_seat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tournament_internal.has_ready_match(new.user_id) then
    raise exception 'Tenes un cruce de torneo listo. Entra desde el torneo.';
  end if;
  return new;
end;
$$;
create trigger guard_normal_team_seat_before_insert
  before insert on public.team_seats for each row
  execute function tournament_internal.guard_normal_team_seat();

-- Una mesa 2v2 puede haberse llenado ANTES de que aparezca el cruce listo.
-- El inicio vuelve a comprobar a todos los ocupantes, no sólo el ingreso.
create function tournament_internal.guard_normal_team_start()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'playing' and old.status = 'waiting' and exists (
    select 1 from public.team_seats seat
    where seat.table_id = new.id and seat.user_id is not null
      and tournament_internal.has_ready_match(seat.user_id)
  ) then
    raise exception 'Tenes un cruce de torneo listo. Entra desde el torneo.';
  end if;
  return new;
end;
$$;
create trigger guard_normal_team_start_before_update
  before update of status on public.team_tables for each row
  execute function tournament_internal.guard_normal_team_start();

create function tournament_internal.guard_tournament_rematch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tournament_match_id is not null
     and (new.rematch_p1 is distinct from old.rematch_p1
          or new.rematch_p2 is distinct from old.rematch_p2
          or new.rematch_game_id is distinct from old.rematch_game_id) then
    raise exception 'Las partidas de torneo no tienen revancha';
  end if;
  return new;
end;
$$;
create trigger guard_tournament_rematch_before_update
  before update of rematch_p1, rematch_p2, rematch_game_id on public.games
  for each row execute function tournament_internal.guard_tournament_rematch();

-- Un cruce sólo se abre si la ronda anterior está resuelta. Los byes se
-- registran como resultados persistidos, sin crear partidas ni estadísticas.
create function tournament_internal.open_round(p_tournament_id uuid, p_round smallint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.tournament_matches m
     set status = 'ready', ready_at = now(), entry_deadline = now() + interval '5 minutes',
         updated_at = now()
   where m.tournament_id = p_tournament_id and m.round_number = p_round
     and m.status = 'pending' and m.finish_reason is null
     and m.side_a_entry_id is not null and m.side_b_entry_id is not null;
end;
$$;

create function tournament_internal.current_name(p_entry_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select profile.username from public.tournament_entry_members member
  join public.profiles profile on profile.id = member.user_id
  where member.entry_id = p_entry_id and member.status = 'accepted'
  limit 1;
$$;

create function tournament_internal.create_bracket(
  p_tournament_id uuid, p_entries uuid[], p_round smallint
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_size integer := cardinality(p_entries);
  v_slots integer := 4;
  v_count integer;
  v_phase text;
  v_a uuid;
  v_b uuid;
  i integer;
begin
  if v_size < 4 or v_size > 32 then raise exception 'Plantel insuficiente'; end if;
  while v_slots < v_size loop v_slots := v_slots * 2; end loop;
  v_count := v_slots / 2;
  v_phase := case v_slots when 4 then 'semifinal' when 8 then 'quarterfinal'
             when 16 then 'round_of_16' else 'round_of_32' end;

  -- A cada cruce se le asigna primero un jugador. Los demás completan los
  -- cruces en orden: no existen enfrentamientos bye-vs-bye.
  for i in 1..v_count loop
    v_a := p_entries[i];
    v_b := case when v_count + i <= v_size then p_entries[v_count + i] else null end;
    insert into public.tournament_matches(
      tournament_id, phase, round_number, match_number,
      side_a_entry_id, side_b_entry_id, status, winner_entry_id,
      finish_reason, finished_at, result_applied_at,
      side_a_username, side_b_username
    ) values (
      p_tournament_id, v_phase, p_round, i, v_a, v_b,
      case when v_b is null then 'forfeit' else 'pending' end,
      case when v_b is null then v_a else null end,
      case when v_b is null then 'bye' else null end,
      case when v_b is null then now() else null end,
      case when v_b is null then now() else null end,
      case when v_b is null then tournament_internal.current_name(v_a) else null end,
      null
    );
  end loop;
  perform tournament_internal.open_round(p_tournament_id, p_round);
end;
$$;

-- Desempate: victorias, enfrentamiento directo SOLO en empates de dos,
-- diferencia de puntos y por último semilla persistida.
create function tournament_internal.group_order(p_group_id uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  with tied as (
    select gm.*, e.status = 'disqualified' as disqualified,
      count(*) over (partition by e.status = 'disqualified', gm.wins) as tied_count
    from public.tournament_group_members gm
    join public.tournament_entries e on e.id = gm.entry_id
    where gm.group_id = p_group_id
  ), ordered as (
    select gm.entry_id, gm.wins, gm.disqualified,
      gm.points_for - gm.points_against as difference,
      gm.tie_break_seed,
      case when gm.tied_count = 2 then coalesce((
        select case when m.winner_entry_id = gm.entry_id then 1 else 0 end
        from public.tournament_matches m
        join tied other on other.group_id = gm.group_id
          and other.wins = gm.wins and other.disqualified = gm.disqualified
          and other.entry_id <> gm.entry_id
        where m.group_id = gm.group_id
          and m.status in ('finished', 'forfeit')
          and m.side_a_entry_id in (gm.entry_id, other.entry_id)
          and m.side_b_entry_id in (gm.entry_id, other.entry_id)
        limit 1
      ), 0) else 0 end as head_to_head
    from tied gm
  )
  select array_agg(entry_id order by disqualified, wins desc, head_to_head desc,
                    difference desc, tie_break_seed)
  from ordered;
$$;

create function tournament_internal.start_one(p_tournament_id uuid, p_actor_id uuid)
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
  if not found or t.status <> 'published' or t.mode <> '1v1'
     or t.roster_frozen_at is not null or now() < t.starts_at then
    raise exception 'El torneo 1v1 todavia no se puede iniciar';
  end if;

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

  select array_agg(e.id order by e.draw_seed) into v_entries
    from public.tournament_entries e where e.tournament_id = t.id and e.status = 'active';
  v_count := coalesce(cardinality(v_entries), 0);
  if v_count < 4 then raise exception 'Hacen falta al menos cuatro jugadores'; end if;
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
    jsonb_build_object('players', v_count, 'format', t.format));
end;
$$;

create function tournament_internal.advance_bracket(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tournaments;
  v_phase text;
  v_round smallint;
  v_count integer;
  v_winners uuid[];
  v_losers uuid[];
  v_group_count integer;
  v_slot_count integer;
  v_pair_count integer;
  v_group uuid;
  v_order uuid[];
  v_first uuid[] := '{}';
  v_second uuid[] := '{}';
  v_qualified uuid[] := '{}';
  v_third public.tournament_matches;
  v_a_active boolean;
  v_b_active boolean;
  i integer;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if t.status <> 'running' or t.paused_at is not null then return; end if;

  if t.format = 'groups' and exists (
    select 1 from public.tournament_groups g
    where g.tournament_id = t.id and g.status <> 'completed'
  ) then
    select count(*) into v_count from public.tournament_matches m
     where m.tournament_id = t.id and m.phase = 'group'
       and m.status not in ('finished', 'forfeit');
    if v_count = 0 then
      for v_group in select id from public.tournament_groups
        where tournament_id = t.id order by group_number loop
        update public.tournament_groups set status = 'completed' where id = v_group;
        v_order := tournament_internal.group_order(v_group);
        v_first := array_append(v_first, v_order[1]);
        v_second := array_append(v_second, v_order[2]);
        update public.tournament_entries set status = 'eliminated', updated_at = now()
          where id in (v_order[3], v_order[4]) and status = 'active';
      end loop;
      v_group_count := cardinality(v_first);
      v_slot_count := 4;
      while v_slot_count < v_group_count * 2 loop
        v_slot_count := v_slot_count * 2;
      end loop;
      v_slot_count := v_slot_count / 2;
      v_pair_count := v_group_count * 2 - v_slot_count;
      -- Los cruces reales enfrentan ganador de grupo con segundo de OTRO
      -- grupo. Los restantes reciben pases directos en la llave persistida.
      v_qualified := v_first;
      for i in 1..v_group_count loop
        if v_pair_count < v_group_count and (i = 1 or i > v_pair_count + 1) then
          v_qualified := array_append(v_qualified, v_second[i]);
        end if;
      end loop;
      for i in 1..v_pair_count loop
        v_qualified := array_append(v_qualified,
          v_second[(i % v_group_count) + 1]);
      end loop;
      perform tournament_internal.create_bracket(t.id, v_qualified, 4::smallint);
      return;
    end if;

    select min(round_number) into v_round from public.tournament_matches
      where tournament_id = t.id and phase = 'group'
        and status not in ('finished', 'forfeit');
    if not exists (select 1 from public.tournament_matches m
      where m.tournament_id = t.id and m.phase = 'group'
        and m.round_number < v_round
        and m.status not in ('finished', 'forfeit')) then
      perform tournament_internal.open_round(t.id, v_round);
    end if;
    return;
  end if;

  -- Sólo se procesa una ronda cuando TODOS sus cruces están resueltos.
  select max(m.round_number) into v_round from public.tournament_matches m
    where m.tournament_id = t.id and m.phase <> 'group';
  if v_round is null then return; end if;
  if exists(select 1 from public.tournament_matches m
    where m.tournament_id = t.id and m.round_number = v_round
      and m.phase <> 'group' and m.status not in ('finished', 'forfeit')
      and not (m.phase = 'third_place' and m.status = 'cancelled'
               and m.finish_reason = 'both_disqualified')) then
    return;
  end if;
  if exists(select 1 from public.tournament_matches m
    where m.tournament_id = t.id and m.round_number = v_round and m.phase = 'final') then
    -- Final y tercer puesto pertenecen a la misma ronda.
    update public.tournaments set status = 'completed', updated_at = now()
      where id = t.id;
    return;
  end if;

  select array_agg(m.winner_entry_id order by m.match_number),
         array_agg(m.loser_entry_id order by m.match_number), count(*)
    into v_winners, v_losers, v_count
    from public.tournament_matches m
   where m.tournament_id = t.id and m.round_number = v_round
     and m.phase <> 'group';
  if v_count = 2 then
    insert into public.tournament_matches(tournament_id, phase, round_number,
      match_number, side_a_entry_id, side_b_entry_id)
    values (t.id, 'final', v_round+1, 1, v_winners[1], v_winners[2]),
           (t.id, 'third_place', v_round+1, 1, v_losers[1], v_losers[2]);
    select * into v_third from public.tournament_matches
      where tournament_id = t.id and phase = 'third_place'
        and round_number = v_round + 1;
    select status = 'active' into v_a_active from public.tournament_entries
      where id = v_third.side_a_entry_id;
    select status = 'active' into v_b_active from public.tournament_entries
      where id = v_third.side_b_entry_id;
    if not v_a_active and not v_b_active then
      -- No hay nadie habilitado para disputar el bronce. No se inventa un
      -- ganador ni se deja una partida imposible bloqueando la final.
      update public.tournament_matches set status = 'cancelled',
        finish_reason = 'both_disqualified', finished_at = now(),
        result_applied_at = now(), updated_at = now(),
        side_a_username = tournament_internal.current_name(v_third.side_a_entry_id),
        side_b_username = tournament_internal.current_name(v_third.side_b_entry_id)
      where id = v_third.id;
    elsif v_a_active <> v_b_active then
      perform tournament_internal.settle_match(v_third.id,
        case when v_a_active then v_third.side_a_entry_id
             else v_third.side_b_entry_id end, null, null, 'disqualification');
    end if;
  else
    v_phase := case v_count when 4 then 'semifinal'
      when 8 then 'quarterfinal' when 16 then 'round_of_16' else null end;
    if v_phase is null then raise exception 'Ronda eliminatoria invalida'; end if;
    for i in 1..v_count/2 loop
      insert into public.tournament_matches(tournament_id, phase, round_number,
        match_number, side_a_entry_id, side_b_entry_id)
      values(t.id, v_phase, v_round+1, i, v_winners[i*2-1], v_winners[i*2]);
    end loop;
  end if;
  perform tournament_internal.open_round(t.id, (v_round+1)::smallint);
end;
$$;

create function tournament_internal.settle_match(
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
  if p_game_id is not null and (m.status <> 'playing' or m.game_id <> p_game_id) then
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

-- El cierre normal ya tiene bloqueo de games, contabilidad y el trigger de
-- objetivos. Este hook enlaza el resultado al torneo en la MISMA transacción.
create function tournament_internal.on_game_finished()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.tournament_matches;
begin
  if new.status <> 'finished' or old.status = 'finished' then return new; end if;
  select * into m from public.tournament_matches where game_id = new.id;
  if not found then return new; end if;
  if new.winner_id is null then
    update public.tournament_matches set status = 'pending',
      finish_reason = 'attendance_review', ready_at = null, entry_deadline = null,
      updated_at = now() where id = m.id and result_applied_at is null;
    return new;
  end if;
  if new.bet <> 0 or new.campaign_rival_id is not null then
    raise exception 'Partida de torneo con apuesta o campana invalida';
  end if;
  perform tournament_internal.settle_match(m.id,
    case when new.winner_id = new.player1_id then m.side_a_entry_id
         when new.winner_id = new.player2_id then m.side_b_entry_id else null end,
    new.player1_score, new.player2_score, 'played', new.id);
  return new;
end;
$$;
create trigger tournament_game_finished
  after update of status on public.games for each row
  execute function tournament_internal.on_game_finished();

create function tournament_internal.on_tournament_cancelled()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.tournament_matches set status = 'cancelled', updated_at = now()
      where tournament_id = new.id and status in ('pending', 'ready');
  end if;
  return new;
end;
$$;
create trigger tournament_cancel_pending_matches
  after update of status on public.tournaments for each row
  execute function tournament_internal.on_tournament_cancelled();

create function public.tournament_admin_start(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := tournament_internal.require_admin();
begin
  if exists(select 1 from public.tournaments where id = p_tournament_id
    and status = 'running') then
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;
  perform tournament_internal.start_one(p_tournament_id, v_actor);
  return tournament_internal.admin_snapshot(p_tournament_id);
end;
$$;

create function public.tournament_admin_pause(p_tournament_id uuid, p_pause boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.status <> 'running' then raise exception 'Torneo no disponible'; end if;
  update public.tournaments set paused_at = case when p_pause then coalesce(paused_at, now())
                                                  else null end,
    updated_by = v_actor, updated_at = now() where id = t.id;
  perform tournament_internal.audit(t.id, v_actor,
    case when p_pause then 'tournament_paused' else 'tournament_resumed' end);
  if not p_pause and t.paused_at is not null then
    perform tournament_internal.advance_bracket(t.id);
  end if;
  return tournament_internal.admin_snapshot(t.id);
end;
$$;

create function public.tournament_enter_match(p_match_id uuid)
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

create function public.tournament_admin_retry_match(p_match_id uuid)
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
  delete from public.tournament_match_presence where match_id = m.id;
  update public.tournament_matches set status = 'ready', finish_reason = null,
    ready_at = now(), entry_deadline = now() + interval '5 minutes',
    started_at = null, updated_at = now() where id = m.id;
  perform tournament_internal.audit(t.id, v_actor, 'match_reopened', null,
    jsonb_build_object('match_id', m.id));
  return jsonb_build_object('match_id', m.id);
end;
$$;

create function public.tournament_admin_replace(
  p_tournament_id uuid, p_outgoing_entry_id uuid, p_waitlist_entry_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  t public.tournaments;
  v_old_user uuid;
  v_new_user uuid;
begin
  if p_outgoing_entry_id = p_waitlist_entry_id then raise exception 'Elegí otro jugador'; end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.mode <> '1v1' or t.status not in ('published', 'running') then
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

create function public.tournament_admin_disqualify(p_tournament_id uuid, p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  t public.tournaments;
  m public.tournament_matches;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.status not in ('published', 'running') then
    raise exception 'Torneo no disponible'; end if;
  if not exists(select 1 from public.tournament_entries e where e.id = p_entry_id
     and e.tournament_id = t.id and e.status = 'active') then
    raise exception 'Jugador no disponible'; end if;
  if exists(select 1 from public.tournament_matches active_match
     where active_match.tournament_id = t.id
       and active_match.status = 'playing'
       and p_entry_id in (active_match.side_a_entry_id, active_match.side_b_entry_id)) then
    raise exception 'Esperá a que termine la partida en curso'; end if;
  if t.format = 'groups' and t.status = 'running' and exists (
    select 1 from public.tournament_group_members gm
    join public.tournament_groups grp on grp.id = gm.group_id
    where gm.entry_id = p_entry_id and grp.status <> 'completed'
      and (select count(*) from public.tournament_group_members other
        join public.tournament_entries e on e.id = other.entry_id
        where other.group_id = gm.group_id and other.entry_id <> p_entry_id
          and e.status = 'active') < 2
  ) then
    raise exception 'El grupo necesita dos jugadores activos; reemplazá primero o cancelá';
  end if;
  update public.tournament_entries set status = 'disqualified', updated_at = now()
    where id = p_entry_id;
  perform tournament_internal.audit(t.id, v_actor, 'entry_disqualified', p_entry_id);
  if t.status = 'published' then
    delete from public.tournament_checkins where entry_id = p_entry_id;
    perform tournament_internal.promote_waitlist(t.id, v_actor);
  else
    -- Los cruces ya creados se resuelven como ausencia, uno por uno. El
    -- avance sigue esperando a todos los demás cruces de la ronda.
    for m in select * from public.tournament_matches
      where tournament_id = t.id and status in ('ready', 'pending')
        and p_entry_id in (side_a_entry_id, side_b_entry_id)
      order by round_number, match_number loop
      perform tournament_internal.settle_match(m.id,
        case when m.side_a_entry_id = p_entry_id then m.side_b_entry_id
             else m.side_a_entry_id end, null, null, 'disqualification');
    end loop;
  end if;
  return tournament_internal.admin_snapshot(t.id);
end;
$$;

-- El minuto de cron cubre plazos aunque nadie tenga la página abierta.
-- Las llamadas repetidas se serializan por la fila del torneo.
create function tournament_internal.advance_due()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  t record;
  m public.tournament_matches;
  v_a boolean;
  v_b boolean;
  v_count integer := 0;
begin
  for t in select id from public.tournaments
     where status = 'published' and mode = '1v1' and starts_at <= now()
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
    select exists(select 1 from public.tournament_match_presence p
       where p.match_id = m.id and p.entry_id = m.side_a_entry_id),
      exists(select 1 from public.tournament_match_presence p
       where p.match_id = m.id and p.entry_id = m.side_b_entry_id)
    into v_a, v_b;
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

-- Lectura segura de posiciones y jugadores históricos para dibujar el cuadro.
create function public.tournament_ready_match()
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesion'; end if;
  return tournament_internal.has_ready_match(auth.uid());
end;
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
      'entry_id', e.id, 'username', p.username, 'avatar_url', p.avatar_url,
      'status', e.status) order by e.sequence_no)
      from public.tournament_entries e
      join public.tournament_entry_members mem on mem.entry_id = e.id and mem.status = 'accepted'
      join public.profiles p on p.id = mem.user_id
      where e.tournament_id = t.id), '[]'::jsonb),
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

-- Las RPC públicas verifican admin/participante dentro de la transacción.
revoke execute on function public.tournament_admin_start(uuid),
  public.tournament_admin_pause(uuid, boolean),
  public.tournament_admin_retry_match(uuid),
  public.tournament_admin_replace(uuid, uuid, uuid),
  public.tournament_admin_disqualify(uuid, uuid),
  public.tournament_enter_match(uuid),
  public.tournament_ready_match()
  from public, anon;
grant execute on function public.tournament_admin_start(uuid) to authenticated;
grant execute on function public.tournament_admin_pause(uuid, boolean) to authenticated;
grant execute on function public.tournament_admin_retry_match(uuid) to authenticated;
grant execute on function public.tournament_admin_replace(uuid, uuid, uuid) to authenticated;
grant execute on function public.tournament_admin_disqualify(uuid, uuid) to authenticated;
grant execute on function public.tournament_enter_match(uuid) to authenticated;
grant execute on function public.tournament_ready_match() to authenticated;
revoke execute on all functions in schema tournament_internal from public, anon, authenticated;

commit;

select cron.schedule('trucazo-tournament-1v1-minute', '* * * * *',
  'select tournament_internal.advance_due()');
