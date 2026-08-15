-- ============================================================
-- TRUCAZO — Campaña por provincias, ETAPA 3: el plantel completo (26 rivales)
-- Fecha: 2026-07-05
--
-- 1. Crea los 16 rivales nuevos (cuenta-bot + perfil + ficha) para llegar a
--    5-6 por provincia: Buenos Aires 6, Santa Fe 5, Córdoba 5, Mendoza 5,
--    Santiago del Estero 5.
-- 2. RECALIBRA la economía completa (los 26): con más rivales, los premios
--    base, los requisitos y los puntajes de ranking se rearman en una sola
--    escalera global. Regla: requisito ≈ 75% de lo acumulable antes de ese
--    rival; ranking del bot ≈ acumulado previo + 60% de su premio base (así
--    vencerlo es lo que te pone arriba suyo). El Mudo sigue siendo el n°1
--    (2940) y solo se lo pasa venciéndolo.
-- 3. Umbrales de provincia nuevos: 0 / 150 / 250 / 850 / 1300.
-- 4. REVANCHA LIBRE: a un rival ya vencido se lo puede desafiar siempre,
--    aunque los requisitos recalibrados hayan subido (protege el progreso de
--    los jugadores que ya venían jugando). get_campaign_map también lo marca
--    desbloqueado, y la provincia con un vencido adentro se puede abrir.
--
-- Las caras: public/personajes/{slug}.webp (el dueño las genera; mientras
-- tanto se ve la inicial). Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1a. Las 16 cuentas-bot nuevas (auth.users). Nunca inician sesión.
-- ------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000011','authenticated','authenticated','bot11@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Beto, el Colectivero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000012','authenticated','authenticated','bot12@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Aníbal, el Tanguero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000013','authenticated','authenticated','bot13@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Cholo, el Pescador"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000014','authenticated','authenticated','bot14@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Yony, el Cumbiero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000015','authenticated','authenticated','bot15@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"El Colo del Fernet"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000016','authenticated','authenticated','bot16@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Marta, la Quinielera"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000017','authenticated','authenticated','bot17@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Chicho, el Humorista"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000018','authenticated','authenticated','bot18@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Dante, el Cuartetero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000019','authenticated','authenticated','bot19@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Doña Nélida, la Serrana"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000020','authenticated','authenticated','bot20@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Don Facundo, el Bodeguero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000021','authenticated','authenticated','bot21@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Ceferino, el Arriero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000022','authenticated','authenticated','bot22@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Alma, la Montañesa"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000023','authenticated','authenticated','bot23@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Segundo, el Bombisto"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000024','authenticated','authenticated','bot24@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Don Ulises, el Siestero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000025','authenticated','authenticated','bot25@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Doña Yaya, la Bruja"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000026','authenticated','authenticated','bot26@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Fortunato, el Coplero"}', now(), now())
on conflict (id) do nothing;

-- 1b. Perfiles de los bots.
insert into public.profiles (id, username, is_bot) values
  ('b0700000-0000-4000-a000-000000000011','Beto, el Colectivero', true),
  ('b0700000-0000-4000-a000-000000000012','Aníbal, el Tanguero', true),
  ('b0700000-0000-4000-a000-000000000013','Cholo, el Pescador', true),
  ('b0700000-0000-4000-a000-000000000014','Yony, el Cumbiero', true),
  ('b0700000-0000-4000-a000-000000000015','El Colo del Fernet', true),
  ('b0700000-0000-4000-a000-000000000016','Marta, la Quinielera', true),
  ('b0700000-0000-4000-a000-000000000017','Chicho, el Humorista', true),
  ('b0700000-0000-4000-a000-000000000018','Dante, el Cuartetero', true),
  ('b0700000-0000-4000-a000-000000000019','Doña Nélida, la Serrana', true),
  ('b0700000-0000-4000-a000-000000000020','Don Facundo, el Bodeguero', true),
  ('b0700000-0000-4000-a000-000000000021','Ceferino, el Arriero', true),
  ('b0700000-0000-4000-a000-000000000022','Alma, la Montañesa', true),
  ('b0700000-0000-4000-a000-000000000023','Segundo, el Bombisto', true),
  ('b0700000-0000-4000-a000-000000000024','Don Ulises, el Siestero', true),
  ('b0700000-0000-4000-a000-000000000025','Doña Yaya, la Bruja', true),
  ('b0700000-0000-4000-a000-000000000026','Fortunato, el Coplero', true)
