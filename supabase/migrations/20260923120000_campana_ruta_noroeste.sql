-- Ruta del Noroeste. Ejecutar después de todas las migraciones anteriores.
-- Sólo incorpora contenido; las recompensas y sus topes se liquidan con la
-- función vigente. La ruta exige vencer a Irene en CADA provincia.
begin;

alter table public.campaign_rivals add column if not exists strategy_profile text;

do $check$
begin
  if (select count(*) from public.campaign_rivals where slug = 'antartica') <> 1 then
    raise exception 'Falta Irene (antartica): aplicar primero Ruta Patagónica';
  end if;
end $check$;

insert into public.campaign_provinces
  (id, order_index, slug, name, points_required, required_rival_id)
values
  ('ca7a0000-0000-4000-b000-000000000011', 11, 'la-rioja',  'La Rioja',  17500, (select id from public.campaign_rivals where slug='antartica')),
  ('ca7a0000-0000-4000-b000-000000000012', 12, 'catamarca', 'Catamarca', 22000, (select id from public.campaign_rivals where slug='antartica')),
  ('ca7a0000-0000-4000-b000-000000000013', 13, 'tucuman',   'Tucumán',   26000, (select id from public.campaign_rivals where slug='antartica')),
  ('ca7a0000-0000-4000-b000-000000000014', 14, 'salta',     'Salta',     31000, (select id from public.campaign_rivals where slug='antartica')),
  ('ca7a0000-0000-4000-b000-000000000015', 15, 'jujuy',     'Jujuy',     36500, (select id from public.campaign_rivals where slug='antartica'))
on conflict (id) do nothing;

-- Catálogo temporal para no repetir veinte veces nombres, ID y recompensas.
create temporary table northwest_roster (
  n int primary key, province int, slug text, display_name text, tagline text,
  strategy_profile text, liar int, aggressive int, points_required int,
  ranking_points int, points_reward int, reward_coins int
) on commit drop;

insert into northwest_roster values
  (47,11,'olivarero','Don Eusebio, el Olivarero','Cada aceituna a su tiempo; cada carta también.','paciente',4,4,17500,22000,800,1600),
  (48,11,'chayera','Rita, la Chayera','Entre coplas y harina te cambia el ritmo.','farolera',9,7,18000,23000,850,1700),
  (49,11,'pirquinero','Nicolás, el Pirquinero','Escarba la mesa hasta dar con la veta buena.','calculador',5,6,18500,24000,900,1800),
  (50,11,'hilandera','Amalia, la Hilandera','Te deja tirar del hilo hasta que es tarde.','marcador',6,5,19000,25000,950,1900),
  (51,12,'nogalero','Jacinto, el Nogalero','Guarda lo mejor de la cosecha para el final.','paciente',4,5,22000,26000,1000,2000),
  (52,12,'tejedora','Ofelia, la Tejedora','No hay puntada suelta en su partida.','calculador',5,4,22700,27000,1050,2100),
  (53,12,'arriero-puna','Ramón, el Arriero de la Puna','En la altura aprendió a medir cada riesgo.','marcador',6,6,23400,28000,1100,2200),
  (54,12,'alfarera','Celeste, la Alfarera','De una mano floja hace una trampa firme.','farolera',8,6,24100,29000,1150,2300),
  (55,13,'canero','Lucho, el Cañero','Corta de golpe y no da tiempo a acomodarse.','agresivo',6,9,26000,30000,1200,2400),
  (56,13,'empanadera','Mercedes, la Empanadera','Conoce el punto justo de cada vuelta.','calculador',5,6,26800,31100,1250,2500),
  (57,13,'zafrero','Roque, el Zafrero','Acelera cuando el marcador aprieta.','agresivo',7,10,27600,32200,1300,2600),
  (58,13,'zafrera-mayor','Teresa, la Zafrera Mayor','Cierra la cosecha sin regalar una baza.','marcador',6,7,28400,33400,1350,2700),
  (59,14,'bagualero','Don Hilario, el Bagualero','Parece indomable; en realidad calcula cada salto.','calculador',6,8,31000,34600,1400,2800),
  (60,14,'vinatera','Inés, la Viñatera','Deja madurar el farol hasta el momento preciso.','farolera',9,5,31900,35800,1450,2900),
  (61,14,'gaucho-valle','Fermín, el Gaucho del Valle','Sabe cuándo apretar y cuándo guardar la mejor.','paciente',5,7,32800,37100,1500,3000),
  (62,14,'carpera','Martina, la Carpera','Mueve el partido a su terreno con cada canto.','agresivo',7,9,33700,38400,1550,3100),
  (63,15,'salinero','Eloy, el Salinero','En el blanco de las salinas ve hasta la parda.','calculador',5,7,36500,39800,1600,3200),
  (64,15,'carnavalera','Candelaria, la Carnavalera','La fiesta tapa el farol hasta que ya es tarde.','farolera',10,7,37500,41300,1650,3300),
  (65,15,'quebradeno','Baltasar, el Quebradeño','En la quebrada siempre encuentra otra salida.','marcador',6,8,38500,43000,1700,3400),
  (66,15,'duena-silencio','Doña Aurelia, la Dueña del Silencio','Habla poco y pesa cada palabra como una carta.','paciente',7,7,39500,46500,1850,3800);

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000'::uuid,
       ('b0700000-0000-4000-a000-' || lpad(n::text,12,'0'))::uuid,
       'authenticated','authenticated','bot' || n || '@trucazo.bot',now(),
       '{"provider":"bot","providers":["bot"]}'::jsonb,
       jsonb_build_object('username',display_name),now(),now()
