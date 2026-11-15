-- Solo en base descartable reconstruida. Se revierte todo al terminar.
-- Panel de admin: la lista de personas de a páginas (admin_people) tiene que
-- dar las mismas personas, en el mismo orden, que la lista entera de antes
-- (admin_stats con p_personas) ordenada y filtrada como lo hacía el navegador.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'admin personas: %', detail; end if; end $$;
create function pg_temp.persona(i int) returns uuid language sql immutable as $$
  select ('ad000000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid $$;
grant execute on function pg_temp.check(boolean, text), pg_temp.persona(int) to authenticated, anon;

-- 30 personas: cada tres, una invitada, una de Google y una con email. Algunas
-- se anotan el mismo día (para el renglón de día) y a la misma hora (empates).
insert into auth.users(id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at)
select pg_temp.persona(i),
       case when i % 3 = 0 then null else 'Persona' || i || '@Test.invalid' end,
       i % 3 = 0,
       case when i % 3 = 1 then '{"provider":"google"}' else '{"provider":"email"}' end::jsonb,
       jsonb_build_object('username', 'Persona' || i),
       now() - (i / 4) * interval '1 day'
  from generate_series(1, 30) i;
update public.profiles p
   set created_at = now() - (i / 4) * interval '1 day' - (case when i % 5 = 0 then 0 else i end) * interval '1 minute'
  from generate_series(1, 30) i
 where p.id = pg_temp.persona(i);
update public.profiles set is_admin = true where id = pg_temp.persona(1);

-- Partidas entre personas y contra bots, en días distintos, terminadas y no.
-- Cada partida nace de una mesa con el mismo id.
create temp table partidas on commit drop as
select gen_random_uuid() as id, a.id as p1, b.id as p2, g
  from generate_series(1, 80) g
  join lateral (select pg_temp.persona(1 + (g * 7) % 20) as id) a on true
  join lateral (
    select case when g % 2 = 0 then pg_temp.persona(1 + (g * 11) % 25)
                else (select id from public.profiles where is_bot order by id limit 1 offset g % 5) end as id
  ) b on true
 where a.id <> b.id;
insert into public.tables(id, name, creator_id, creator_username, bet, status)
select id, 'Mesa ' || g, p1, 'a', 10, 'playing' from partidas;
insert into public.games(id, player1_id, player2_id, player1_username, player2_username,
                         current_turn, mano_player, bet, status, winner_id, created_at)
select id, p1, p2, 'a', 'b', p1, p1, 10,
       case when g % 4 = 0 then 'playing' else 'finished' end,
       case when g % 4 = 0 then null when g % 3 = 0 then p2 else p1 end,
       now() - (g % 9) * interval '1 day' - g * interval '7 minutes'
  from partidas;

-- Como el admin.
select set_config('request.jwt.claim.sub', pg_temp.persona(1)::text, true),
       set_config('request.jwt.claims', json_build_object('sub', pg_temp.persona(1))::text, true) \g /dev/null
set local role authenticated;

do $test$
declare
  viejo jsonb := public.admin_stats(30);
  liviano jsonb := public.admin_stats(30, false);
  pag jsonb;
  f text; o text; ids_v text; ids_n text; total_v int; jugaron_v int; desde int;
begin
  perform pg_temp.check(liviano->'personas' = 'null'::jsonb, 'sin p_personas no manda la lista');
  perform pg_temp.check((viejo - 'personas' - 'generado_at') = (liviano - 'personas' - 'generado_at'),
                        'los números son los mismos con y sin lista');
  perform pg_temp.check(jsonb_array_length(viejo->'personas') >= 30, 'la lista vieja sigue entera');

  foreach f in array array['todos', 'jugaron', 'no_jugaron', 'con_cuenta', 'invitados'] loop
    foreach o in array array['creado_at', 'partidas', 'ganadas', 'dias_jugados', 'ultima_partida'] loop
      -- Lo que hacía el navegador: filtrar y ordenar de mayor a menor; a igual
      -- valor queda el orden de llegada (la más nueva primero).
      select string_agg(e->>'id', ',' order by
               case o when 'partidas' then (e->>'partidas')::int
                      when 'ganadas' then (e->>'ganadas')::int
                      when 'dias_jugados' then (e->>'dias_jugados')::int end desc nulls last,
               case when o = 'ultima_partida'
                    then coalesce((e->>'ultima_partida')::timestamptz, 'epoch') end desc nulls last,
               (e->>'creado_at')::timestamptz desc, e->>'id'),
             count(*), count(*) filter (where (e->>'partidas')::int > 0)
        into ids_v, total_v, jugaron_v
        from jsonb_array_elements(viejo->'personas') e
       where case f when 'jugaron'    then (e->>'partidas')::int > 0
                    when 'no_jugaron' then (e->>'partidas')::int = 0
                    when 'con_cuenta' then e->>'tipo' <> 'invitado'
                    when 'invitados'  then e->>'tipo' = 'invitado'
                    else true end;

      -- Lo nuevo, de a 7 para cruzar varias páginas.
      ids_n := null; desde := 0;
      loop
        pag := public.admin_people(null, f, o, 7, desde);
        exit when jsonb_array_length(pag->'personas') = 0;
        perform pg_temp.check((pag->>'total')::int = total_v, format('total %s/%s', f, o));
        perform pg_temp.check((pag->>'jugaron')::int = jugaron_v, format('jugaron %s/%s', f, o));
        select concat_ws(',', ids_n, string_agg(e->>'id', ',' order by n))
          into ids_n from jsonb_array_elements(pag->'personas') with ordinality x(e, n);
        desde := desde + 7;
      end loop;
      perform pg_temp.check(coalesce(ids_v, '') = coalesce(ids_n, ''), format('mismo orden %s/%s', f, o));
    end loop;
  end loop;

  -- Cada ficha trae los mismos datos que antes, más cuántas del mismo día hay.
  pag := public.admin_people(null, 'todos', 'creado_at', 200, 0);
  perform pg_temp.check(not exists (
    select 1 from jsonb_array_elements(pag->'personas') with ordinality x(e, n)
     where (e - 'dia_cantidad') <> (viejo->'personas'->(n::int - 1))
  ), 'mismos datos por persona');
  perform pg_temp.check(not exists (
    select 1 from jsonb_array_elements(pag->'personas') e
     where (e->>'dia_cantidad')::int <> (
       select count(*) from jsonb_array_elements(viejo->'personas') v
        where ((v->>'creado_at')::timestamptz at time zone 'America/Argentina/Buenos_Aires')::date
            = ((e->>'creado_at')::timestamptz at time zone 'America/Argentina/Buenos_Aires')::date)
  ), 'cuántas se anotaron ese día');

  -- Buscar: por nombre o email, sin distinguir mayúsculas; los comodines no valen.
  pag := public.admin_people('persona2', 'todos', 'creado_at', 50, 0);
  perform pg_temp.check((pag->>'total')::int = 11, 'buscar por nombre: Persona2 y Persona20 a 29');
  pag := public.admin_people('  PERSONA7@test  ', 'todos', 'creado_at', 50, 0);
  perform pg_temp.check((pag->>'total')::int = 1 and pag->'personas'->0->>'id' = pg_temp.persona(7)::text,
                        'buscar por email');
  pag := public.admin_people('%', 'todos', 'creado_at', 50, 0);
  perform pg_temp.check((pag->>'total')::int = 0, 'el % se busca tal cual');
  pag := public.admin_people('persona2', 'invitados', 'creado_at', 50, 0);
  perform pg_temp.check((pag->>'total')::int = 3, 'búsqueda y filtro juntos: Persona21, 24 y 27');

  -- Límites sanos.
  perform pg_temp.check(jsonb_array_length(public.admin_people(null, 'todos', 'creado_at', 5000, 0)->'personas')
                        <= 200, 'nunca más de 200 por página');
  perform pg_temp.check(jsonb_array_length(public.admin_people(null, 'cualquiera', 'cualquiera', 50, -3)->'personas')
                        = least(50, (viejo->'totales'->>'personas')::int), 'valores raros caen en los de siempre');
end
$test$;

-- Alguien que no es admin no ve nada.
select set_config('request.jwt.claim.sub', pg_temp.persona(2)::text, true),
       set_config('request.jwt.claims', json_build_object('sub', pg_temp.persona(2))::text, true) \g /dev/null
do $test$
begin
  begin
    perform public.admin_people();
    raise exception 'admin personas: alguien que no es admin pudo ver la lista';
  exception when others then
    if sqlerrm not like '%solo el admin%' then raise; end if;
  end;
end
$test$;
reset role;

-- Y sin sesión, tampoco.
set local role anon;
do $test$
begin
  perform public.admin_people();
  raise exception 'admin personas: anon pudo llamar a la función';
exception when insufficient_privilege then null;
end
$test$;
reset role;

rollback;
\echo 'OK: lista de personas del admin, igual a la de antes y de a páginas'
