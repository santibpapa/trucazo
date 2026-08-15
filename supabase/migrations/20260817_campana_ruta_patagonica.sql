-- ============================================================
-- TRUCAZO — Expansión del Modo Historia: Ruta Patagónica
--
-- Agrega 5 provincias y 20 rivales de dificultad máxima sin resetear
-- progreso ni cambiar la fórmula vigente de puntos por victoria/margen.
-- Las provincias y los rivales se desbloquean por puntaje, como en la
-- campaña original. La Pampa, inicio de la expansión, además exige haber
-- vencido a Don Salvador, el Mudo.
--
-- Idempotente.
-- ============================================================

begin;

-- La condición narrativa de entrada se modela en la provincia, no entre
-- rivales: adentro sigue mandando únicamente el puntaje.
alter table public.campaign_provinces
  add column if not exists required_rival_id uuid
  references public.campaign_rivals(id);

-- ------------------------------------------------------------
-- 1. PROVINCIAS
-- ------------------------------------------------------------

insert into public.campaign_provinces
  (id, order_index, slug, name, points_required, required_rival_id)
values
  ('ca7a0000-0000-4000-b000-000000000006',  6, 'la-pampa',          'La Pampa',          3000, (select id from public.campaign_rivals where slug = 'mudo')),
  ('ca7a0000-0000-4000-b000-000000000007',  7, 'neuquen',           'Neuquén',           4800, null),
  ('ca7a0000-0000-4000-b000-000000000008',  8, 'rio-negro',         'Río Negro',         7600, null),
  ('ca7a0000-0000-4000-b000-000000000009',  9, 'chubut',           'Chubut',           11000, null),
  ('ca7a0000-0000-4000-b000-000000000010', 10, 'tierra-del-fuego', 'Tierra del Fuego', 15000, null)
on conflict (id) do update set
  order_index = excluded.order_index,
  slug = excluded.slug,
  name = excluded.name,
  points_required = excluded.points_required,
  required_rival_id = excluded.required_rival_id;

-- ------------------------------------------------------------
-- 2. CUENTAS BOT Y PERFILES
-- ------------------------------------------------------------

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000027','authenticated','authenticated','bot27@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Cacho, el Payador"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000028','authenticated','authenticated','bot28@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Mirta, la Bolichera"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000029','authenticated','authenticated','bot29@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Rubén, el Domador"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000030','authenticated','authenticated','bot30@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Celia, la Telera"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000031','authenticated','authenticated','bot31@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Darío, el Petrolero"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000032','authenticated','authenticated','bot32@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Malena, la Criancera"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000033','authenticated','authenticated','bot33@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Bruno, el Paleontólogo"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000034','authenticated','authenticated','bot34@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Vera, la Montañista"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000035','authenticated','authenticated','bot35@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Elsa, la Fruticultora"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000036','authenticated','authenticated','bot36@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Fabián, el Ferroviario"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000037','authenticated','authenticated','bot37@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Abril, la Cervecera"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000038','authenticated','authenticated','bot38@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Roque, el Buzo"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000039','authenticated','authenticated','bot39@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Owen, el Galés"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000040','authenticated','authenticated','bot40@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Mariela, la Guardafauna"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000041','authenticated','authenticated','bot41@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Tano, el Pesquero"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000042','authenticated','authenticated','bot42@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Ema, la Navegante"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000043','authenticated','authenticated','bot43@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Anselmo, el Guardafaros"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000044','authenticated','authenticated','bot44@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Julia, la Pionera"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000045','authenticated','authenticated','bot45@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Ramiro, el Hachero"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000046','authenticated','authenticated','bot46@trucazo.bot',now(),'{"provider":"bot","providers":["bot"]}','{"username":"Irene, la Antártica"}',now(),now())
on conflict (id) do nothing;

