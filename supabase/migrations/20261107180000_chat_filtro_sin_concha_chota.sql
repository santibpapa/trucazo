-- ============================================================
-- TRUCAZO — Filtro del chat global: "concha" y "chota" pasan
-- Fecha: 2026-11-07 · Ver docs/backend.md → chat-global-2026-11-07
--
-- Pedido del dueño: se usan mucho de onda ("la concha de la lora", "esta carta
-- es una chota"). "Conchudo/a" sigue tapado. Idempotente.
-- ============================================================

delete from public.chat_banned_words where pattern in ('conch(a|as|ud[oa]s?)', 'chotas?');
insert into public.chat_banned_words(pattern) values ('conchud[oa]s?') on conflict do nothing;
