-- ============================================================
-- TRUCAZO — FOTO de la base: llaves, restricciones y seguridad (snapshot)
-- Generado: 2026-06-29
--
-- Row Level Security (RLS) activado por tabla, llaves primarias/foráneas,
-- restricciones (check/unique), políticas de acceso e índices.
-- Orden de restauración desde cero: extensiones → tables.sql → functions.sql →
-- policies.sql (este archivo va último: las llaves foráneas necesitan que las
-- tablas ya existan).
--
-- Nota de seguridad: games y game_hands SOLO tienen política de SELECT — no hay
-- INSERT/UPDATE para el cliente. Eso es a propósito (etapa "lock down"): la
-- partida solo la mueven las funciones security definer. feedback tiene RLS pero
-- NINGUNA política: se escribe solo por la RPC submit_feedback (definer) y el
-- dueño la lee desde el panel de Supabase (ignora RLS).
-- ============================================================

alter table public.campaign_progress enable row level security;
alter table public.campaign_provinces enable row level security;
alter table public.campaign_rivals enable row level security;
alter table public.campaign_style enable row level security;
alter table public.chat_messages enable row level security;
alter table public.feedback enable row level security;
alter table public.friendships enable row level security;
alter table public.game_hands enable row level security;
alter table public.game_history enable row level security;
alter table public.game_invites enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.game_presence enable row level security;
alter table public.games enable row level security;
alter table public.news enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_salons enable row level security;
alter table public.salons enable row level security;
alter table public.profile_frames enable row level security;
alter table public.frames enable row level security;
alter table public.profile_medals enable row level security;
alter table public.medals enable row level security;
alter table public.profile_accessories enable row level security;
alter table public.accessories enable row level security;
alter table public.tables enable row level security;
alter table public.user_presence enable row level security;

