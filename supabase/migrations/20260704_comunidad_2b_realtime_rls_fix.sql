-- ============================================================
-- Fix Realtime: las políticas de SELECT con rol `authenticated` NO entregan por
-- Realtime en este proyecto (el chat solo se veía al refrescar). Las tablas que
-- sí funcionan en vivo (games, tables) usan rol `public`. Alineamos chat_messages
-- y game_invites a `public` (manteniendo el filtro por auth.uid() donde aplica),
-- así los avisos en vivo llegan de verdad.
-- ============================================================

drop policy if exists "chat visible para logueados" on public.chat_messages;
create policy "chat visible para todos" on public.chat_messages
  for select to public using (true);

drop policy if exists "ver mis invitaciones" on public.game_invites;
create policy "ver mis invitaciones" on public.game_invites
  for select to public using ((auth.uid() = from_id) or (auth.uid() = to_id));
