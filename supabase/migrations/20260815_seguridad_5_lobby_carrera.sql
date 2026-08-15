-- ============================================================
-- TRUCAZO — Seguridad (5 de 5): la carrera de las mesas automáticas
-- Fecha: 2026-08-15
--
-- EL PROBLEMA (mío, del PR de los bots del lobby): `ensure_lobby_tables()` la
-- llama el lobby de cada jugador al abrirse. Si dos personas entran en el mismo
-- instante, las dos cuentan "hay 0 mesas", las dos deciden crear 2, y terminan
-- saliendo 4. Peor: `_free_lobby_bot()` puede devolverle el MISMO bot a las dos
-- llamadas, porque ninguna ve todavía la mesa que la otra está creando. Lo mismo
-- vale para `bot_join_table` cuando dos personas abren mesa a la vez.
--
-- No es un agujero de seguridad: no se roba nada ni se filtra nada. Es un
-- descuido de correctitud que ensucia el lobby.
--
-- EL ARREGLO: un "cartelito de ocupado" (advisory lock) que hace que estas dos
-- operaciones se hagan de a una por vez. La segunda llamada no falla: espera su
-- turno, y cuando entra vuelve a contar las mesas y a elegir el bot, ya viendo lo
-- que hizo la primera. El cartel se suelta solo al terminar la transacción.
--
-- SOBRE EL ÍNDICE ÚNICO que se propuso además (que un bot no pueda tener dos
-- mesas en espera): quedó afuera a propósito. Con el bloqueo, las dos únicas
-- funciones que sientan bots ya no se pisan, así que el índice solo saltaría si
-- algo ajeno creara mesas de bots, cosa que no existe. Y un índice parcial de
-- Postgres no puede preguntar "¿este creador es un bot?" (no puede mirar otra
-- tabla), así que habría que clavar los UUID de los tres bots a mano y se
-- rompería solo al agregar un cuarto. Se prefirió el arreglo que ataca la causa.
--
-- Idempotente.
-- ============================================================

begin;

-- Número arbitrario pero fijo: identifica "la cola de los bots del lobby".
-- pg_advisory_xact_lock espera si otro lo tiene, y lo libera al cerrar la
-- transacción (aunque haya error).

create or replace function public.ensure_lobby_tables()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_want  constant int := 2;      -- mesas públicas en espera que queremos ver
  v_lock  constant bigint := 811501;
  v_names constant text[] := array[
    'Mesa del club', 'Truco tranqui', 'Una manito', 'La de la esquina',
    'Vamos a 30', 'Mesa del fondo', 'A ver quién se anima'
  ];
  v_open  int;
  v_bot   uuid;
  v_un    text;
  v_bet   int;
  v_score int;
  n       int := 0;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  -- De a uno por vez: el que llega segundo espera y después vuelve a contar.
  perform pg_advisory_xact_lock(v_lock);

  select count(*) into v_open from tables where status = 'waiting' and not is_private;

  while v_open + n < v_want loop
    v_bot := public._free_lobby_bot();
    exit when v_bot is null;

    perform public._bot_topup(v_bot);
    perform public._rename_lobby_bot(v_bot);
    select username into v_un from profiles where id = v_bot;

    v_bet   := (array[20, 50, 100])[1 + floor(random() * 3)];
    v_score := case when random() < 0.5 then 15 else 30 end;

    update profiles set coins = coins - v_bet where id = v_bot;

    insert into tables (name, creator_id, creator_username, bet, is_private,
                        private_code, status, target_score, time_limit)
    values (v_names[1 + floor(random() * array_length(v_names, 1))],
            v_bot, v_un, v_bet, false, null, 'waiting', v_score, 30);

    n := n + 1;
  end loop;

  return n;
end;
$function$;

-- Mismo cartel para sentar un bot en una mesa: si dos personas abren mesa a la
-- vez, no puede tocarles el mismo bot.
create or replace function public.bot_join_table(p_table_id uuid)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  t      tables%rowtype;
  v_bot  uuid;
  v_un   text;
  v_lock constant bigint := 811501;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.creator_id <> auth.uid() then raise exception 'no es tu mesa'; end if;
  if t.is_private then return t; end if;
  if t.status <> 'waiting' or t.opponent_id is not null then return t; end if;

  -- De a uno por vez para elegir bot (misma cola que ensure_lobby_tables).
  perform pg_advisory_xact_lock(v_lock);

  v_bot := public._free_lobby_bot();
  if v_bot is null then return t; end if;

  perform public._bot_topup(v_bot);
  perform public._rename_lobby_bot(v_bot);
  select username into v_un from profiles where id = v_bot;
  update profiles set coins = coins - t.bet where id = v_bot;

  update tables
     set opponent_id = v_bot,
         opponent_username = v_un,
         status = 'playing'
   where id = p_table_id
   returning * into t;

  return t;
end;
$function$;

commit;
