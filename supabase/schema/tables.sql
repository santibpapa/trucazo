-- ============================================================
-- TRUCAZO — FOTO de la base: estructura de las tablas (snapshot)
-- Generado: 2026-06-29
--
-- Solo columnas. Las llaves (primary/foreign key), restricciones (check/unique),
-- el Row Level Security y las políticas van en policies.sql.
-- Orden de restauración desde cero: extensiones → tables.sql → functions.sql →
-- policies.sql.
-- ============================================================

create table if not exists public.campaign_progress (
  user_id uuid not null,
  rival_id uuid not null,
  beaten_at timestamptz not null default now()
);

create table if not exists public.campaign_rivals (
  id uuid not null default gen_random_uuid(),
  order_index integer not null,
  slug text not null,
  display_name text not null,
  tagline text not null,
  difficulty integer not null,
  target_score integer not null,
  reward_coins integer not null,
  bot_id uuid not null
);

create table if not exists public.feedback (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  rating_general integer,
  rating_aesthetics integer,
  understood boolean,
  had_problem boolean,
  comment text,
  image_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.game_hands (
  game_id uuid not null,
  player_id uuid not null,
  cards jsonb not null default '[]'::jsonb
);

create table if not exists public.game_history (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  opponent_id uuid not null,
  opponent_username text not null,
  result text not null,
  coins_change integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_presence (
  game_id uuid not null,
  player_id uuid not null,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid not null,
  player1_id uuid not null,
  player2_id uuid not null,
  player1_username text not null,
  player2_username text not null,
  player1_score integer not null default 0,
  player2_score integer not null default 0,
  played_cards jsonb not null default '[]'::jsonb,
  current_turn uuid not null,
  mano_player uuid not null,
  hand_number integer not null default 1,
  round_number integer not null default 1,
  envido_state jsonb not null default '{"value": 0, "status": "none", "last_singer": null}'::jsonb,
  truco_state jsonb not null default '{"value": 2, "status": "none", "last_singer": null}'::jsonb,
  round_results jsonb not null default '[]'::jsonb,
  status text not null default 'playing'::text,
  winner_id uuid,
  bet integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  target_score integer not null default 30,
  rematch_p1 boolean not null default false,
  rematch_p2 boolean not null default false,
  rematch_game_id uuid,
  awaiting_deal boolean not null default false,
  time_limit integer not null default 30,
  turn_started_at timestamptz not null default now(),
  mazo_count_p1 integer not null default 0,
  mazo_count_p2 integer not null default 0,
  envido_reveal jsonb,
  campaign_rival_id uuid,
  campaign_reward integer not null default 0
);

create table if not exists public.profiles (
  id uuid not null,
  username text not null,
  coins integer not null default 1000,
  games_played integer not null default 0,
  games_won integer not null default 0,
  games_lost integer not null default 0,
  created_at timestamptz not null default now(),
  is_bot boolean not null default false
);

create table if not exists public.tables (
  id uuid not null default gen_random_uuid(),
  name text not null,
  creator_id uuid not null,
  creator_username text not null,
  opponent_id uuid,
  opponent_username text,
  bet integer not null,
  is_private boolean not null default false,
  private_code text,
  status text not null default 'waiting'::text,
  created_at timestamptz not null default now(),
  target_score integer not null default 30,
  time_limit integer not null default 30
);
