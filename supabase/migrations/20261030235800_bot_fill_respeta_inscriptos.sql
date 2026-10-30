-- ============================================================
-- TRUCAZO — Relleno con bots: sólo lugares vacíos
-- Fecha: 2026-10-30
--
-- En la COPA TRUCA nadie hizo check-in: start_one sacó a los 11 inscriptos
-- y el relleno puso 16 bots. Pedido del dueño: en los torneos marcados para
-- completar con bots, los inscriptos conservan su lugar aunque no hayan
-- confirmado, y los bots sólo ocupan lugares que nadie tomó.
-- Única diferencia con 20261030223000: el paso a) de bot_tick.
-- ============================================================

begin;

create or replace function tournament_internal.bot_tick()
returns void language plpgsql security definer set search_path = public as $function$
declare
  t tournaments%rowtype; m tournament_matches%rowtype; g games%rowtype;
  v_needed int; v_bot uuid; v_entry uuid; v_a uuid; v_b uuid; v_name_a text; v_name_b text;
  v_hands record; v_game_id uuid; v_actor uuid; v_human uuid; v_bots int; i int;
begin
  -- a) A la hora de inicio: completar el cupo con bots e iniciar.
  for t in select tt.* from tournaments tt
      join tournament_internal.bot_fill f on f.tournament_id = tt.id
     where tt.status = 'published' and tt.mode = '1v1' and tt.starts_at <= now()
       and tt.roster_frozen_at is null loop
    begin
      select * into t from tournaments where id = t.id for update;
      continue when t.status <> 'published';
      -- Los inscriptos conservan su lugar aunque no hayan hecho check-in: se
      -- confirma por ellos para que start_one no los reemplace. Si después no
      -- entran a su cruce, pierden por ausencia como cualquiera. Los bots sólo
      -- ocupan los lugares que nadie tomó.
      insert into tournament_checkins(entry_id, tournament_id, confirmed_by)
        select e.id, t.id, em.user_id from tournament_entries e
        join tournament_entry_members em on em.entry_id = e.id and em.status = 'accepted'
       where e.tournament_id = t.id and e.status = 'active'
      on conflict (entry_id) do nothing;
      v_needed := t.capacity
        - (select count(*) from tournament_entries e
           where e.tournament_id = t.id and e.status in ('active', 'waitlisted'));
      for i in 1..greatest(v_needed, 0) loop
        select b.bot_id into v_bot from tournament_internal.bot_players b
         where not exists (select 1 from tournament_entry_members mm
                           where mm.tournament_id = t.id and mm.user_id = b.bot_id)
         order by random() limit 1;
        exit when v_bot is null;
        insert into tournament_entries(tournament_id, status, kind, created_by)
          values (t.id, 'active', 'solo', v_bot) returning id into v_entry;
        insert into tournament_entry_members(tournament_id, entry_id, user_id, role, status, accepted_at)
          values (t.id, v_entry, v_bot, 'captain', 'accepted', now());
        insert into tournament_checkins(entry_id, tournament_id, confirmed_by)
          values (v_entry, t.id, v_bot);
        v_bot := null;
      end loop;
      perform tournament_internal.start_one(t.id, null);
    exception when others then
      raise warning 'bot_tick fill %: %', t.id, sqlerrm;
    end;
  end loop;

  -- b) Cruces listos con todos adentro y sin mesa (bot contra bot): crearla.
  for m in select mm.* from tournament_matches mm
      join tournament_internal.bot_fill f on f.tournament_id = mm.tournament_id
      join tournaments tt on tt.id = mm.tournament_id
     where mm.status = 'ready' and mm.game_id is null and tt.status = 'running'
       and mm.entry_deadline > now() loop
    begin
      perform 1 from tournaments where id = m.tournament_id for update;
      select * into m from tournament_matches where id = m.id for update;
      continue when m.status <> 'ready' or m.game_id is not null;
      select a.user_id, pa.username into v_a, v_name_a
        from tournament_entry_members a join profiles pa on pa.id = a.user_id
       where a.entry_id = m.side_a_entry_id and a.status = 'accepted';
      select bm.user_id, pb.username into v_b, v_name_b
        from tournament_entry_members bm join profiles pb on pb.id = bm.user_id
       where bm.entry_id = m.side_b_entry_id and bm.status = 'accepted';
      continue when v_a is null or v_b is null
        or not exists (select 1 from tournament_match_presence where match_id = m.id and user_id = v_a)
        or not exists (select 1 from tournament_match_presence where match_id = m.id and user_id = v_b);
      select * into t from tournaments where id = m.tournament_id;
      v_game_id := gen_random_uuid();
      -- Mismo alta que tournament_enter_match.
      insert into tables(id, tournament_match_id, tournament_id, name, creator_id,
        creator_username, opponent_id, opponent_username, bet, is_private,
        status, target_score, time_limit)
      values(v_game_id, m.id, t.id, t.name, v_a, v_name_a, v_b, v_name_b,
        0, true, 'playing', t.target_score, 30);
      select * into v_hands from _deal_hands();
      insert into games(id, tournament_match_id, player1_id, player2_id, player1_username,
        player2_username, current_turn, mano_player, bet, target_score,
        time_limit, turn_started_at)
      values(v_game_id, m.id, v_a, v_b, v_name_a, v_name_b, v_a, v_a,
        0, t.target_score, 30, now());
      insert into game_hands(game_id, player_id, cards)
        values (v_game_id, v_a, v_hands.h1), (v_game_id, v_b, v_hands.h2);
      update tournament_matches set status = 'playing', game_id = v_game_id,
        started_at = now(), updated_at = now() where id = m.id;
    exception when others then
      raise warning 'bot_tick match %: %', m.id, sqlerrm;
    end;
  end loop;

  -- c) Partidas en curso con bots.
  for g in select gm.* from games gm
      join tournament_matches mm on mm.game_id = gm.id
      join tournament_internal.bot_fill f on f.tournament_id = mm.tournament_id
     where gm.status = 'playing'
       and exists (select 1 from tournament_internal.bot_players b
                   where b.bot_id in (gm.player1_id, gm.player2_id)) loop
    begin
      select count(*) into v_bots from tournament_internal.bot_players b
       where b.bot_id in (g.player1_id, g.player2_id);
      if v_bots = 2 then
        -- Bot contra bot: una mano por minuto, como una partida real.
        if g.awaiting_deal then
          perform tournament_internal.bot_call(g.id, g.player1_id, 'advance_hand');
          select * into g from games where id = g.id;
        end if;
        for i in 1..40 loop
          exit when g.status <> 'playing' or g.awaiting_deal;
          exit when not tournament_internal.bot_act(g.id, tournament_internal.game_actor(g));
          select * into g from games where id = g.id;
        end loop;
        -- Si un bot quedó trabado, el reloj lo resuelve como en cualquier mesa.
        if g.status = 'playing' and not g.awaiting_deal
           and g.turn_started_at + make_interval(secs => g.time_limit + 3) < now() then
          perform tournament_internal.bot_call(g.id, g.player1_id, 'timeout_mazo');
        end if;
      else
        -- Contra una persona: la pantalla de la persona mueve al bot. Si la
        -- cerró, el bot sigue: juega su turno, reparte y le corre el reloj.
        select b.bot_id into v_bot from tournament_internal.bot_players b
         where b.bot_id in (g.player1_id, g.player2_id);
        v_human := case when v_bot = g.player1_id then g.player2_id else g.player1_id end;
        continue when g.updated_at > now() - interval '15 seconds';
        if g.awaiting_deal then
          perform tournament_internal.bot_call(g.id, v_bot, 'advance_hand');
        else
          v_actor := tournament_internal.game_actor(g);
          if v_actor = v_bot then
            perform tournament_internal.bot_act(g.id, v_bot);
          elsif coalesce(case when g.envido_state->>'status' = 'declaring'
                         then (g.envido_state->>'declare_turn')::uuid else g.current_turn end, v_bot) = v_human
                and g.turn_started_at + make_interval(secs => g.time_limit + 3) < now() then
            perform tournament_internal.bot_call(g.id, v_bot, 'timeout_mazo');
          end if;
        end if;
      end if;
    exception when others then
      raise warning 'bot_tick game %: %', g.id, sqlerrm;
    end;
  end loop;
end;
$function$;

revoke execute on function tournament_internal.bot_tick() from public, anon, authenticated;

commit;
