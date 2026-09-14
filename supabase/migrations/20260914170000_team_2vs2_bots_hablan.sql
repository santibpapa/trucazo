-- 2vs2: que los bots se sientan compañeros de mesa y no robots.
--
-- Tres cosas, todas del lado del servidor (el cliente solo muestra lo que llega):
--   1. Se presentan con nombre de jugador en vez de "Bot 1".
--   2. Hablan: una frase suya en el momento justo, en el mismo globito que usa
--      el chat rápido de las personas.
--   3. Escuchan: el chat rápido pasa a viajar por el servidor, así que lo que
--      una persona le dice a su compañero bot le llega, le contesta, y en tres
--      casos le cambia un poco cómo juega ESA mano.
--
-- De dónde salen las frases y qué se dejó afuera a propósito (las señas, entre
-- otras cosas): docs/2vs2-bots-humanos.md.
--
-- Lo que NO cambia: las reglas, los turnos, los puntajes, los pagos, quién
-- responde por el equipo, ni los tiempos de la partida.
begin;

-- ------------------------------------------------------------
-- 1. DÓNDE VIVE LO QUE SE DICE EN LA MESA
--
-- Una sola lista pública en la fila de la partida, para las frases de las
-- personas y las de los bots por igual: así los cuatro ven lo mismo. Guarda las
-- últimas diez y anota en qué mano se dijo cada una, que es lo que permite que
-- un pedido viejo no se cuele como pedido de la mano nueva.
-- ------------------------------------------------------------

alter table public.team_games add column chat jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------
-- 2. EL CATÁLOGO DE FRASES
--
-- Es una tabla y no una lista escondida dentro de una función para que agregar
-- o sacar una frase sea un insert o un delete, sin tocar nada más.
--
--   moment  cuándo la dice. 'oye:<frase>' es la respuesta a esa frase del chat.
--   strong  null: sirve siempre. true/false: solo con la mano buena o mala.
--
-- Regla de la casa, explicada en el estudio: cuando el bot CANTA, sus frases
-- son actitud y nunca información (si dijera la verdad al cantar, a las tres
-- partidas cualquiera lo lee). La verdad la dice solo cuando su compañero le
-- pregunta, que es lo que pasa en una mesa de verdad.
-- ------------------------------------------------------------

create table public.team_bot_lines (
  moment text not null,
  text   text not null,
  strong boolean,
  primary key (moment, text)
);
alter table public.team_bot_lines enable row level security;
-- Sin policies: catálogo interno. Solo lo leen las funciones definer.

