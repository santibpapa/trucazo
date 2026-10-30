-- ============================================================
-- TRUCAZO — COPA TRUCA: devolver a los inscriptos que el inicio sacó
-- Fecha: 2026-10-30
--
-- Qué pasó: a las 20:00 los inscriptos no habían hecho check-in. start_one
-- reemplaza a quien no confirmó, y el relleno de 20261030223000 completó los
-- 16 lugares con bots: el torneo arrancó sólo con bots.
--
-- Esta reparación, en una sola transacción:
--   1. Borra los cruces y las mesas de esa largada (sólo jugaron bots).
--   2. Saca a los bots y devuelve a las personas reemplazadas en la largada,
--      con check-in hecho por la administración.
--   3. Completa con bots sólo los lugares que faltan y vuelve a sortear.
--   4. Da 15 minutos (en vez de 5) para entrar a los cruces de la 1.ª ronda.
-- El torneo sigue "en curso": no se vuelve a mandar el anuncio a nadie.
-- ============================================================

begin;

do $repair$
declare
  t public.tournaments;
  v_games uuid[];
  v_humans int;
  v_bot uuid;
  v_entry uuid;
  v_entries uuid[];
  i int;
begin
  select tt.* into t from public.tournaments tt
    join tournament_internal.bot_fill f on f.tournament_id = tt.id
   where tt.status = 'running' and tt.mode = '1v1' and tt.format = 'knockout'
     and (tt.starts_at at time zone 'America/Argentina/Buenos_Aires')::date = date '2026-10-30'
   for update of tt;
  -- En una base reconstruida de cero no existe: no hay nada que reparar.
  if not found then raise notice 'No encontré la COPA TRUCA en curso'; return; end if;
  if exists (select 1 from public.tournament_awards where tournament_id = t.id) then
    raise exception 'El torneo ya entregó premios: no se puede rehacer';
  end if;

  -- 1. Cruces y mesas de la largada con bots.
  select coalesce(array_agg(game_id) filter (where game_id is not null), '{}') into v_games
    from public.tournament_matches where tournament_id = t.id;
  if exists (select 1 from public.games g
              where g.id = any(v_games)
                and (not exists (select 1 from public.profiles p where p.id = g.player1_id and p.is_bot)
                  or not exists (select 1 from public.profiles p where p.id = g.player2_id and p.is_bot))) then
    raise exception 'Hay una partida con una persona: no la borro';
  end if;
  update public.tournament_matches set game_id = null where tournament_id = t.id;
  delete from public.games where id = any(v_games);
  delete from public.tables where id = any(v_games);
  delete from public.tournament_matches where tournament_id = t.id;
  delete from public.tournament_groups where tournament_id = t.id;

  -- 2. Fuera los bots; vuelven las personas reemplazadas al arrancar.
  delete from public.tournament_entries e
   where e.tournament_id = t.id
     and exists (select 1 from public.tournament_entry_members m
                 join public.profiles p on p.id = m.user_id
                 where m.entry_id = e.id and p.is_bot);
  update public.tournament_entries e set status = 'active', updated_at = now()
   where e.tournament_id = t.id and e.status = 'replaced' and e.replaced_entry_id is null
     and e.updated_at >= t.roster_frozen_at - interval '1 minute';
  insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
    select e.id, t.id, m.user_id from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id and m.status = 'accepted'
   where e.tournament_id = t.id and e.status = 'active'
  on conflict (entry_id) do nothing;

  select count(*) into v_humans from public.tournament_entries
   where tournament_id = t.id and status = 'active';
  if v_humans = 0 then raise exception 'No encontré inscriptos para devolver'; end if;

  -- 3. Bots sólo para los lugares libres, y sorteo nuevo.
  for i in 1..greatest(t.capacity - v_humans, 0) loop
    select b.bot_id into v_bot from tournament_internal.bot_players b
     where not exists (select 1 from public.tournament_entry_members mm
                       where mm.tournament_id = t.id and mm.user_id = b.bot_id)
     order by random() limit 1;
    insert into public.tournament_entries(tournament_id, status, kind, created_by)
      values (t.id, 'active', 'solo', v_bot) returning id into v_entry;
    insert into public.tournament_entry_members(tournament_id, entry_id, user_id, role, status, accepted_at)
      values (t.id, v_entry, v_bot, 'captain', 'accepted', now());
    insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
      values (v_entry, t.id, v_bot);
  end loop;

  update public.tournaments set paused_at = null, updated_at = now() where id = t.id;
  select array_agg(id order by draw_seed) into v_entries
    from public.tournament_entries where tournament_id = t.id and status = 'active';
  perform tournament_internal.create_bracket(t.id, v_entries, 1::smallint);

  -- 4. Más margen para entrar: vienen de una largada confusa.
  update public.tournament_matches set entry_deadline = now() + interval '15 minutes'
   where tournament_id = t.id and status = 'ready';

  perform tournament_internal.audit(t.id, null, 'roster_restored_after_bot_fill', null,
    jsonb_build_object('humans', v_humans, 'bots', t.capacity - v_humans));
end $repair$;

commit;

-- Resultado: los 16 de la COPA TRUCA (persona o bot) y su cruce.
select p.username as jugador, case when p.is_bot then 'bot' else 'persona' end as tipo,
       mt.match_number as cruce
  from public.tournaments t
  join tournament_internal.bot_fill f on f.tournament_id = t.id
  join public.tournament_entries e on e.tournament_id = t.id and e.status = 'active'
  join public.tournament_entry_members m on m.entry_id = e.id and m.status = 'accepted'
  join public.profiles p on p.id = m.user_id
  left join public.tournament_matches mt on mt.tournament_id = t.id
    and e.id in (mt.side_a_entry_id, mt.side_b_entry_id)
 where t.status = 'running'
   and (t.starts_at at time zone 'America/Argentina/Buenos_Aires')::date = date '2026-10-30'
 order by mt.match_number, tipo;