on conflict (id) do update set is_bot = true, username = excluded.username;

-- ------------------------------------------------------------
-- 1c. Las fichas de los 16 rivales nuevos (economía provisoria: se pisa abajo).
-- Provincias: BA=..01, SF=..02, CBA=..03, MZA=..04, SGO=..05.
-- ------------------------------------------------------------
insert into public.campaign_rivals
  (id, order_index, slug, display_name, tagline, difficulty, trait_liar, trait_aggressive,
   target_score, reward_coins, bot_id, province_id, points_required, ranking_points, points_reward)
values
  ('c1a70000-0000-4000-b000-000000000011', 11, 'colectivero', 'Beto, el Colectivero',      'Juega como maneja: rápido, y canta el truco sin mirar el espejo.',                 2, 3, 5, 15, 60,   'b0700000-0000-4000-a000-000000000011', 'ca7a0000-0000-4000-b000-000000000001', 0, 35, 25),
  ('c1a70000-0000-4000-b000-000000000012', 12, 'tanguero',    'Aníbal, el Tanguero',       'Cadencioso: te estudia en silencio mientras tararea un tango.',                    3, 5, 3, 15, 90,   'b0700000-0000-4000-a000-000000000012', 'ca7a0000-0000-4000-b000-000000000001', 0, 100, 40),
  ('c1a70000-0000-4000-b000-000000000013', 13, 'pescador',    'Cholo, el Pescador',        'Paciencia de río: espera la carta justa como espera al sábalo.',                   4, 3, 3, 15, 170,  'b0700000-0000-4000-a000-000000000013', 'ca7a0000-0000-4000-b000-000000000002', 160, 255, 65),
  ('c1a70000-0000-4000-b000-000000000014', 14, 'cumbiero',    'Yony, el Cumbiero',         'Puro ritmo: te apura con el truco antes de que acomodes las cartas.',              5, 5, 8, 30, 220,  'b0700000-0000-4000-a000-000000000014', 'ca7a0000-0000-4000-b000-000000000002', 210, 325, 75),
  ('c1a70000-0000-4000-b000-000000000015', 15, 'fernetero',   'El Colo del Fernet',        'Arranca tranquilo, pero al tercer trago canta cualquiera… y le sale bien.',        5, 4, 7, 30, 240,  'b0700000-0000-4000-a000-000000000015', 'ca7a0000-0000-4000-b000-000000000003', 265, 405, 80),
  ('c1a70000-0000-4000-b000-000000000016', 16, 'quinielera',  'Marta, la Quinielera',      'Dice que los números le hablan; tu envido se lo sopla el 15.',                     6, 7, 4, 30, 330,  'b0700000-0000-4000-a000-000000000016', 'ca7a0000-0000-4000-b000-000000000002', 390, 575, 95),
  ('c1a70000-0000-4000-b000-000000000017', 17, 'humorista',   'Chicho, el Humorista',      'Te hace reír y nunca sabés si canta en serio o en chiste.',                        6, 8, 4, 30, 380,  'b0700000-0000-4000-a000-000000000017', 'ca7a0000-0000-4000-b000-000000000003', 460, 675, 100),
  ('c1a70000-0000-4000-b000-000000000018', 18, 'cuartetero',  'Dante, el Cuartetero',      'Toca de oído y canta fuerte: presión cordobesa a todo volumen.',                   6, 5, 8, 30, 450,  'b0700000-0000-4000-a000-000000000018', 'ca7a0000-0000-4000-b000-000000000003', 615, 885, 110),
  ('c1a70000-0000-4000-b000-000000000019', 19, 'serrana',     'Doña Nélida, la Serrana',   'Baja de las sierras una vez al mes y nunca vuelve con las manos vacías.',          7, 6, 5, 30, 550,  'b0700000-0000-4000-a000-000000000019', 'ca7a0000-0000-4000-b000-000000000003', 700, 1000, 120),
  ('c1a70000-0000-4000-b000-000000000020', 20, 'bodeguero',   'Don Facundo, el Bodeguero', 'Añeja cada jugada como sus vinos: nada sale antes de tiempo.',                     7, 5, 6, 30, 750,  'b0700000-0000-4000-a000-000000000020', 'ca7a0000-0000-4000-b000-000000000004', 885, 1260, 135),
  ('c1a70000-0000-4000-b000-000000000021', 21, 'arriero',     'Ceferino, el Arriero',      'Cruzó la cordillera mil veces; a este no le tiembla el pulso.',                    8, 6, 7, 30, 1100, 'b0700000-0000-4000-a000-000000000021', 'ca7a0000-0000-4000-b000-000000000004', 1100, 1560, 160),
  ('c1a70000-0000-4000-b000-000000000022', 22, 'montanesa',   'Alma, la Montañesa',        'Aire de altura: ve tus cartas desde arriba, o eso parece.',                        8, 7, 6, 30, 1200, 'b0700000-0000-4000-a000-000000000022', 'ca7a0000-0000-4000-b000-000000000004', 1220, 1725, 170),
  ('c1a70000-0000-4000-b000-000000000023', 23, 'bombisto',    'Segundo, el Bombisto',      'Marca el ritmo del duelo como el bombo en la chacarera.',                          8, 6, 8, 30, 1300, 'b0700000-0000-4000-a000-000000000023', 'ca7a0000-0000-4000-b000-000000000005', 1345, 1900, 175),
  ('c1a70000-0000-4000-b000-000000000024', 24, 'siestero',    'Don Ulises, el Siestero',   'Parece dormido… hasta que te canta el vale cuatro.',                               9, 8, 3, 30, 1700, 'b0700000-0000-4000-a000-000000000024', 'ca7a0000-0000-4000-b000-000000000005', 1615, 2270, 195),
  ('c1a70000-0000-4000-b000-000000000025', 25, 'bruja',       'Doña Yaya, la Bruja',       'Dicen que ve tus cartas en el humo del sahumerio.',                                9, 9, 5, 30, 1900, 'b0700000-0000-4000-a000-000000000025', 'ca7a0000-0000-4000-b000-000000000005', 1765, 2475, 210),
  ('c1a70000-0000-4000-b000-000000000026', 26, 'coplero',     'Fortunato, el Coplero',     'Cada canto suyo rima… y casi siempre termina en «quiero».',                        9, 8, 7, 30, 2200, 'b0700000-0000-4000-a000-000000000026', 'ca7a0000-0000-4000-b000-000000000005', 1920, 2695, 225)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. RECALIBRACIÓN de la economía completa (los 26 en una escalera global).