insert into public.team_bot_lines(moment,strong,text) values
  -- Lo que dice cuando le toca a él
  ('truco',null,'¿Se animan?'),
  ('truco',null,'Truco, y de frente'),
  ('truco',null,'Vamos a ver si es tan brava'),
  ('truco',null,'Acá va, compañero'),
  ('truco',null,'¿Jugamos en serio?'),
  ('envido',null,'¿Cuántas traen?'),
  ('envido',null,'Envido, para calentar'),
  ('envido',null,'A ver esos tantos'),
  ('envido',null,'Envido nomás'),
  ('quiero',null,'Quiero, vengan'),
  ('quiero',null,'Y bueno, quiero'),
  ('quiero',null,'Acá los espero'),
  ('quiero',null,'Quiero. Mostrá'),
  ('no_quiero',null,'No, llevátela'),
  ('no_quiero',null,'Esta se las regalo'),
  ('no_quiero',null,'Hoy no'),
  ('no_quiero',null,'No me alcanza'),
  -- Irse al mazo en parejas deja colgado al compañero: se pide perdón.
  ('mazo',null,'Me voy, no tengo nada'),
  ('mazo',null,'Perdón, compañero'),
  ('mazo',null,'No ligo una'),
  ('mazo',null,'Me borro, disculpá'),
  -- Cuando canta el compañero: el "cantale, cantale" de la mesa
  ('apoya',null,'¡Vamos, compañero!'),
  ('apoya',null,'Voy con vos'),
  ('apoya',null,'Bien ahí, cantale'),
  ('apoya',null,'Te sigo'),
  ('apoya',null,'Dale que están temblando'),
  -- Cómo se cerró la mano
  ('gana_mano',null,'¡Esa!'),
  ('gana_mano',null,'Bien ahí, compañero'),
  ('gana_mano',null,'Así se juega'),
  ('gana_mano',null,'¡Vamos!'),
  ('pierde_mano',null,'La próxima'),
  ('pierde_mano',null,'Uh, por poco'),
  ('pierde_mano',null,'Tranquilo, vamos bien'),
  ('pierde_mano',null,'Y bueno'),
  -- Al rival que abre la boca: chicana y nada más
  ('chicana',null,'Hablá menos y jugá'),
  ('chicana',null,'Pagá y después hablás'),
  ('chicana',null,'Vení a ver'),
  ('chicana',null,'Después me contás'),
  ('chicana',null,'Sí, sí, dale'),
  -- Respuestas al compañero. Acá sí dice la verdad de cómo viene su mano.
  ('oye:¿Qué hago?',true,'Cantales, yo te sigo'),
  ('oye:¿Qué hago?',true,'Metele que estoy bien'),
  ('oye:¿Qué hago?',true,'Cantá tranquilo'),
  ('oye:¿Qué hago?',false,'Andá liviano, no tengo nada'),
  ('oye:¿Qué hago?',false,'Ojo que estoy seco'),
  ('oye:¿Qué hago?',false,'Guardala, esta es de ellos'),
  ('oye:¡Cantales, cantales!',true,'Ahí voy'),
  ('oye:¡Cantales, cantales!',true,'Dale, los apretamos'),
  ('oye:¡Cantales, cantales!',false,'No tengo con qué, eh'),
  ('oye:¡Cantales, cantales!',false,'Pará, pará'),
  ('oye:¿Tanto tenés?',true,'Algo tengo'),
  ('oye:¿Tanto tenés?',true,'Tengo para pelearlo'),
  ('oye:¿Tanto tenés?',false,'Poco y nada'),
  ('oye:¿Tanto tenés?',false,'No me da ni para empezar'),
  ('oye:Algo tengo',true,'Yo también, cantá tranquilo'),
  ('oye:Algo tengo',true,'Somos dos, dale'),
  ('oye:Algo tengo',false,'Cantá vos, que yo no traigo nada'),
  ('oye:Estoy seco',true,'Tranquilo, la llevo yo'),
  ('oye:Estoy seco',true,'Dejá que juego yo'),
  ('oye:Estoy seco',false,'Uh, andamos iguales'),
  ('oye:Estoy seco',false,'Somos dos'),
  ('oye:No me queda nada, eh',true,'Aguantá, yo cierro'),
  ('oye:No me queda nada, eh',true,'Dejámela a mí'),
  ('oye:No me queda nada, eh',false,'Y bueno, a ver qué pasa'),
  ('oye:No me queda nada, eh',false,'Estamos complicados'),
  ('oye:¿Te queda esa?',true,'Me queda una buena'),
  ('oye:¿Te queda esa?',true,'Quedate tranquilo'),
  ('oye:¿Te queda esa?',false,'Me queda la peor'),
  ('oye:¿Te queda esa?',false,'No me queda nada bueno'),
  ('oye:Juego yo',null,'Dale'),
  ('oye:Juego yo',null,'Va, te sigo'),
  ('oye:Juego yo',null,'Toda tuya'),
  ('oye:Voy para allá',null,'Te espero'),
  ('oye:Voy para allá',null,'Dale'),
  ('oye:¡Vení, vení!',null,'Ahí voy'),
  ('oye:¡Vení, vení!',null,'Voy'),
  ('oye:Calladito',null,'Listo'),
  ('oye:Calladito',null,'Mudo'),
  ('oye:Calladito',null,'Perdón'),
  ('oye:¡Quiero!',null,'Vamos'),
  ('oye:¡Quiero!',null,'Así se habla'),
  ('oye:¡Buena!',null,'Gracias'),
  ('oye:¡Buena!',null,'Tuya la próxima'),
  ('oye:¡Mentiroso!',null,'Bien ahí'),
  ('oye:¡Mentiroso!',null,'Son unos caraduras'),
  ('oye:¡Achicate!',null,'Eso, eso'),
  ('oye:¡Achicate!',null,'Decíselo'),
  ('oye:¡Andá!',null,'Ja'),
  ('oye:👏',null,'👏'),
  ('oye:👏',null,'Gracias'),
  ('oye:😂',null,'😂'),
  ('oye:😎',null,'😎'),
  ('oye:🔥',null,'🔥'),
  ('oye:🃏',null,'🃏');