alter table public.campaign_progress add constraint campaign_progress_pkey PRIMARY KEY (user_id, rival_id);
alter table public.campaign_progress add constraint campaign_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.campaign_progress add constraint campaign_progress_rival_id_fkey FOREIGN KEY (rival_id) REFERENCES campaign_rivals(id) ON DELETE CASCADE;
alter table public.campaign_provinces add constraint campaign_provinces_pkey PRIMARY KEY (id);
alter table public.campaign_provinces add constraint campaign_provinces_order_index_key UNIQUE (order_index);
alter table public.campaign_provinces add constraint campaign_provinces_slug_key UNIQUE (slug);
alter table public.campaign_rivals add constraint campaign_rivals_pkey PRIMARY KEY (id);
alter table public.campaign_rivals add constraint campaign_rivals_order_index_key UNIQUE (order_index);
alter table public.campaign_rivals add constraint campaign_rivals_slug_key UNIQUE (slug);
alter table public.campaign_rivals add constraint campaign_rivals_target_score_chk CHECK ((target_score = ANY (ARRAY[15, 30])));
alter table public.campaign_rivals add constraint campaign_rivals_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES profiles(id);
alter table public.campaign_rivals add constraint campaign_rivals_province_id_fkey FOREIGN KEY (province_id) REFERENCES campaign_provinces(id);
alter table public.campaign_style add constraint campaign_style_pkey PRIMARY KEY (user_id);
alter table public.campaign_style add constraint campaign_style_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.feedback add constraint feedback_pkey PRIMARY KEY (id);
alter table public.feedback add constraint feedback_rating_aesthetics_check CHECK (((rating_aesthetics >= 1) AND (rating_aesthetics <= 5)));
alter table public.feedback add constraint feedback_rating_general_check CHECK (((rating_general >= 1) AND (rating_general <= 5)));
alter table public.feedback add constraint feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.chat_messages add constraint chat_messages_pkey PRIMARY KEY (id);
alter table public.chat_messages add constraint chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friendships add constraint friendships_pkey PRIMARY KEY (id);
alter table public.friendships add constraint friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friendships add constraint friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friendships add constraint friendships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])));
alter table public.friendships add constraint friendships_not_self CHECK ((requester_id <> addressee_id));
alter table public.game_hands add constraint game_hands_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_hands add constraint game_hands_pkey PRIMARY KEY (game_id, player_id);
alter table public.game_history add constraint game_history_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_history add constraint game_history_pkey PRIMARY KEY (id);
alter table public.game_history add constraint game_history_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_history add constraint game_history_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])));
alter table public.game_invites add constraint game_invites_pkey PRIMARY KEY (id);
alter table public.game_invites add constraint game_invites_from_id_fkey FOREIGN KEY (from_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_invites add constraint game_invites_to_id_fkey FOREIGN KEY (to_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.game_invites add constraint game_invites_table_id_fkey FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE;
alter table public.game_invites add constraint game_invites_not_self CHECK ((from_id <> to_id));
alter table public.groups add constraint groups_pkey PRIMARY KEY (id);
alter table public.groups add constraint groups_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.group_members add constraint group_members_pkey PRIMARY KEY (user_id);
alter table public.group_members add constraint group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.group_members add constraint group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
alter table public.group_invites add constraint group_invites_pkey PRIMARY KEY (id);
alter table public.group_invites add constraint group_invites_unique UNIQUE (group_id, to_id);
alter table public.group_invites add constraint group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
alter table public.group_invites add constraint group_invites_from_id_fkey FOREIGN KEY (from_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.group_invites add constraint group_invites_to_id_fkey FOREIGN KEY (to_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.news add constraint news_pkey PRIMARY KEY (id);
alter table public.game_presence add constraint game_presence_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.game_presence add constraint game_presence_pkey PRIMARY KEY (game_id, player_id);
alter table public.games add constraint games_campaign_rival_id_fkey FOREIGN KEY (campaign_rival_id) REFERENCES campaign_rivals(id);
alter table public.games add constraint games_id_fkey FOREIGN KEY (id) REFERENCES tables(id) ON DELETE CASCADE;
alter table public.games add constraint games_pkey PRIMARY KEY (id);
alter table public.games add constraint games_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES profiles(id);
alter table public.games add constraint games_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES profiles(id);
alter table public.games add constraint games_status_check CHECK ((status = ANY (ARRAY['playing'::text, 'finished'::text])));
alter table public.games add constraint games_target_score_chk CHECK ((target_score = ANY (ARRAY[15, 30])));
alter table public.games add constraint games_time_limit_chk CHECK ((time_limit = ANY (ARRAY[15, 30])));
alter table public.games add constraint games_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES profiles(id);
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_username_key UNIQUE (username);
alter table public.salons add constraint salons_pkey PRIMARY KEY (slug);
alter table public.salons add constraint salons_price_check CHECK ((price >= 0));
alter table public.profile_salons add constraint profile_salons_pkey PRIMARY KEY (profile_id, salon_slug);
alter table public.profile_salons add constraint profile_salons_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.profile_salons add constraint profile_salons_salon_slug_fkey FOREIGN KEY (salon_slug) REFERENCES salons(slug) ON DELETE CASCADE;
alter table public.frames add constraint frames_pkey PRIMARY KEY (slug);
alter table public.frames add constraint frames_price_check CHECK ((price >= 0));
alter table public.profile_frames add constraint profile_frames_pkey PRIMARY KEY (profile_id, frame_slug);
alter table public.profile_frames add constraint profile_frames_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.profile_frames add constraint profile_frames_frame_slug_fkey FOREIGN KEY (frame_slug) REFERENCES frames(slug) ON DELETE CASCADE;
alter table public.medals add constraint medals_pkey PRIMARY KEY (slug);
alter table public.profile_medals add constraint profile_medals_pkey PRIMARY KEY (profile_id, medal_slug);
alter table public.profile_medals add constraint profile_medals_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.profile_medals add constraint profile_medals_medal_slug_fkey FOREIGN KEY (medal_slug) REFERENCES medals(slug) ON DELETE CASCADE;
alter table public.accessories add constraint accessories_pkey PRIMARY KEY (slug);
alter table public.accessories add constraint accessories_price_check CHECK ((price >= 0));
alter table public.profile_accessories add constraint profile_accessories_pkey PRIMARY KEY (profile_id, accessory_slug);
alter table public.profile_accessories add constraint profile_accessories_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.profile_accessories add constraint profile_accessories_accessory_slug_fkey FOREIGN KEY (accessory_slug) REFERENCES accessories(slug) ON DELETE CASCADE;
alter table public.user_presence add constraint user_presence_pkey PRIMARY KEY (user_id);
alter table public.user_presence add constraint user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.tables add constraint tables_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.tables add constraint tables_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.tables add constraint tables_pkey PRIMARY KEY (id);
alter table public.tables add constraint tables_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'playing'::text, 'finished'::text])));
alter table public.tables add constraint tables_target_score_chk CHECK ((target_score = ANY (ARRAY[15, 30])));
alter table public.tables add constraint tables_time_limit_chk CHECK ((time_limit = ANY (ARRAY[15, 30])));

