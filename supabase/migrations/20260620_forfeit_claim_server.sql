-- ============================================================
-- TRUCAZO — Etapa 4: abandono y reclamar victoria, validados en el servidor
-- Fecha: 2026-06-20
--
-- game_presence  : heartbeat por jugador (NO en Realtime). Cada cliente marca
--                  que sigue vivo cada pocos segundos vía touch_presence.
-- forfeit        : abandono = derrota; el rival cobra el pozo.
-- claim_victory  : solo procede si el rival no dio señales de vida hace > 30s
--                  (antes el cliente podía autodeclararse ganador a voluntad).
--
-- Idempotente.
-- ============================================================

begin;

create table if not exists public.game_presence (
  game_id      uuid not null references public.games(id) on delete cascade,
  player_id    uuid not null,
  last_seen_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

alter table public.game_presence enable row level security;
-- Sin policies de cliente: solo las funciones definer leen/escriben presencia.

create or replace function public.touch_presence(p_game_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  insert into game_presence (game_id, player_id, last_seen_at)
  values (p_game_id, auth.uid(), now())
  on conflict (game_id, player_id) do update set last_seen_at = now();
end;
$function$;

create or replace function public.forfeit(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; oppid uuid;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  oppid := case when auth.uid() = g.player1_id then g.player2_id else g.player1_id end;
  perform public.finish_game(p_game_id, oppid, g.player1_score, g.player2_score);
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

create or replace function public.claim_victory(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g      games%rowtype;
  oppid  uuid;
  v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  oppid := case when auth.uid() = g.player1_id then g.player2_id else g.player1_id end;

  -- Última señal de vida del rival; si nunca marcó, usamos la creación de la partida.
  select last_seen_at into v_last from game_presence where game_id = p_game_id and player_id = oppid;
  v_last := coalesce(v_last, g.created_at);

  if now() - v_last <= interval '30 seconds' then
    raise exception 'el rival sigue conectado';
  end if;

  perform public.finish_game(p_game_id, auth.uid(), g.player1_score, g.player2_score);
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

grant execute on function public.touch_presence(uuid) to anon, authenticated;
grant execute on function public.forfeit(uuid)        to anon, authenticated;
grant execute on function public.claim_victory(uuid)  to anon, authenticated;

commit;