-- ------------------------------------------------------------
-- 3. LAS FRASES QUE SE PUEDEN MANDAR
--
-- Espejo exacto de TEAM_EMOTES en src/lib/emotes.ts. El servidor rechaza
-- cualquier otro texto: si no, cualquiera podría escribir lo que quisiera en la
-- pantalla de los otros tres. El revisor automático comprueba que las dos
-- listas no se desincronicen (scripts/check-team-presentation.ts).
-- ------------------------------------------------------------

create function team_internal.chat_lines() returns text[]
language sql immutable as $$
  -- CHAT_LINES_BEGIN
  select array['👏','😂','😎','🔥','🃏','¡Mentiroso!','¡Andá!','¡Achicate!','¡Quiero!','¡Buena!',
    '¡Vení, vení!','Juego yo','Voy para allá','¿Qué hago?','¡Cantales, cantales!',
    '¿Tanto tenés?','Algo tengo','Estoy seco','¿Te queda esa?','No me queda nada, eh','Calladito'];
  -- CHAT_LINES_END
$$;

-- ------------------------------------------------------------
-- 4. HABLAR
-- ------------------------------------------------------------

-- Mete una frase en la lista de la mesa. El retraso es para que un bot no
-- conteste en el mismo instante: así no se nota la máquina.
create function team_internal.say(p_id uuid,p_seat integer,p_text text,p_delay interval default interval '0')
returns void language plpgsql security definer set search_path = '' as $$
declare lines jsonb; hand integer;
begin
  select chat,hand_number into lines,hand from public.team_games where id=p_id;
  lines:=lines||jsonb_build_array(jsonb_build_object('seat',p_seat,'text',p_text,
    'hand',hand,'at',clock_timestamp()+p_delay));
  while jsonb_array_length(lines)>10 loop lines:=lines-0; end loop;
  update public.team_games set chat=lines where id=p_id;
end;
$$;

-- "Calladito" calla a los bots por el resto de la mano, como en la mesa.
create function team_internal.quiet(g public.team_games) returns boolean
language sql immutable as $$
  select exists(select 1 from jsonb_array_elements(g.chat) x
    where x->>'text'='Calladito' and (x->>'hand')::integer=g.hand_number);
$$;