-- ------------------------------------------------------------
update public.campaign_rivals cr
   set points_required = v.req, ranking_points = v.rank, points_reward = v.base
  from (values
    -- slug          req    rank   base
    ('novato',         0,     12,    20),
    ('colectivero',    0,     35,    25),
    ('vecina',         0,     65,    30),
    ('tanguero',       0,    100,    40),
    ('carnicero',     85,    140,    45),
    ('tana',         120,    195,    55),
    ('pescador',     160,    255,    65),
    ('cumbiero',     210,    325,    75),
    ('fernetero',    265,    405,    80),
    ('tahur',        325,    485,    85),
    ('quinielera',   390,    575,    95),
    ('humorista',    460,    675,   100),
    ('patrona',      535,    780,   105),
    ('cuartetero',   615,    885,   110),
    ('serrana',      700,   1000,   120),
    ('maestro',      785,   1130,   130),
    ('bodeguero',    885,   1260,   135),
    ('campeon',      985,   1405,   150),
    ('arriero',     1100,   1560,   160),
    ('montanesa',   1220,   1725,   170),
    ('bombisto',    1345,   1900,   175),
    ('coneja',      1480,   2080,   185),
    ('siestero',    1615,   2270,   195),
    ('bruja',       1765,   2475,   210),
    ('coplero',     1920,   2695,   225),
    ('mudo',        2090,   2940,   260)
  ) as v(slug, req, rank, base)
 where cr.slug = v.slug;