insert into public.profiles (id, username, is_bot) values
  ('b0700000-0000-4000-a000-000000000027','Cacho, el Payador',true),
  ('b0700000-0000-4000-a000-000000000028','Mirta, la Bolichera',true),
  ('b0700000-0000-4000-a000-000000000029','Rubén, el Domador',true),
  ('b0700000-0000-4000-a000-000000000030','Celia, la Telera',true),
  ('b0700000-0000-4000-a000-000000000031','Darío, el Petrolero',true),
  ('b0700000-0000-4000-a000-000000000032','Malena, la Criancera',true),
  ('b0700000-0000-4000-a000-000000000033','Bruno, el Paleontólogo',true),
  ('b0700000-0000-4000-a000-000000000034','Vera, la Montañista',true),
  ('b0700000-0000-4000-a000-000000000035','Elsa, la Fruticultora',true),
  ('b0700000-0000-4000-a000-000000000036','Fabián, el Ferroviario',true),
  ('b0700000-0000-4000-a000-000000000037','Abril, la Cervecera',true),
  ('b0700000-0000-4000-a000-000000000038','Roque, el Buzo',true),
  ('b0700000-0000-4000-a000-000000000039','Owen, el Galés',true),
  ('b0700000-0000-4000-a000-000000000040','Mariela, la Guardafauna',true),
  ('b0700000-0000-4000-a000-000000000041','Tano, el Pesquero',true),
  ('b0700000-0000-4000-a000-000000000042','Ema, la Navegante',true),
  ('b0700000-0000-4000-a000-000000000043','Anselmo, el Guardafaros',true),
  ('b0700000-0000-4000-a000-000000000044','Julia, la Pionera',true),
  ('b0700000-0000-4000-a000-000000000045','Ramiro, el Hachero',true),
  ('b0700000-0000-4000-a000-000000000046','Irene, la Antártica',true)
on conflict (id) do update set
  username = excluded.username,
  is_bot = true;

-- ------------------------------------------------------------
-- 3. RIVALES
--
-- Todos juegan en dificultad 10 y a 30 puntos. Mentira/agresividad cambia
-- el carácter del juego, no su competencia máxima. Los requisitos son por
-- puntaje y deliberadamente se solapan para conservar libertad de elección.
-- ------------------------------------------------------------

insert into public.campaign_rivals
  (id, order_index, slug, display_name, tagline, difficulty,
   trait_liar, trait_aggressive, target_score, reward_coins, bot_id,
   province_id, points_required, ranking_points, points_reward)
