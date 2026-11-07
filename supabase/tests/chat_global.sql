-- Solo en base descartable reconstruida. Se revierte todo al terminar.
-- Chat global: filtro de groserías, sin borrado al azar, tope diario de 500.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'chat global: %',detail; end if; end $$;

insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
  ('c9000000-0000-4000-a000-000000000001','global-a@test.invalid',false,'{"username":"Global A"}');
insert into public.profiles(id,username,is_bot) values
  ('c9000000-0000-4000-a000-000000000001','Global A',false)
on conflict (id) do update set username=excluded.username,is_bot=excluded.is_bot;

-- Lo que se tapa y lo que pasa, comparado contra el resultado exacto.
select pg_temp.check(public._chat_censor(e) = s, format('%L -> %L (esperaba %L)', e, public._chat_censor(e), s))
from (values
  ('sos un PUTO', 'sos un ****'),
  ('putoooo', '*******'),
  ('P0rong4 jaja', '******* jaja'),
  ('hijo de   puta vos', '************** vos'),
  ('negro de mierda', '***************'),
  ('qué maricón', 'qué *******'),
  ('Matate HDP', '****** ***'),
  ('dale boludo, la puta madre', 'dale boludo, la puta madre'),
  ('que orto tenés', 'que orto tenés'),
  ('me disputo el computo', 'me disputo el computo'),
  ('quiero vale cuatro', 'quiero vale cuatro'),
  ('🧉 truco!', '🧉 truco!')
) t(e, s);

-- Por la función real, como usuario.
do $$
declare a uuid := 'c9000000-0000-4000-a000-000000000001'; v text;
begin
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'is_anonymous',false)::text,true);
  set local role authenticated;
  perform public.send_chat_message('  sos un trolo  ');
  reset role;
  select body into v from public.chat_messages where user_id=a order by created_at desc limit 1;
  perform pg_temp.check(v = 'sos un *****', 'send_chat_message guarda el texto tapado: ' || v);
end $$;

-- Ya no se borra nada al mandar.
select pg_temp.check(pg_get_functiondef('public.send_chat_message(text)'::regprocedure) !~* 'delete|random',
  'send_chat_message no borra mensajes');

-- La tarea diaria (la base local imita cron sin guardar tareas: se comprueba
-- en producción) corre este mismo borrado.
insert into public.chat_messages(user_id,username,body,created_at)
select 'c9000000-0000-4000-a000-000000000001','Global A','viejo '||i, now() - interval '30 days' - make_interval(mins => i)
from generate_series(1,600) i;

-- La tarea diaria deja los 500 más nuevos.
delete from public.chat_messages where id in
  (select id from public.chat_messages order by created_at desc offset 500);
select pg_temp.check((select count(*) from public.chat_messages) = 500, 'quedan 500');
select pg_temp.check(exists(select 1 from public.chat_messages where body = 'sos un *****'), 'el más nuevo queda');
select pg_temp.check(not exists(select 1 from public.chat_messages where body = 'viejo 600'), 'el más viejo se va');

-- La lista y el filtro no son API del navegador.
select pg_temp.check(not has_table_privilege('authenticated','public.chat_banned_words','select'), 'lista cerrada');
select pg_temp.check(not has_function_privilege('authenticated','public._chat_censor(text)','execute'), 'filtro cerrado');
select pg_temp.check(not has_function_privilege('anon','public._chat_normalize(text)','execute'), 'normalizar cerrado');

\echo 'OK: chat global'
rollback;