-- 3. Umbrales de provincia (apenas por debajo de su rival más barato).
update public.campaign_provinces p
   set points_required = v.req
  from (values
    ('buenos-aires', 0), ('santa-fe', 150), ('cordoba', 250),
    ('mendoza', 850), ('santiago-del-estero', 1300)
  ) as v(slug, req)
 where p.slug = v.slug;

-- ------------------------------------------------------------
-- 4a. start_campaign_duel: revancha libre contra un rival ya vencido (los
-- candados de puntos solo aplican a rivales que nunca venciste).
-- ------------------------------------------------------------
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

  -- Un rival ya vencido siempre acepta la revancha; los candados de puntos
  -- valen solo para los que nunca venciste.
  if not exists (select 1 from campaign_progress where user_id = uid and rival_id = p_rival_id) then
    select * into pv from campaign_provinces where id = r.province_id;
    if v_pts < pv.points_required then raise exception 'todavía no desbloqueaste esta provincia'; end if;
    if v_pts < r.points_required then raise exception 'todavía no desbloqueaste este rival'; end if;
  end if;

  delete from tables t
   where t.creator_id = uid
     and exists (select 1 from games gg
                 where gg.id = t.id and gg.campaign_rival_id is not null and gg.status = 'playing');

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into tables (id, name, creator_id, creator_username, opponent_id, opponent_username,
                      bet, is_private, status, target_score, time_limit)
  values (v_id, 'Modo historia', uid, v_username, r.bot_id, r.display_name,
          0, true, 'playing', r.target_score, 30);

  insert into games (id, player1_id, player2_id, player1_username, player2_username,
                     current_turn, mano_player, bet, target_score, time_limit, turn_started_at,
                     campaign_rival_id)
  values (v_id, uid, r.bot_id, v_username, r.display_name,
          uid, uid, 0, r.target_score, 30, now(), p_rival_id)
  returning * into g;

  insert into game_hands (game_id, player_id, cards) values
    (v_id, uid,      h1),
    (v_id, r.bot_id, h2);

  return g;
end;
$function$;

-- ------------------------------------------------------------
-- 4b. get_campaign_map: un rival vencido cuenta como desbloqueado (revancha),
-- y una provincia con un vencido adentro siempre se puede abrir.
-- ------------------------------------------------------------
create or replace function public.get_campaign_map()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid         uuid := auth.uid();
  v_pts       integer;
  v_provinces jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select campaign_points into v_pts from profiles where id = uid;
  v_pts := coalesce(v_pts, 0);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'order_index', p.order_index,
      'slug', p.slug,
      'name', p.name,
      'points_required', p.points_required,
      'unlocked', (
        v_pts >= p.points_required
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
            or (v_pts >= p.points_required and v_pts >= cr.points_required)
          )
        ) order by cr.points_required, cr.order_index), '[]'::jsonb)
        from campaign_rivals cr
        left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
        where cr.province_id = p.id
      )
    ) order by p.order_index), '[]'::jsonb)
  into v_provinces
  from campaign_provinces p;

  return jsonb_build_object('points', v_pts, 'provinces', v_provinces);
end;
$function$;

commit;
