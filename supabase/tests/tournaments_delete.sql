-- Torneos viejos: permisos, estados, borrado lógico y conservación de premios.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Eliminar torneos: %', msg; end if; end $$;
create function pg_temp.uid(i integer) returns uuid language sql immutable as $$
  select ('dd200000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;

insert into auth.users(id, email, email_confirmed_at, is_anonymous)
select pg_temp.uid(i), 'delete-tournament-' || i || '@trucazo.com.ar', now(), false
from generate_series(0, 2) i;
insert into public.profiles(id, username, is_admin, is_bot, coins)
select pg_temp.uid(i), 'EliminarTorneo' || i, i = 0, false, 100
from generate_series(0, 2) i
on conflict(id) do update set is_admin = excluded.is_admin, is_bot = false, coins = 100;

do $$
declare
  t uuid; cancelled uuid; other uuid; e1 uuid; e2 uuid; s text;
  result jsonb; before_list jsonb; after_list jsonb;
begin
  perform pg_temp.check(not has_function_privilege('anon',
    'public.tournament_admin_delete(uuid)', 'execute'), 'visitantes pueden eliminar');
  insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
    published_at, prize_first, prize_second, created_by, updated_by)
  values('Finalizado para eliminar', '1v1', 'knockout', 4, 15, now() + interval '2 days',
    'published', now(), 200, 100, pg_temp.uid(0), pg_temp.uid(0)) returning id into t;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values(t, 'active', 'solo', pg_temp.uid(1)) returning id into e1;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values(t, 'active', 'solo', pg_temp.uid(2)) returning id into e2;
  insert into public.tournament_entry_members(tournament_id, entry_id, user_id, role, status, accepted_at)
    values(t, e1, pg_temp.uid(1), 'captain', 'accepted', now()),
      (t, e2, pg_temp.uid(2), 'captain', 'accepted', now());
  insert into public.tournament_matches(tournament_id, phase, round_number, match_number,
    side_a_entry_id, side_b_entry_id, status, winner_entry_id, loser_entry_id,
    finished_at, result_applied_at)
    values(t, 'final', 2, 1, e1, e2, 'finished', e1, e2, now(), now());
  update public.tournaments set status = 'completed' where id = t;

  perform set_config('request.jwt.claim.sub', pg_temp.uid(1)::text, true);
  set local role authenticated;
  begin
    perform public.tournament_admin_delete(t);
    raise exception 'Un jugador logró eliminar un torneo';
  exception when others then
    if sqlerrm not like '%Solo un administrador%' then raise; end if;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  set local role authenticated;
  begin
    perform public.tournament_admin_delete(t);
    raise exception 'Se eliminó sin sesión';
  exception when others then
    if sqlerrm not like '%Solo un administrador%' then raise; end if;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', pg_temp.uid(0)::text, true);

  -- El servidor protege incluso llamadas que no pasan por los botones.
  foreach s in array array['draft', 'published', 'running'] loop
    insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
      created_by, updated_by)
      values('No eliminar ' || s, '1v1', 'knockout', 4, 15, now() + interval '2 days',
        s, pg_temp.uid(0), pg_temp.uid(0)) returning id into other;
    set local role authenticated;
    begin
      perform public.tournament_admin_delete(other);
      raise exception 'Se eliminó un torneo activo';
    exception when others then
      if sqlerrm not like '%Solo se pueden eliminar%' then raise; end if;
    end;
    reset role;
  end loop;

  set local role authenticated;
  before_list := public.tournament_list();
  result := public.tournament_admin_delete(t);
  perform pg_temp.check(result->>'status' = 'deleted', 'no confirmó eliminación');
  perform public.tournament_admin_delete(t);
  after_list := public.tournament_list();
  perform pg_temp.check(before_list - 'past' = after_list - 'past',
    'alteró las listas de borradores, próximos o en curso');
  perform pg_temp.check(not exists(select 1 from jsonb_array_elements(
    public.tournament_list()->'past') item where item->>'id' = t::text), 'sigue en administración');
  begin
    perform public.tournament_detail(t);
    raise exception 'El detalle eliminado sigue disponible';
  exception when others then
    if sqlerrm not like '%Torneo no disponible%' then raise; end if;
  end;
  reset role;

  perform pg_temp.check((select count(*) = 1 from tournament_internal.audit_log
    where tournament_id = t and action = 'tournament_deleted'), 'reintento duplicó auditoría');
  perform pg_temp.check((select deleted_at is not null from public.tournaments where id = t),
    'no conservó el registro histórico');
  perform pg_temp.check((select count(*) = 2 from public.tournament_awards where tournament_id = t),
    'borró o duplicó premios');
  perform pg_temp.check((select coins = 300 from public.profiles where id = pg_temp.uid(1))
    and (select coins = 200 from public.profiles where id = pg_temp.uid(2)), 'alteró monedas');
  perform pg_temp.check((select count(*) = 2 from public.profile_medals
    where profile_id in (pg_temp.uid(1), pg_temp.uid(2))
      and medal_slug in ('torneo_oro', 'torneo_plata')), 'alteró insignias');
  perform pg_temp.check((select count(*) = 1 from public.tournament_matches where tournament_id = t),
    'borró resultados');
  perform pg_temp.check(not exists(select 1 from public.tournament_notifications where tournament_id = t),
    'dejó avisos apuntando al torneo eliminado');
  perform pg_temp.check(not exists(select 1 from public.tournament_email_jobs where tournament_id = t
    and status in ('pending', 'processing', 'failed')), 'dejó correos pendientes');

  insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
    cancelled_at, published_at, created_by, updated_by)
  values('Cancelado para eliminar', '2v2', 'knockout', 8, 15, now() + interval '2 days',
    'cancelled', now(), now(), pg_temp.uid(0), pg_temp.uid(0)) returning id into cancelled;
  set local role authenticated;
  perform public.tournament_admin_delete(cancelled);
  reset role;
  perform set_config('request.jwt.claim.sub', pg_temp.uid(1)::text, true);
  set local role authenticated;
  perform pg_temp.check(not exists(select 1 from jsonb_array_elements(
    public.tournament_list()->'past') item where item->>'id' in (t::text, cancelled::text)),
    'sigue en las listas de jugadores');
  reset role;
end;
$$;

rollback;