values
  ('c1a70000-0000-4000-b000-000000000027',27,'payador','Cacho, el Payador','Improvisa versos y faroles con la misma facilidad.',10,9,6,30,500,'b0700000-0000-4000-a000-000000000027','ca7a0000-0000-4000-b000-000000000006',3000,3500,500),
  ('c1a70000-0000-4000-b000-000000000028',28,'bolichera','Mirta, la Bolichera','Anotó tantas deudas que ya sabe cuándo cualquiera está mintiendo.',10,7,8,30,550,'b0700000-0000-4000-a000-000000000028','ca7a0000-0000-4000-b000-000000000006',3000,3870,540),
  ('c1a70000-0000-4000-b000-000000000029',29,'domador','Rubén, el Domador','No levanta la voz: alcanza con que clave la mirada.',10,4,10,30,600,'b0700000-0000-4000-a000-000000000029','ca7a0000-0000-4000-b000-000000000006',3300,4430,580),
  ('c1a70000-0000-4000-b000-000000000030',30,'telera','Celia, la Telera','Teje cada mano despacio hasta dejarte sin salida.',10,10,4,30,650,'b0700000-0000-4000-a000-000000000030','ca7a0000-0000-4000-b000-000000000006',3600,5040,620),

  ('c1a70000-0000-4000-b000-000000000031',31,'petrolero','Darío, el Petrolero','Trabaja bajo presión y juega todavía mejor cuando todo arde.',10,5,10,30,600,'b0700000-0000-4000-a000-000000000031','ca7a0000-0000-4000-b000-000000000007',4800,5680,650),
  ('c1a70000-0000-4000-b000-000000000032',32,'criancera','Malena, la Criancera','Conoce cada sendero y no deja escapar una sola señal.',10,6,7,30,650,'b0700000-0000-4000-a000-000000000032','ca7a0000-0000-4000-b000-000000000007',4800,6360,700),
  ('c1a70000-0000-4000-b000-000000000033',33,'paleontologo','Bruno, el Paleontólogo','Desentierra jugadas que creías enterradas hace millones de años.',10,9,4,30,700,'b0700000-0000-4000-a000-000000000033','ca7a0000-0000-4000-b000-000000000007',5100,7090,750),
  ('c1a70000-0000-4000-b000-000000000034',34,'montanista','Vera, la Montañista','Cuanto más empinada viene la partida, más rápido sube.',10,7,9,30,750,'b0700000-0000-4000-a000-000000000034','ca7a0000-0000-4000-b000-000000000007',5400,7870,800),

  ('c1a70000-0000-4000-b000-000000000035',35,'fruticultora','Elsa, la Fruticultora','Separa la fruta buena de la mala con una sola mirada.',10,5,7,30,700,'b0700000-0000-4000-a000-000000000035','ca7a0000-0000-4000-b000-000000000008',7600,8700,850),
  ('c1a70000-0000-4000-b000-000000000036',36,'ferroviario','Fabián, el Ferroviario','No se desvía del cálculo y siempre llega a horario al quiero.',10,6,8,30,750,'b0700000-0000-4000-a000-000000000036','ca7a0000-0000-4000-b000-000000000008',7600,9580,900),
  ('c1a70000-0000-4000-b000-000000000037',37,'cervecera','Abril, la Cervecera','Parece relajada, pero cada farol tiene una receta exacta.',10,9,6,30,800,'b0700000-0000-4000-a000-000000000037','ca7a0000-0000-4000-b000-000000000008',7900,10510,950),
  ('c1a70000-0000-4000-b000-000000000038',38,'buzo','Roque, el Buzo','Juega en silencio y aguanta la presión mejor que nadie.',10,8,5,30,850,'b0700000-0000-4000-a000-000000000038','ca7a0000-0000-4000-b000-000000000008',8200,11490,1000),

  ('c1a70000-0000-4000-b000-000000000039',39,'gales','Owen, el Galés','Sirve el té con calma mientras calcula hasta la última carta.',10,8,5,30,800,'b0700000-0000-4000-a000-000000000039','ca7a0000-0000-4000-b000-000000000009',11000,12520,1050),
  ('c1a70000-0000-4000-b000-000000000040',40,'guardafauna','Mariela, la Guardafauna','Ve movimientos mínimos a kilómetros de distancia.',10,4,8,30,850,'b0700000-0000-4000-a000-000000000040','ca7a0000-0000-4000-b000-000000000009',11000,13600,1100),
  ('c1a70000-0000-4000-b000-000000000041',41,'pesquero','Tano, el Pesquero','Si la mano viene brava, se afirma y empuja todavía más.',10,6,10,30,900,'b0700000-0000-4000-a000-000000000041','ca7a0000-0000-4000-b000-000000000009',11400,14730,1150),
  ('c1a70000-0000-4000-b000-000000000042',42,'navegante','Ema, la Navegante','Cambia el rumbo sin aviso y nunca pierde el norte.',10,9,7,30,950,'b0700000-0000-4000-a000-000000000042','ca7a0000-0000-4000-b000-000000000009',11800,15910,1200),

  ('c1a70000-0000-4000-b000-000000000043',43,'guardafaros','Anselmo, el Guardafaros','Atraviesa la niebla y encuentra hasta el farol mejor escondido.',10,10,4,30,900,'b0700000-0000-4000-a000-000000000043','ca7a0000-0000-4000-b000-000000000010',15000,17140,1250),
  ('c1a70000-0000-4000-b000-000000000044',44,'pionera','Julia, la Pionera','Llegó antes que todos y piensa quedarse hasta el final.',10,7,8,30,1000,'b0700000-0000-4000-a000-000000000044','ca7a0000-0000-4000-b000-000000000010',15000,18420,1300),
  ('c1a70000-0000-4000-b000-000000000045',45,'hachero','Ramiro, el Hachero','Parte la mesa con presión pura y nunca retrocede.',10,3,10,30,1100,'b0700000-0000-4000-a000-000000000045','ca7a0000-0000-4000-b000-000000000010',15500,19750,1350),
  ('c1a70000-0000-4000-b000-000000000046',46,'antartica','Irene, la Antártica','Fría, precisa e imposible de apurar hasta en la última mano.',10,8,8,30,1500,'b0700000-0000-4000-a000-000000000046','ca7a0000-0000-4000-b000-000000000010',16000,21130,1400)
