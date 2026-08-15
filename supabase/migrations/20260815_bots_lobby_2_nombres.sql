-- ============================================================
-- TRUCAZO — Bots del lobby (2): que vayan cambiando de nombre
-- Fecha: 2026-08-15
--
-- El problema: con tres nombres fijos, a las dos o tres partidas cualquiera se
-- da cuenta de que es siempre el mismo. La gracia se pierde.
--
-- La solución: una lista grande de nombres de jugador, y cada vez que un bot se
-- sienta a una mesa (o abre una), se pone uno distinto. Como el nombre queda
-- GUARDADO en la fila de la mesa y de la partida, cada partida conserva para
-- siempre el nombre con el que se jugó: el historial no se altera, y una
-- partida en curso no cambia de nombre a mitad de camino.
--
-- De paso, al cambiar de nombre también se le mueve un poco el carácter (cuánto
-- farolea y cuánto presiona), así el "jugador nuevo" tampoco se delata por
-- jugar siempre igual. La dificultad NO se toca: siguen al máximo.
--
-- Va después de 20260815_bots_lobby.sql (por orden alfabético, el "." del
-- archivo anterior va antes que el "_" de este).
--
-- Idempotente: se puede correr más de una vez sin efecto extra.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. LA LISTA DE NOMBRES
--
-- Es una tabla (no una lista escondida en el código) para que agregar o sacar
-- nombres sea un INSERT o un DELETE, sin tocar ninguna función.
-- ------------------------------------------------------------

create table if not exists public.lobby_bot_names (
  name text primary key
);

alter table public.lobby_bot_names enable row level security;
-- Sin policies: es una tabla interna. Solo la leen las funciones definer.

insert into public.lobby_bot_names (name) values
  ('ElRusso92'), ('Tincho_Ok'), ('Naty_Rosario'), ('Colo_Fernandez'),
  ('MartinaB'), ('elpepe77'), ('Guille.Truco'), ('Sofi_Mendoza'),
  ('DonAlberto'), ('Fer_Quilmes'), ('Nacho1985'), ('Marce_Tucuman'),
  ('ChinoOk'), ('Vicky_LP'), ('ElTanoJose'), ('Rulo_Cordoba'),
  ('Peto_Rosario'), ('Sabri_Ok'), ('DiegoMza'), ('Flor_Salta'),
  ('ElNegroRamon'), ('Cami_2000'), ('Lucho_Bahia'), ('Pipa_Ok'),
  ('Andre_Neuquen'), ('Beto.Truco'), ('Rochi_SF'), ('ElGalleGomez'),
  ('Mati_Junin'), ('Silvi_Ok'), ('Emi_Parana'), ('LaTefi'),
  ('Nico_Ok'), ('Vale_Cba'), ('ElFlaco_Ariel'), ('Meli_Ushuaia'),
  ('Juanma_LaPlata'), ('Ceci_Ok'), ('ElChaqueño'), ('Toti_Moron'),
  ('Pauli_Ok'), ('ElVascoMartin'), ('Dai_Corrientes'), ('Seba_Ok'),
  ('LaChinaLu'), ('Fede_SanJuan'), ('ElPolacoDani'), ('Yani_Ok')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 2. EL CAMBIO DE NOMBRE
--
-- Elige un nombre de la lista que NO esté usado por nadie (ni por una persona
-- de verdad ni por otro bot). Como el nombre actual del propio bot también está
-- "usado", nunca le vuelve a tocar el mismo: siempre cambia.
-- Si por lo que sea no hay ninguno libre, se queda con el que tiene.
-- ------------------------------------------------------------

create or replace function public._rename_lobby_bot(p_bot uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_name text;
begin
  select n.name into v_name
    from lobby_bot_names n
   where not exists (
           select 1 from profiles p where lower(p.username) = lower(n.name))
   order by random()
   limit 1;

  if v_name is null then return; end if;

  update profiles set username = v_name where id = p_bot and is_bot;

  -- Carácter nuevo para el "jugador nuevo" (la dificultad queda en el máximo).
  update lobby_bots
     set trait_liar       = 3 + floor(random() * 7)::smallint,   -- 3..9
         trait_aggressive = 3 + floor(random() * 7)::smallint    -- 3..9
   where bot_id = p_bot;
end;
$function$;

-- ------------------------------------------------------------
-- 3. USARLO AL SENTARSE
--
-- Las dos funciones quedan igual que antes; lo único que se agrega es el
-- cambio de nombre justo ANTES de leer el nombre que se va a guardar en la
-- mesa. Así la mesa y la partida nacen ya con el nombre nuevo.
-- ------------------------------------------------------------

create or replace function public.bot_join_table(p_table_id uuid)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  t     tables%rowtype;
  v_bot uuid;
  v_un  text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.creator_id <> auth.uid() then raise exception 'no es tu mesa'; end if;
  if t.is_private then return t; end if;
  if t.status <> 'waiting' or t.opponent_id is not null then return t; end if;

  v_bot := public._free_lobby_bot();
  if v_bot is null then return t; end if;

  perform public._bot_topup(v_bot);
  perform public._rename_lobby_bot(v_bot);          -- se presenta con otro nombre
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

create or replace function public.ensure_lobby_tables()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_want  constant int := 2;      -- mesas públicas en espera que queremos ver
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

  select count(*) into v_open from tables where status = 'waiting' and not is_private;

  while v_open + n < v_want loop
    v_bot := public._free_lobby_bot();
    exit when v_bot is null;

    perform public._bot_topup(v_bot);
    perform public._rename_lobby_bot(v_bot);        -- cada mesa, un nombre distinto
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

-- La ayudante interna no la llama nadie de afuera.
revoke execute on function public._rename_lobby_bot(uuid) from anon, authenticated, public;

commit;