-- Cómo viene la mano del bot: con un tres o mejor se anima; en el envido, 27.
create function team_internal.bot_strong(p_id uuid,p_seat integer,p_envido boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when p_envido
    then public._envido_points(team_internal.full_hand(p_id,p_seat))>=27
    else coalesce((select min((x->>'rank')::integer) from public.team_hands h,
      jsonb_array_elements(h.cards) x where h.table_id=p_id and h.seat=p_seat),15)<=5
  end;
$$;

-- Elige una frase del catálogo y la dice. Devuelve si habló: ni loro, ni dos
-- bots encimados, ni nadie cuando pidieron silencio.
--
-- p_answering es cuando le está contestando al compañero. Ahí solo espera a no
-- pisarse a sí mismo: dejar una pregunta sin respuesta se nota mucho más que
-- dos que hablan juntos.
create function team_internal.bot_line(p_id uuid,p_seat integer,p_moment text,
  p_strong boolean default null,p_answering boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare g public.team_games; frase text;
begin
  select * into g from public.team_games where id=p_id;
  if team_internal.quiet(g) then return false; end if;
  if exists(select 1 from jsonb_array_elements(g.chat) x
    join public.team_seats s on s.table_id=p_id and s.seat=(x->>'seat')::integer
    where s.user_id is null and (x->>'at')::timestamptz>clock_timestamp()-interval '4 seconds'
      and (not p_answering or s.seat=p_seat))
  then return false; end if;
  select l.text into frase from public.team_bot_lines l
    where l.moment=p_moment and (l.strong is null or l.strong=p_strong)
    order by random() limit 1;
  if frase is null then return false; end if;
  perform team_internal.say(p_id,p_seat,frase,make_interval(secs=>0.5+random()));
  return true;
end;
$$;

-- Qué comenta la mesa después de una jugada. Como mucho una frase por acción.
create function team_internal.bot_talk(p_id uuid,p_seat integer,p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.team_games; is_bot boolean; partner integer:=(p_seat+2)%4; moment text; talker integer;
begin
  if not exists(select 1 from public.team_tables where id=p_id and status='playing') then return; end if;
  moment:=case
    when p_action in ('truco','retruco','vale_cuatro') then 'truco'
    when p_action in ('envido','real_envido','falta_envido') then 'envido'
    when p_action in ('truco_yes','envido_yes') then 'quiero'
    when p_action in ('truco_no','envido_no') then 'no_quiero'
    when p_action='mazo' then 'mazo' end;
  if moment is not null then
    select user_id is null into is_bot from public.team_seats where table_id=p_id and seat=p_seat;
    if is_bot and random()<0.35 and team_internal.bot_line(p_id,p_seat,moment) then return; end if;
    if moment in ('truco','envido') and random()<0.3 then
      select user_id is null into is_bot from public.team_seats where table_id=p_id and seat=partner;
      if is_bot then perform team_internal.bot_line(p_id,partner,'apoya'); end if;
    end if;
    return;
  end if;
  -- La mano se cerró con las cartas: la comenta cualquier bot de la mesa.
  select * into g from public.team_games where id=p_id;
  if p_action='play' and g.awaiting_deal and random()<0.3 then
    select seat into talker from public.team_seats
      where table_id=p_id and user_id is null order by random() limit 1;
    if talker is not null then
      perform team_internal.bot_line(p_id,talker,
        case when talker%2=g.last_hand_winner then 'gana_mano' else 'pierde_mano' end);
    end if;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5. ESCUCHAR
-- ------------------------------------------------------------

-- Al compañero le contesta según cómo viene su mano de verdad; al rival le tira
-- una chicana de vez en cuando y nada más.
create function team_internal.bot_hears(p_id uuid,p_from integer,p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare partner integer:=(p_from+2)%4; is_bot boolean; rival integer;
begin
  select user_id is null into is_bot from public.team_seats where table_id=p_id and seat=partner;
  if is_bot then
    if random()<0.75 then
      perform team_internal.bot_line(p_id,partner,'oye:'||p_text,
        team_internal.bot_strong(p_id,partner,p_text in ('¿Tanto tenés?','Algo tengo')),true);
    end if;
    return;
  end if;
  if random()<0.25 then
    select seat into rival from public.team_seats
      where table_id=p_id and user_id is null and seat%2<>p_from%2 order by random() limit 1;
    if rival is not null then perform team_internal.bot_line(p_id,rival,'chicana'); end if;
  end if;
end;
$$;

-- Lo último que pidió el COMPAÑERO en esta mano. Solo el compañero: lo que
-- grita un rival no le cambia el juego al bot, o le manejarían la partida.
create function team_internal.partner_hint(g public.team_games,p_seat integer) returns text
language sql immutable as $$
  select case last.text
    when '¡Cantales, cantales!' then 'cantales'
    when '¡Quiero!' then 'cantales'
    when 'Algo tengo' then 'tengo'
    when 'Estoy seco' then 'seco'
    when 'No me queda nada, eh' then 'seco' end
  from (
    select x->>'text' as text from jsonb_array_elements(g.chat) x
    where (x->>'seat')::integer=(p_seat+2)%4 and (x->>'hand')::integer=g.hand_number
      and x->>'text' in ('¡Cantales, cantales!','¡Quiero!','Algo tengo','Estoy seco','No me queda nada, eh')
    order by (x->>'at')::timestamptz desc limit 1
  ) last;
$$;

-- El chat rápido pasa por el servidor. NO es una jugada: no toca el reloj del
-- turno ni el número de versión de la mesa. Si tocara la versión, un rival
-- podría invalidarte la jugada a fuerza de mandar mensajes.
create function public.team_say(p_table_id uuid,p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.team_tables; me public.team_seats; g public.team_games; hushed boolean;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if p_text is null or not (p_text=any(team_internal.chat_lines())) then raise exception 'Frase no permitida'; end if;
  select * into t from public.team_tables where id=p_table_id for update;
  if not found or t.status<>'playing' then raise exception 'Mesa no disponible'; end if;
  select * into me from public.team_seats where table_id=p_table_id and user_id=uid;
  if not found or me.seat is null then raise exception 'No sos participante'; end if;
  select * into g from public.team_games where id=p_table_id;
  -- Un mensaje cada dos segundos por persona.
  if exists(select 1 from jsonb_array_elements(g.chat) x where (x->>'seat')::integer=me.seat
    and (x->>'at')::timestamptz>clock_timestamp()-interval '2 seconds')
  then return team_internal.snapshot(p_table_id); end if;
  -- Se mira antes de agregar la frase: así "Calladito" recibe su respuesta y
  -- recién después empieza el silencio.
  hushed:=team_internal.quiet(g);
  perform team_internal.say(p_table_id,me.seat,p_text);
  if not hushed then perform team_internal.bot_hears(p_table_id,me.seat,p_text); end if;
  update public.team_tables set updated_at=now() where id=p_table_id;
  return team_internal.snapshot(p_table_id);
end;
$$;

-- ------------------------------------------------------------
-- 6. EL CEREBRO ESCUCHA AL COMPAÑERO
--
-- Sigue siendo una decisión pura: no consulta tablas ni recibe manos ajenas.
-- Lo que pidió el compañero entra como un parámetro más y solo corre el umbral:
-- es un empujón, no una orden. Con cartas muy buenas acepta igual aunque le
-- hayan dicho "estoy seco", y con cartas muy malas no canta por más que le
-- griten. Sin pedido, decide exactamente igual que antes.
-- ------------------------------------------------------------

drop function team_internal.bot_choice(public.team_games,integer,jsonb,text[],double precision);
create function team_internal.bot_choice(g public.team_games,p_seat integer,p_hand jsonb,p_legal text[],
  p_roll double precision,p_hint text default null)
returns jsonb language plpgsql immutable as $$
declare chosen jsonb; strongest integer; team_leads boolean; remaining_rivals integer; n integer; power integer; env integer; a text;
  bold double precision; bar integer;
begin
  if 'tengo'=any(p_legal) then return jsonb_build_object('action','tengo'); end if;
  if 'son_buenas'=any(p_legal) then return jsonb_build_object('action','son_buenas'); end if;
  bold:=case p_hint when 'cantales' then 0.25 when 'seco' then -0.25 else 0 end;
  bar:=26+case p_hint when 'tengo' then -3 when 'seco' then 2 else 0 end;
  env:=public._envido_points(p_hand || coalesce((select jsonb_agg(x->'card') from jsonb_array_elements(g.played) x where (x->>'seat')::integer=p_seat),'[]'));
  select min((x->>'rank')::integer),sum(15-(x->>'rank')::integer) into strongest,power from jsonb_array_elements(p_hand) x;
  if 'envido_yes'=any(p_legal) then
    a:=case when env>=bar or (env>=bar-4 and p_roll<0.35) then 'envido_yes' else 'envido_no' end;
    if env>=31 and 'real_envido'=any(p_legal) and p_roll<0.5 then a:='real_envido'; end if;
    return jsonb_build_object('action',a);
  end if;
  if 'truco_yes'=any(p_legal) then
    if strongest<=3 and power>=18 and p_roll<0.35 then
      if 'vale_cuatro'=any(p_legal) then return jsonb_build_object('action','vale_cuatro'); end if;
      if 'retruco'=any(p_legal) then return jsonb_build_object('action','retruco'); end if;
    end if;
    return jsonb_build_object('action',case when strongest<=7 or power>=13 or p_roll<0.2+bold then 'truco_yes' else 'truco_no' end);
  end if;
  if 'envido'=any(p_legal) and (env>=bar+1 or p_roll<0.05) then return jsonb_build_object('action','envido'); end if;
  if 'truco'=any(p_legal) and strongest<=4 and p_roll<0.3+bold then return jsonb_build_object('action','truco'); end if;
  if strongest<=3 and power>=18 and p_roll<0.2 then
    if 'vale_cuatro'=any(p_legal) then return jsonb_build_object('action','vale_cuatro'); end if;
    if 'retruco'=any(p_legal) then return jsonb_build_object('action','retruco'); end if;
  end if;
  if not ('play'=any(p_legal)) then return null; end if;
  select min((x->'card'->>'rank')::integer),count(*) into strongest,n from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round;
  if n>0 then
    select bool_and((x->>'seat')::integer%2=p_seat%2) into team_leads from jsonb_array_elements(g.played) x
      where (x->>'round')::integer=g.round and (x->'card'->>'rank')::integer=strongest;
    select count(*) into remaining_rivals from generate_series(0,3) s where s%2<>p_seat%2 and not exists(
      select 1 from jsonb_array_elements(g.played) x where (x->>'round')::integer=g.round and (x->>'seat')::integer=s);
    if team_leads and (remaining_rivals=0 or strongest<=4) then
      select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer desc limit 1;
    else
      select x into chosen from jsonb_array_elements(p_hand) x where (x->>'rank')::integer<strongest order by (x->>'rank')::integer desc limit 1;
    end if;
  else
    select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer asc limit 1;
  end if;
  if chosen is null then select x into chosen from jsonb_array_elements(p_hand) x order by (x->>'rank')::integer desc limit 1; end if;
  return jsonb_build_object('action','play','card',chosen);
end;
$$;

-- ------------------------------------------------------------
-- 7. LA API DE LA MESA
--
-- Copia de la función que ya estaba, con tres cambios y nada más:
--   · el bot se sienta con nombre de jugador en vez de "Bot 1";
--   · al decidir, el bot recibe lo que pidió su compañero;
--   · después de cada jugada, la mesa puede comentarla.
-- ------------------------------------------------------------

create or replace function public.team_action(p_table_id uuid,p_request_id uuid,p_version bigint,p_action text,p_seat integer default null,p_card jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); t public.team_tables; me public.team_seats; r team_internal.requests;
  p jsonb; g public.team_games; member_count integer; actor integer; timed integer; choice jsonb; cards jsonb; a text[]; v_name text;
begin
  if uid is null or p_request_id is null or p_version is null or p_action is null then raise exception 'Solicitud inválida'; end if;
  -- Orden fijo: usuario, mesa, perfiles. No hay cambio de identidad para jugar bots.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into t from public.team_tables where id=p_table_id for update;
  if not found then raise exception 'Mesa no disponible'; end if;
  p:=jsonb_build_object('id',p_table_id,'version',p_version,'action',p_action,'seat',p_seat,'card',p_card);
  select * into r from team_internal.requests q where q.actor=uid and q.request_id=p_request_id;
  if found then
    if r.payload<>p then raise exception 'Identificador de solicitud reutilizado'; end if;
    if p_action='leave' and not team_internal.member(p_table_id) then return jsonb_build_object('left',true); end if;
    return team_internal.snapshot(p_table_id);
  end if;
  select * into me from public.team_seats where table_id=p_table_id and user_id=uid;
  if not found then raise exception 'No sos participante'; end if;
  if t.version<>p_version then return team_internal.snapshot(p_table_id) || '{"stale":true}'::jsonb; end if;
  if t.status in ('finished','cancelled') then return team_internal.snapshot(p_table_id); end if;
  if t.status='waiting' then
    case p_action
    when 'seat' then
      if p_seat is null or p_seat not between 0 and 3 then raise exception 'Asiento inválido'; end if;
      if exists(select 1 from public.team_seats where table_id=p_table_id and seat=p_seat and id<>me.id) then raise exception 'Ese asiento ya está ocupado'; end if;
      update public.team_seats set seat=p_seat where id=me.id;
    when 'add_bot' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede agregar bots'; end if;
      if p_seat is null or p_seat not between 0 and 3 then raise exception 'Asiento inválido'; end if;
      select count(*) into member_count from public.team_seats where table_id=p_table_id;
      if member_count>=4 then raise exception 'No quedan lugares'; end if;
      if exists(select 1 from public.team_seats where table_id=p_table_id and seat=p_seat) then raise exception 'Ese asiento ya está ocupado'; end if;
      -- Un nombre de jugador libre en esta mesa, de la misma lista que usan los
      -- bots del lobby. Si no quedara ninguno, el nombre viejo sirve igual.
      select n.name into v_name from public.lobby_bot_names n
        where not exists(select 1 from public.team_seats s
          where s.table_id=p_table_id and lower(s.username)=lower(n.name))
        order by random() limit 1;
      insert into public.team_seats(table_id,seat,username,paid)
        values(p_table_id,p_seat,coalesce(v_name,'Bot '||(p_seat+1)),t.bet);
    when 'remove_bot' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede quitar bots'; end if;
      delete from public.team_seats where table_id=p_table_id and seat=p_seat and user_id is null;
      if not found then raise exception 'No hay un bot en ese asiento'; end if;
    when 'start' then
      if t.creator_id<>uid then raise exception 'Solo el creador puede comenzar'; end if;
      if (select count(*) from public.team_seats where table_id=p_table_id and seat is not null)<>4 then raise exception 'Faltan jugadores por sentarse'; end if;
      insert into public.team_games(id) values(p_table_id);
      perform team_internal.deal(p_table_id);
      update public.team_tables set status='playing' where id=p_table_id;
    when 'leave' then
      if uid=t.creator_id then perform team_internal.cancel(p_table_id);
      else
        perform team_internal.coins(uid,me.paid);
        delete from public.team_seats where id=me.id;
        update public.team_tables set version=version+1,updated_at=now() where id=p_table_id;
        insert into team_internal.requests values(uid,p_request_id,p_table_id,p);
        return jsonb_build_object('left',true);
      end if;
    else raise exception 'Acción inválida en sala de espera';
    end case;
  else
    select * into g from public.team_games where id=p_table_id;
    if p_action='forfeit' then perform team_internal.finish(p_table_id,1-me.seat%2,'forfeit');
    elsif p_action='tick' then
      if g.awaiting_deal then
        if clock_timestamp()<g.action_started_at+interval '2500 milliseconds' then return team_internal.snapshot(p_table_id); end if;
        perform team_internal.deal(p_table_id);
        update public.team_games set hand_number=hand_number+1,mano=(mano+1)%4,turn=(mano+1)%4,round=1,
          played='[]',rounds='[]',envido='{"status":"none","chain":[]}',truco='{"status":"none","value":1}',
          awaiting_deal=false,reveal=null,announcement=null,action_started_at=now() where id=p_table_id;
      else
        actor:=team_internal.actor(g);
        if clock_timestamp()>=g.action_started_at+make_interval(secs=>t.time_limit) then
          update public.team_seats set timeouts=timeouts+1 where table_id=p_table_id and seat=actor returning timeouts into timed;
          perform team_internal.apply(p_table_id,actor,'mazo');
          update public.team_games set announcement=jsonb_build_object('seat',actor,'text','Sin tiempo · al mazo','action','timeout','at',clock_timestamp()) where id=p_table_id;
          if timed>=3 then perform team_internal.finish(p_table_id,1-actor%2,'timeouts'); end if;
        elsif clock_timestamp()>=g.action_started_at+interval '1200 milliseconds'
          and exists(select 1 from public.team_seats where table_id=p_table_id and seat=actor and user_id is null) then
          select h.cards into cards from public.team_hands h where table_id=p_table_id and seat=actor;
          a:=team_internal.legal(g,actor);
          choice:=team_internal.bot_choice(g,actor,cards,a,random(),team_internal.partner_hint(g,actor));
          if choice is null then return team_internal.snapshot(p_table_id); end if;
          perform team_internal.apply(p_table_id,actor,choice->>'action',choice->'card');
          perform team_internal.bot_talk(p_table_id,actor,choice->>'action');
        else return team_internal.snapshot(p_table_id);
        end if;
      end if;
    else
      if clock_timestamp()>=g.action_started_at+make_interval(secs=>t.time_limit) then raise exception 'Se terminó el tiempo de la jugada'; end if;
      perform team_internal.apply(p_table_id,me.seat,p_action,p_card);
      perform team_internal.bot_talk(p_table_id,me.seat,p_action);
    end if;
  end if;
  update public.team_tables set version=version+1,updated_at=now() where id=p_table_id;
  insert into team_internal.requests values(uid,p_request_id,p_table_id,p);
  return team_internal.snapshot(p_table_id);
end;
$$;

-- ------------------------------------------------------------
-- 8. PERMISOS
--
-- Las ayudantes nuevas quedan cerradas al cliente, como el resto del motor.
-- team_say es la única que se abre, igual que las demás RPC de la mesa.
-- CREATE OR REPLACE conserva los permisos de team_action.
-- ------------------------------------------------------------

revoke all on all functions in schema team_internal from public,anon,authenticated;
revoke all on all tables in schema team_internal from public,anon,authenticated;
revoke execute on function public.team_say(uuid,text) from public,anon;
grant execute on function public.team_say(uuid,text) to authenticated;

commit;