on conflict (id) do update set
  order_index = excluded.order_index,
  slug = excluded.slug,
  display_name = excluded.display_name,
  tagline = excluded.tagline,
  difficulty = excluded.difficulty,
  trait_liar = excluded.trait_liar,
  trait_aggressive = excluded.trait_aggressive,
  target_score = excluded.target_score,
  reward_coins = excluded.reward_coins,
  bot_id = excluded.bot_id,
  province_id = excluded.province_id,
  points_required = excluded.points_required,
  ranking_points = excluded.ranking_points,
  points_reward = excluded.points_reward;

-- ------------------------------------------------------------
-- 4. MAPA: misma respuesta actual, sumando la condición opcional de entrada
-- de una provincia. Un rival ya vencido siempre conserva su revancha libre.
-- ------------------------------------------------------------

create or replace function public.get_campaign_map()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid         uuid := auth.uid();
  v_pts       integer;
  v_provinces jsonb;
  cs          campaign_style%rowtype;
  hp          int;
  fama        int;
  liar_pct int; folder_pct int; aggr_pct int;
  sung int;
  fama_cap constant int := 2000;
  known_min constant int := 8;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select campaign_points into v_pts from profiles where id = uid;
  v_pts := coalesce(v_pts, 0);
  fama := least(100, (v_pts * 100) / fama_cap);

  select * into cs from campaign_style where user_id = uid;
  hp   := coalesce(cs.hands_played, 0);
  sung := coalesce(cs.envido_sung, 0) + coalesce(cs.truco_sung, 0);
  liar_pct   := round((coalesce(cs.envido_bluff,0) + coalesce(cs.truco_bluff,0))::numeric
                       / greatest(1, sung) * 100);
  folder_pct := round(least(1, (coalesce(cs.envido_folded,0) + coalesce(cs.truco_folded,0))::numeric
                       / greatest(1, hp) * 2) * 100);
  aggr_pct   := round(least(1, sung::numeric / greatest(1, hp) / 1.5) * 100);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'order_index', p.order_index,
      'slug', p.slug,
      'name', p.name,
      'points_required', p.points_required,
      'unlocked', (
        (
          v_pts >= p.points_required
          and (
            p.required_rival_id is null
            or exists (
              select 1 from campaign_progress gate
              where gate.user_id = uid and gate.rival_id = p.required_rival_id
            )
          )
        )
        or exists (
          select 1 from campaign_progress cp2
          join campaign_rivals cr2 on cr2.id = cp2.rival_id
          where cp2.user_id = uid and cr2.province_id = p.id
        )
      ),
      'rivals', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', cr.id,
          'order_index', cr.order_index,
          'slug', cr.slug,
          'display_name', cr.display_name,
          'tagline', cr.tagline,
          'difficulty', cr.difficulty,
          'trait_liar', cr.trait_liar,
          'trait_aggressive', cr.trait_aggressive,
          'target_score', cr.target_score,
          'reward_coins', cr.reward_coins,
          'points_required', cr.points_required,
          'ranking_points', cr.ranking_points,
          'points_reward', cr.points_reward,
          'beaten', (cp.user_id is not null),
          'unlocked', (
            cp.user_id is not null
            or (
              v_pts >= p.points_required
              and v_pts >= cr.points_required
              and (
                p.required_rival_id is null
                or exists (
                  select 1 from campaign_progress gate
                  where gate.user_id = uid and gate.rival_id = p.required_rival_id
                )
              )
            )
          )
        ) order by cr.points_required, cr.order_index), '[]'::jsonb)
        from campaign_rivals cr
        left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
        where cr.province_id = p.id
      )
    ) order by p.order_index), '[]'::jsonb)
  into v_provinces
  from campaign_provinces p;

  return jsonb_build_object(
    'points', v_pts,
    'fama', fama,
    'style', jsonb_build_object(
      'known', hp >= known_min,
      'hands', hp,
      'liar', liar_pct,
      'folder', folder_pct,
      'aggressive', aggr_pct
    ),
    'provinces', v_provinces
  );
