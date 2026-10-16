-- Base descartable. Las vistas previas nunca deben ocupar lugares ni cobrar.
begin;
create function pg_temp.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Invitaciones: %', message; end if; end $$;
create function pg_temp.person(guest boolean default false) returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid(); begin
  insert into auth.users(id, email, is_anonymous, raw_user_meta_data)
    values(u, case when not guest then u || '@test.invalid' end, guest, jsonb_build_object('username', left(u::text, 16)));
  update public.profiles set coins = 1000 where id = u;
  return u;
end $$;

do $$
declare owner_id uuid; guest_id uuid; stranger uuid; t uuid; invite_token uuid; other_token uuid;
  p jsonb; snap jsonb; destination text; private boolean; mode text; blocked boolean; n integer;
begin
  perform pg_temp.check(not has_schema_privilege('anon', 'invite_internal', 'usage'), 'anon no lee claves');
  perform pg_temp.check(not has_schema_privilege('authenticated', 'invite_internal', 'usage'), 'jugadores no enumeran claves');
  perform pg_temp.check(not has_function_privilege('anon', 'public.get_table_invite(uuid,text)', 'execute'), 'anon no genera enlaces');
  perform pg_temp.check(not has_function_privilege('anon', 'public.join_table_invite(uuid)', 'execute'), 'anon no confirma ingresos');
  perform pg_temp.check(has_function_privilege('anon', 'public.preview_table_invite(uuid)', 'execute'), 'preview pública con clave');
  perform pg_temp.check(not exists (select 1 from pg_publication_tables where schemaname = 'invite_internal'), 'claves fuera de Realtime');
  foreach mode in array array['1v1', '2v2'] loop
    foreach private in array array[false, true] loop
      owner_id := pg_temp.person(); guest_id := pg_temp.person(true); stranger := pg_temp.person();
      perform set_config('request.jwt.claim.sub', owner_id::text, true);
      set local role authenticated;
      if mode = '1v1' then
        select id into t from public.create_table('Mesa invitada', 100, private, case when private then left(owner_id::text, 6) end, 15, 30);
      else
        snap := public.team_create(gen_random_uuid(), 'Mesa invitada', 100, 15, 30, private);
        t := (snap->'table'->>'id')::uuid;
      end if;
      invite_token := public.get_table_invite(t, mode);
      other_token := public.get_table_invite(t, mode);
      reset role;
      perform pg_temp.check(invite_token = other_token and invite_token <> t, 'clave estable y distinta al ID de mesa');
      perform pg_temp.check((select coins from public.profiles where id = owner_id) = 900, 'crear enlace no cobra otra apuesta');

      perform set_config('request.jwt.claim.sub', '', true);
      set local role anon;
      p := public.preview_table_invite(invite_token);
      perform pg_temp.check(public.preview_table_invite(gen_random_uuid()) is null, 'enlace desconocido');
      reset role;
      perform pg_temp.check(p->>'mode' = mode and (p->>'available')::boolean, 'preview de ambas modalidades y visibilidades');
      perform pg_temp.check(p->>'bet' = '100' and p->>'target_score' = '15' and p->>'time_limit' = '30', 'opciones reales antes de pagar');
      perform pg_temp.check(p->>'destination' is null and not (p ? 'private_code') and not (p ? 'table_id') and not (p ? 'members') and not (p ? 'hand'), 'preview sin datos privados');
      perform pg_temp.check((select coins from public.profiles where id = guest_id) = 1000, 'abrir enlace no cobra');

      perform set_config('request.jwt.claim.sub', stranger::text, true);
      blocked := false;
      begin set local role authenticated; perform public.get_table_invite(t, mode);
      exception when raise_exception then blocked := true; end;
      reset role; perform pg_temp.check(blocked, 'un tercero no puede obtener enlace por ID');
      update public.profiles set coins = 0 where id = stranger;
      blocked := false;
      begin set local role authenticated; perform public.join_table_invite(invite_token);
      exception when raise_exception then blocked := true; end;
      reset role; perform pg_temp.check(blocked, 'saldo insuficiente no ocupa lugar');

      perform set_config('request.jwt.claim.sub', guest_id::text, true);
      set local role authenticated;
      destination := public.join_table_invite(invite_token);
      perform pg_temp.check(public.join_table_invite(invite_token) = destination, 'reintento vuelve a la misma mesa');
      p := public.preview_table_invite(invite_token);
      reset role;
      perform pg_temp.check(p->>'destination' = destination, 'participante puede retomar desde el enlace');
      perform pg_temp.check((select coins from public.profiles where id = guest_id) = 900, 'invitado paga una sola vez');
      if mode = '1v1' then
        perform pg_temp.check(destination = '/game/' || t, 'destino mano a mano');
        perform pg_temp.check((select opponent_id from public.tables where id = t) = guest_id, 'invitado ocupa lugar');
      else
        perform pg_temp.check(destination = '/game/parejas/' || t, 'destino parejas');
        perform pg_temp.check((select seat is null from public.team_seats where table_id = t and user_id = guest_id), 'no se asigna asiento automáticamente');
        set local role authenticated;
        snap := public.team_snapshot(t);
        perform public.team_action(t, gen_random_uuid(), (snap->'table'->>'version')::bigint, 'seat', 2);
        reset role;
        perform pg_temp.check((select seat from public.team_seats where table_id = t and user_id = guest_id) = 2, 'cada persona elige su lugar');
        -- Completar los otros dos lugares sin asignarles asiento.
        for n in 1..2 loop
          perform set_config('request.jwt.claim.sub', pg_temp.person()::text, true);
          set local role authenticated; perform public.join_table_invite(invite_token); reset role;
        end loop;
      end if;
      perform set_config('request.jwt.claim.sub', stranger::text, true);
      set local role authenticated; p := public.preview_table_invite(invite_token); reset role;
      perform pg_temp.check(not (p->>'available')::boolean and p->>'destination' is null, 'mesa llena no admite terceros');
      blocked := false;
      begin set local role authenticated; perform public.join_table_invite(invite_token);
      exception when raise_exception then blocked := true; end;
      reset role; perform pg_temp.check(blocked, 'confirmación tardía rechazada');
      perform pg_temp.check((select coins from public.profiles where id = stranger) = 0, 'rechazo no cobra');

      perform set_config('request.jwt.claim.sub', owner_id::text, true);
      set local role authenticated; perform public.join_table_invite(invite_token); reset role;
      perform pg_temp.check((select coins from public.profiles where id = owner_id) = 900, 'creador retoma sin pagar de nuevo');
      if mode = '1v1' then update public.tables set status = 'finished' where id = t;
      else update public.team_tables set status = 'cancelled' where id = t; end if;
      set local role authenticated; p := public.preview_table_invite(invite_token); reset role;
      perform pg_temp.check(p is null, 'mesa cerrada invalida enlace');
      blocked := false;
      begin set local role authenticated; perform public.join_table_invite(invite_token);
      exception when raise_exception then blocked := true; end;
      reset role; perform pg_temp.check(blocked, 'no se reabre una mesa cerrada');
      if mode = '1v1' then delete from public.tables where id = t;
      else delete from public.team_tables where id = t; end if;
      perform pg_temp.check(not exists(select 1 from invite_internal.links where links.token = invite_token), 'borrar mesa borra enlace');
    end loop;
  end loop;
end $$;
rollback;
