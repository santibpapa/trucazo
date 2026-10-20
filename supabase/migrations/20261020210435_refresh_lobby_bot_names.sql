-- TRUCAZO — Reemplazar los 48 nombres rotativos por la lista aprobada.
-- También la usan los nuevos bots de parejas.
-- Las partidas iniciadas y el historial conservan sus nombres.
-- Repetible: una mesa que ya usa la lista nueva no se renombra otra vez.

begin;

-- Compartir la cola de creación/ingreso evita elegir nombres viejos durante el cambio.
select pg_advisory_xact_lock(811501);

delete from public.lobby_bot_names where name is not null;

insert into public.lobby_bot_names (name) values
  ('nico87'), ('Lauri'), ('juan_p'), ('pelado72'),
  ('carlitos'), ('Tomi'), ('pablod'), ('marta_63'),
  ('agustinlp'), ('Nanu'), ('facu.22'), ('juli78'),
  ('rodri'), ('Luli'), ('maxi_90'), ('marian'),
  ('gastonb'), ('Romina'), ('flaquito'), ('ale.cba'),
  ('lucas_17'), ('Mabel'), ('negro83'), ('sofi'),
  ('rober'), ('Lucre'), ('joaco_10'), ('caro.m'),
  ('diego74'), ('Pochi'), ('ezequiel'), ('sil_82'),
  ('martinlp'), ('Noe'), ('pepe_56'), ('vale'),
  ('dario'), ('Mica'), ('gonza_93'), ('vero.r'),
  ('ruben60'), ('Cintia'), ('elcolo'), ('anto_21'),
  ('fabi'), ('Maru'), ('charly_70'), ('paula.s');

-- Renovar sólo las mesas 1v1 que siguen esperando, sin tocar partidas ni rasgos.
do $names$
declare
  v_table record;
  v_name text;
begin
  for v_table in
    select t.id, t.creator_id
      from public.tables t
      join public.lobby_bots lb on lb.bot_id = t.creator_id
     where t.status = 'waiting' and t.opponent_id is null
       and not exists (
         select 1 from public.games g
          where g.status = 'playing'
            and t.creator_id in (g.player1_id, g.player2_id))
       and not exists (
         select 1 from public.lobby_bot_names n where n.name = t.creator_username)
     order by t.id
     for update of t
  loop
    select n.name into v_name
      from public.lobby_bot_names n
     where not exists (
       select 1 from public.profiles p where lower(p.username) = lower(n.name))
     order by random()
     limit 1;

    if v_name is not null then
      update public.profiles set username = v_name
       where id = v_table.creator_id and is_bot;
      update public.tables set creator_username = v_name where id = v_table.id;
    end if;
  end loop;
end;
$names$;

commit;