from northwest_roster
on conflict (id) do nothing;

-- GoTrue falla al enumerar usuarios si estos tokens internos son NULL.
-- La reconstrucción local no replica todas las columnas reales de Auth.
do $auth$
declare token_column text;
begin
  foreach token_column in array array[
    'confirmation_token','recovery_token','email_change_token_new','email_change'
  ] loop
    if exists (select 1 from information_schema.columns
               where table_schema='auth' and table_name='users' and column_name=token_column) then
      execute format('update auth.users set %1$I = coalesce(%1$I, '''')
                      where id in (select (''b0700000-0000-4000-a000-'' || lpad(n::text,12,''0''))::uuid from northwest_roster)
                      and %1$I is null', token_column);
    end if;
  end loop;
end $auth$;

insert into public.profiles (id, username, is_bot)
select ('b0700000-0000-4000-a000-' || lpad(n::text,12,'0'))::uuid, display_name, true
from northwest_roster
on conflict (id) do update set username=excluded.username, is_bot=true;

insert into public.campaign_rivals
  (id,order_index,slug,display_name,tagline,difficulty,trait_liar,trait_aggressive,
   target_score,reward_coins,bot_id,province_id,points_required,ranking_points,
   points_reward,strategy_profile)
select ('c1a70000-0000-4000-b000-' || lpad(n::text,12,'0'))::uuid,
       n,slug,display_name,tagline,10,liar,aggressive,30,reward_coins,
       ('b0700000-0000-4000-a000-' || lpad(n::text,12,'0'))::uuid,
       ('ca7a0000-0000-4000-b000-' || lpad(province::text,12,'0'))::uuid,
       points_required,ranking_points,points_reward,strategy_profile
from northwest_roster
on conflict (id) do nothing;

do $check$
begin
  if (select count(*) from public.campaign_provinces where order_index between 11 and 15
      and required_rival_id = (select id from public.campaign_rivals where slug='antartica')) <> 5
     or (select count(*) from public.campaign_rivals where order_index between 47 and 66
         and strategy_profile is not null and target_score=30 and difficulty=10) <> 20 then
    raise exception 'Ruta del Noroeste incompleta';
  end if;
end $check$;

commit;
