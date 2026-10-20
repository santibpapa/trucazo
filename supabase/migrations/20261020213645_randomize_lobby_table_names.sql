-- TRUCAZO — Mezclar títulos personales y casuales en las mesas automáticas.
-- Mitad «Mesa de <creador>» y mitad una de 24 frases cortas, elegidas al azar.
-- Las frases no anuncian un puntaje que pueda contradecir la configuración.

begin;

select pg_advisory_xact_lock(811501);

create or replace function public.ensure_lobby_tables()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_want  constant int := 2;      -- mesas públicas en espera que queremos ver
  v_lock  constant bigint := 811501;
  v_names constant text[] := array[
    'sale una', 'sin llorar', 'una y me voy', 'venite',
    'dale nomas', 'sale truco', 'truquito', 'una rapidita',
    'quien se prende', 'pasen', 'jugamos?', 'la ultima',
    'tengo un rato', 'a ver que sale', 'una mas', 'aca se juega',
    'vengan de a uno', 'el desquite', 'hoy gano yo', 'dale que arranca',
    'mate y truco', 'de sobremesa', 'se juega', 'el ultimo y me voy'
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
    values (case when random() < 0.5 then 'Mesa de ' || v_un
                 else v_names[1 + floor(random() * array_length(v_names, 1))]
            end,
            v_bot, v_un, v_bet, false, null, 'waiting', v_score, 30);

    n := n + 1;
  end loop;

  return n;
end;
$function$;

-- Sólo renovar títulos anteriores de bots en mesas públicas todavía en espera.
update public.tables t
   set name = case when random() < 0.5 then 'Mesa de ' || t.creator_username
                   else (array[
    'sale una', 'sin llorar', 'una y me voy', 'venite',
    'dale nomas', 'sale truco', 'truquito', 'una rapidita',
    'quien se prende', 'pasen', 'jugamos?', 'la ultima',
    'tengo un rato', 'a ver que sale', 'una mas', 'aca se juega',
    'vengan de a uno', 'el desquite', 'hoy gano yo', 'dale que arranca',
    'mate y truco', 'de sobremesa', 'se juega', 'el ultimo y me voy'
                   ])[1 + floor(random() * 24)::integer]
              end
 where t.status = 'waiting' and not t.is_private
   and exists (select 1 from public.lobby_bots lb where lb.bot_id = t.creator_id)
   and t.name = any (array['Mesa del club', 'Truco tranqui', 'Una manito', 'La de la esquina', 'Vamos a 30', 'Mesa del fondo', 'A ver quién se anima']);

commit;