end;
$function$;

-- Mismo inicio de duelo vigente, con la condición provincial opcional.
create or replace function public.start_campaign_duel(p_rival_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid        uuid := auth.uid();
  r          campaign_rivals%rowtype;
  pv         campaign_provinces%rowtype;
  v_pts      integer;
  v_username text;
  v_id       uuid := gen_random_uuid();
  h1 jsonb; h2 jsonb;
  g  games%rowtype;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into r from campaign_rivals where id = p_rival_id;
  if not found then raise exception 'rival no encontrado'; end if;
  if r.province_id is null then raise exception 'rival sin provincia'; end if;

  select username, campaign_points into v_username, v_pts from profiles where id = uid;
  if v_username is null then raise exception 'perfil no encontrado'; end if;
  v_pts := coalesce(v_pts, 0);

  if not exists (
    select 1 from campaign_progress where user_id = uid and rival_id = p_rival_id
  ) then
    select * into pv from campaign_provinces where id = r.province_id;
    if v_pts < pv.points_required then raise exception 'todavía no desbloqueaste esta provincia'; end if;
    if pv.required_rival_id is not null and not exists (
      select 1 from campaign_progress
      where user_id = uid and rival_id = pv.required_rival_id
    ) then
      raise exception 'todavía no desbloqueaste esta provincia';
    end if;
    if v_pts < r.points_required then raise exception 'todavía no desbloqueaste este rival'; end if;
  end if;

  delete from tables t
   where t.creator_id = uid
     and exists (
       select 1 from games gg
       where gg.id = t.id and gg.campaign_rival_id is not null and gg.status = 'playing'
     );

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into tables
    (id, name, creator_id, creator_username, opponent_id, opponent_username,
     bet, is_private, status, target_score, time_limit)
  values
    (v_id, 'Modo historia', uid, v_username, r.bot_id, r.display_name,
     0, true, 'playing', r.target_score, 30);

  insert into games
    (id, player1_id, player2_id, player1_username, player2_username,
     current_turn, mano_player, bet, target_score, time_limit, turn_started_at,
     campaign_rival_id)
  values
    (v_id, uid, r.bot_id, v_username, r.display_name,
     uid, uid, 0, r.target_score, 30, now(), p_rival_id)
  returning * into g;

  insert into game_hands (game_id, player_id, cards) values
    (v_id, uid,      h1),
    (v_id, r.bot_id, h2);

  begin
    perform public._record_style(v_id, 'hand_played');
  exception when others then null;
  end;

  return g;
end;
$function$;

revoke execute on function public.get_campaign_map() from public, anon;
revoke execute on function public.start_campaign_duel(uuid) from public, anon;
grant execute on function public.get_campaign_map() to authenticated;
grant execute on function public.start_campaign_duel(uuid) to authenticated;

-- Fallar de forma explícita si una edición futura deja incompleta la expansión.
do $check$
begin
  if (select count(*) from public.campaign_provinces where order_index between 6 and 10) <> 5 then
    raise exception 'Ruta Patagónica: se esperaban 5 provincias';
  end if;
  if (select count(*) from public.campaign_rivals where order_index between 27 and 46) <> 20 then
    raise exception 'Ruta Patagónica: se esperaban 20 rivales';
  end if;
  if exists (
    select 1 from public.campaign_rivals
    where order_index between 27 and 46 and (difficulty <> 10 or target_score <> 30)
  ) then
    raise exception 'Ruta Patagónica: todos los rivales deben ser dificultad 10 y jugar a 30';
  end if;
end;
$check$;

commit;
