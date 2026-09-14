-- 2vs2: una partida en curso abandonada por todas sus personas ya no se anula
-- siempre. Si esas personas juegan todas en el mismo equipo, ese equipo pierde
-- por abandono (igual que "Abandonar partida"); así nadie evita una derrota
-- contra bots cerrando la pestaña. Si hay personas ausentes de ambos lados,
-- se anula y se devuelven las apuestas como hasta ahora.
-- Las salas de espera no cambian: siguen cancelándose tras 15 minutos sin gente.
begin;

create or replace function team_internal.sweep() returns integer
language plpgsql security definer set search_path = '' as $$
declare t record; n integer:=0; absence interval; teams integer[];
begin
  for t in select * from public.team_tables x where
    ((status='waiting' and created_at<now()-interval '15 minutes') or status='playing')
    and not exists(select 1 from public.team_seats s where s.table_id=x.id
      and s.user_id is not null and s.last_seen_at>=now()-
        case when x.status='waiting' then interval '15 minutes' else interval '10 minutes' end)
    for update skip locked
  loop
    absence:=case when t.status='waiting' then interval '15 minutes' else interval '10 minutes' end;
    -- Releer después de obtener el bloqueo: una presencia recién confirmada
    -- puede no estar en la instantánea que eligió los candidatos del barrido.
    if not exists(select 1 from public.team_seats s where s.table_id=t.id
      and s.user_id is not null and s.last_seen_at>=clock_timestamp()-absence) then
      select array_agg(distinct seat%2) into teams from public.team_seats
        where table_id=t.id and user_id is not null and seat is not null;
      if t.status='playing' and array_length(teams,1)=1 then
        perform team_internal.finish(t.id,1-teams[1],'forfeit');
        update public.team_tables set version=version+1,updated_at=now() where id=t.id;
      else
        perform team_internal.cancel(t.id);
      end if;
      n:=n+1;
    end if;
  end loop;
  perform team_internal.prune_requests();
  return n;
end;
$$;
-- CREATE OR REPLACE conserva los permisos: sigue sin ser ejecutable por el cliente.

commit;
