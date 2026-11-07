-- ============================================================
-- TRUCAZO — Chat global: se guardan los últimos 500 y se tapan las groserías
-- Fecha: 2026-11-07 · Ver docs/backend.md → chat-global-2026-11-07
--
-- 1. Antes, cada mensaje nuevo tenía 1 chance en 20 de borrar todos los de más
--    de 3 días: el chat quedaba vacío de golpe y al azar. Ahora no se borra nada
--    al mandar; una tarea diaria deja sólo los 500 más nuevos.
-- 2. Filtro de palabras: send_chat_message tapa con asteriscos los insultos
--    fuertes, discriminatorios y sexuales de `chat_banned_words`. Las puteadas
--    de todos los días ("boludo", "la puta madre") pasan. Sólo chat global.
--    Los mensajes ya guardados no se tocan.
--
-- Agregar una palabra (en el SQL Editor):
--   insert into public.chat_banned_words(pattern) values ('palabra');
-- Se compara sin mayúsculas ni tildes, y con 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s.
-- Cada entrada es un fragmento de expresión regular que tiene que ser una
-- palabra entera ("put+o+s?" tapa "putooo" pero no "computo").
-- Idempotente.
-- ============================================================

create table if not exists public.chat_banned_words (
  pattern text primary key
);
alter table public.chat_banned_words enable row level security;
revoke all on table public.chat_banned_words from public, anon, authenticated;

insert into public.chat_banned_words(pattern) values
  -- Discriminatorios
  ('put+o+s?'), ('putit[oa]s?'), ('trol[oa]s?'), ('maric[oa]n(es)?'), ('maricas?'),
  ('tortiller[oa]s?'), ('travuc[oa]s?'), ('sudacas?'), ('mo?n?golic[oa]s?'),
  ('retrasad[oa]s?\s+mental(es)?'), ('sidos[oa]s?'),
  ('negr[oa]s?\s+(de\s+mierda|cabeza)'), ('cabecitas?\s+negras?'),
  ('(judi|bolivian|paraguay|peruan|chin|chilen)[oa]s?\s+de\s+mierda'),
  ('(bolitas?|paraguas?)\s+de\s+mierda'),
  -- Sexuales
  ('pijas?'), ('pijud[oa]s?'), ('porongas?'), ('chotas?'), ('vergas?'),
  ('conch(a|as|ud[oa]s?)'), ('petes?'), ('peter[oa]s?'), ('garch\w*'),
  ('cog(er|erte|erla|erlo|ete|eme|ida|ido)'), ('coj(er|erte|ete|eme)'),
  ('tetas?'), ('porno\w*'), ('pedofil[oa]s?'), ('violador(es|a|as)?'), ('violar(te|la|lo)'),
  ('sos\s+(una\s+|re\s+)*puta'), ('putas?\s+barata'),
  -- Insultos pesados y amenazas
  ('hij[oa]s?\s+de\s+(re\s*)?putas?'), ('hdp'), ('hdrp'), ('lcdtm'),
  ('matate'), ('suicidate'), ('ahorcate'), ('ojala\s+te\s+mueras'),
  ('te\s+voy\s+a\s+matar'), ('kys')
on conflict do nothing;

-- Misma longitud que el texto original, letra por letra: así las posiciones
-- encontradas en la versión normalizada sirven para tapar el original.
create or replace function public._chat_normalize(p text) returns text
language sql immutable set search_path = '' as $$
  select translate(lower(p), 'áàäâéèëêíìïîóòöôúùüûñ013457@$', 'aaaaeeeeiiiioooouuuunoieastas')
$$;

create or replace function public._chat_censor(p_body text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_out  text := p_body;
  v_norm text := public._chat_normalize(p_body);
  v_re   text;
  v_pos  int;
  v_end  int;
begin
  select '\m(' || string_agg(pattern, '|') || ')\M' into v_re from public.chat_banned_words;
  if v_re is null then return p_body; end if;
  loop
    v_pos := regexp_instr(v_norm, v_re);
    exit when v_pos = 0;
    v_end := regexp_instr(v_norm, v_re, 1, 1, 1);
    -- El asterisco no es letra: lo tapado no vuelve a coincidir.
    v_out  := overlay(v_out  placing repeat('*', v_end - v_pos) from v_pos for v_end - v_pos);
    v_norm := overlay(v_norm placing repeat('*', v_end - v_pos) from v_pos for v_end - v_pos);
  end loop;
  return v_out;
end;
$$;

revoke all on function public._chat_normalize(text) from public, anon, authenticated;
revoke all on function public._chat_censor(text) from public, anon, authenticated;

create or replace function public.send_chat_message(p_body text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  me   uuid := auth.uid();
  v_un text;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'no autenticado'; end if;
  if length(v_body) = 0 then raise exception 'escribí algo'; end if;
  v_body := public._chat_censor(left(v_body, 300));  -- tope de largo y filtro

  if exists (
    select 1 from chat_messages
     where user_id = me and created_at > now() - interval '1.5 seconds'
  ) then
    raise exception 'esperá un momento antes de mandar otro mensaje';
  end if;

  select username into v_un from profiles where id = me;
  if not found then raise exception 'perfil no encontrado'; end if;

  insert into chat_messages (user_id, username, body) values (me, v_un, v_body);
end;
$function$;

-- Todos los días a las 04:45 UTC (01:45 en Argentina) quedan los 500 más nuevos.
select cron.schedule('trucazo-chat-keep-500', '45 4 * * *',
  $$delete from public.chat_messages where id in
      (select id from public.chat_messages order by created_at desc offset 500)$$);