create policy "El creador puede eliminar su mesa" on public.tables for DELETE to public using ((auth.uid() = creator_id));
create policy "rivales visibles para todos" on public.campaign_rivals for SELECT to anon, authenticated using (true);
create policy "provincias visibles para todos" on public.campaign_provinces for SELECT to anon, authenticated using (true);
create policy "ver mi estilo" on public.campaign_style for SELECT to authenticated using ((auth.uid() = user_id));
create policy "ver mi progreso" on public.campaign_progress for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Las mesas son visibles para todos" on public.tables for SELECT to public using (true);
create policy "Los jugadores pueden ver su partida" on public.games for SELECT to public using (((auth.uid() = player1_id) OR (auth.uid() = player2_id)));
create policy "Los perfiles son visibles para todos" on public.profiles for SELECT to public using (true);
-- Tienda: el catálogo lo ve cualquiera; las compras, cada uno la suya
-- (no hay INSERT/UPDATE de cliente: escribe solo buy_salon, security definer).
create policy "salons_select_all" on public.salons for SELECT to public using (true);
create policy "profile_salons_select_own" on public.profile_salons for SELECT to authenticated using ((profile_id = auth.uid()));
create policy "frames_select_all" on public.frames for SELECT to public using (true);
create policy "profile_frames_select_own" on public.profile_frames for SELECT to authenticated using ((profile_id = auth.uid()));
create policy "medals_select_all" on public.medals for SELECT to public using (true);
create policy "profile_medals_select_own" on public.profile_medals for SELECT to authenticated using ((profile_id = auth.uid()));
create policy "accessories_select_all" on public.accessories for SELECT to public using (true);
create policy "profile_accessories_select_own" on public.profile_accessories for SELECT to authenticated using ((profile_id = auth.uid()));
create policy "Los usuarios autenticados pueden crear mesas" on public.tables for INSERT to public with check ((auth.uid() = creator_id));
create policy "Los usuarios pueden crear su propio perfil" on public.profiles for INSERT to public with check ((auth.uid() = id));
create policy "Los usuarios ven su propio historial" on public.game_history for SELECT to public using ((auth.uid() = player_id));
create policy "ver mi mano" on public.game_hands for SELECT to public using ((auth.uid() = player_id));
-- Comunidad: el cliente SOLO lee; todas las escrituras pasan por RPCs definer.
-- Nota: chat_messages y game_invites usan rol `public` (no `authenticated`)
-- porque Realtime en este proyecto NO entrega con `authenticated` (el filtro por
-- auth.uid() sigue restringiendo las invitaciones a sus participantes).
create policy "chat visible para todos" on public.chat_messages for SELECT to public using (true);
create policy "presencia visible para logueados" on public.user_presence for SELECT to authenticated using (true);
create policy "ver mis amistades" on public.friendships for SELECT to authenticated using (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));
create policy "ver mis invitaciones" on public.game_invites for SELECT to public using (((auth.uid() = from_id) OR (auth.uid() = to_id)));
create policy "ver mi grupo" on public.groups for SELECT to public using ((id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
create policy "ver co-miembros" on public.group_members for SELECT to public using ((group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
create policy "ver mis invitaciones de grupo" on public.group_invites for SELECT to public using (((auth.uid() = to_id) OR (auth.uid() = from_id)));
create policy "novedades visibles para todos" on public.news for SELECT to public using (true);

CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles USING btree (lower(username));
-- Una sola fila por par de jugadores (en cualquier dirección)
CREATE UNIQUE INDEX friendships_pair_key ON public.friendships USING btree (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
-- Una invitación a jugar activa por jugador
CREATE UNIQUE INDEX game_invites_one_per_inviter ON public.game_invites USING btree (from_id);
CREATE INDEX chat_messages_created_idx ON public.chat_messages USING btree (created_at);
CREATE INDEX group_members_group_idx ON public.group_members USING btree (group_id);
CREATE INDEX news_created_idx ON public.news USING btree (created_at DESC);

-- Realtime: game_invites, chat_messages y group_invites publican cambios (avisos
-- en vivo; respetan la RLS de SELECT, que debe ser `to public`). games y tables
-- se configuran a mano en el panel; estas se agregaron por SQL.
alter publication supabase_realtime add table public.game_invites;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.group_invites;

-- ------------------------------------------------------------
-- Storage (depósito de imágenes de las reseñas). El depósito debe existir antes
-- de la política. Cualquiera en la app puede SUBIR (no leer) imágenes ahí.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('feedback-images', 'feedback-images', false)
  on conflict (id) do nothing;
create policy "feedback subir imagenes" on storage.objects for INSERT to anon, authenticated with check ((bucket_id = 'feedback-images'::text));
