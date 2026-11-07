-- ============================================================
-- TRUCAZO — Filtro del chat global: tapar "la concha de tu madre"
-- Fecha: 2026-11-07 · Ver docs/backend.md → chat-global-2026-11-07
--
-- Pedido del dueño. "Concha" sola sigue pasando; también se tapa sin "la".
-- Idempotente.
-- ============================================================

insert into public.chat_banned_words(pattern) values ('(la\s+)?concha\s+de\s+tu\s+madre') on conflict do nothing;
