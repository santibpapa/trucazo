-- ============================================================
-- TRUCAZO — FOTO de la base: llaves, restricciones y seguridad (snapshot)
-- Generado: 2026-06-26
--
-- Row Level Security (RLS) activado por tabla, llaves primarias/foráneas,
-- restricciones (check/unique), políticas de acceso e índices.
-- Orden de restauración desde cero: extensiones → tables.sql → functions.sql →
-- policies.sql (este archivo va último: las llaves foráneas necesitan que las
-- tablas ya existan).
--
-- Nota de seguridad: games y game_hands SOLO tienen política de SELECT — no hay
-- INSERT/UPDATE para el cliente. Eso es a propósito (etapa "lock down"): la
-- partida solo la mueven las funciones security definer.
-- ============================================================

alter table public.game_hands enable row level security;
alter table public.game_history enable row level security;
alter table public.game_presence enable row level security;
alter table public.games enable row level security;
alter table public.profiles enable row level security;
alter table public.tables enable row level security;

alter table public.game_hands add constraint game_hands_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_hands add constraint game_hands_pkey PRIMARY KEY (game_id, player_id);
alter table public.game_history add constraint game_history_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_history add constraint game_history_pkey PRIMARY KEY (id);
alter table public.game_history add constraint game_history_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_history add constraint game_history_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])));
alter table public.game_presence add constraint game_presence_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_presence add constraint game_presence_pkey PRIMARY KEY (game_id, player_id);
alter table public.games add constraint games_id_fkey FOREIGN KEY (id) REFERENCES tables(id) ON DELETE CASCADE;
alter table public.games add constraint games_pkey PRIMARY KEY (id);
alter table public.games add constraint games_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES profiles(id);
alter table public.games add constraint games_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES profiles(id);
alter table public.games add constraint games_status_check CHECK ((status = ANY (ARRAY['playing'::text, 'finished'::text])));
alter table public.games add constraint games_target_score_chk CHECK ((target_score = ANY (ARRAY[15, 30])));
alter table public.games add constraint games_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES profiles(id);
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_username_key UNIQUE (username);
alter table public.tables add constraint tables_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.tables add constraint tables_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.tables add constraint tables_pkey PRIMARY KEY (id);
alter table public.tables add constraint tables_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'playing'::text, 'finished'::text])));
alter table public.tables add constraint tables_target_score_chk CHECK ((target_score = ANY (ARRAY[15, 30])));

create policy "El creador puede eliminar su mesa" on public.tables for DELETE to public using ((auth.uid() = creator_id));
create policy "El sistema puede insertar historial" on public.game_history for INSERT to public with check ((auth.uid() = player_id));
create policy "Las mesas son visibles para todos" on public.tables for SELECT to public using (true);
create policy "Los jugadores pueden ver su partida" on public.games for SELECT to public using (((auth.uid() = player1_id) OR (auth.uid() = player2_id)));
create policy "Los perfiles son visibles para todos" on public.profiles for SELECT to public using (true);
create policy "Los usuarios autenticados pueden crear mesas" on public.tables for INSERT to public with check ((auth.uid() = creator_id));
create policy "Los usuarios pueden crear su propio perfil" on public.profiles for INSERT to public with check ((auth.uid() = id));
create policy "Los usuarios ven su propio historial" on public.game_history for SELECT to public using ((auth.uid() = player_id));
create policy "ver mi mano" on public.game_hands for SELECT to public using ((auth.uid() = player_id));

CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles USING btree (lower(username));
