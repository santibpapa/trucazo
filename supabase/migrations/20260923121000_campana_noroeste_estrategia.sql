-- Ruta del Noroeste: cerebro separado. La función vigente se conserva para
-- los 46 rivales anteriores y para los bots del lobby, sin copiar una versión
-- antigua que pudiera pisar correcciones. Ninguna decisión lee la mano humana.
begin;

-- Congelar la implementación existente ANTES de reemplazar el punto de entrada.
-- pg_get_functiondef toma la versión realmente vigente al aplicar este SQL.
do $snapshot$
declare definition text;
begin
  if to_regprocedure('public._bot_step_pre_noroeste(uuid)') is null then
    definition := pg_get_functiondef('public.bot_step(uuid)'::regprocedure);
    if position('FUNCTION public.bot_step(' in definition) = 0 then
      raise exception 'No se pudo conservar bot_step vigente';
    end if;
    execute replace(definition, 'FUNCTION public.bot_step(', 'FUNCTION public._bot_step_pre_noroeste(');
  end if;
end $snapshot$;

-- Evalúa cada carta con el mazo restante: sólo resta las tres cartas PROPIAS
-- y las cartas públicas de la mesa. Responder a una carta vista es exacto;
-- al abrir estima contra cada carta todavía posible. Reserva cartas útiles
-- para las bazas siguientes y contempla las pardas y quién es mano.
create or replace function public._northwest_card_choice(
  p_remaining jsonb, p_full jsonb, p_played jsonb, p_results jsonb,
  p_bot uuid, p_mano uuid, p_round int, p_profile text
) returns jsonb language plpgsql stable set search_path = public as $function$
declare
  candidate jsonb; other_card jsonb; unseen jsonb := '[]'::jsonb;
  known jsonb := coalesce(p_full,'[]'::jsonb) || coalesce(
    (select jsonb_agg(e.value->'card') from jsonb_array_elements(coalesce(p_played,'[]'::jsonb)) e
     where e.value->>'player_id' <> p_bot::text), '[]'::jsonb);
  shown_rank int; rank_now int; rest_rank int; n int;
  standing int; current_chance numeric; future_chance numeric;
  candidate_score numeric; best_score numeric := -100; best_card jsonb;
  best_chance numeric := 0; best_future numeric := 0;
  current_weight numeric;
begin
  select (e.value->'card'->>'rank')::int into shown_rank
    from jsonb_array_elements(coalesce(p_played,'[]'::jsonb)) e
   where (e.value->>'round')::int = p_round and e.value->>'player_id' <> p_bot::text
   limit 1;
  select count(*) filter (where e.value->>'winner_id'=p_bot::text)
       - count(*) filter (where e.value->>'winner_id' is not null and e.value->>'winner_id'<>p_bot::text)
    into standing from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) e;

  for other_card in select value from jsonb_array_elements(public._truco_deck()) loop
    if not exists (select 1 from jsonb_array_elements(known) k where k.value=other_card) then
      unseen := unseen || jsonb_build_array(other_card);
    end if;
  end loop;
  n := greatest(jsonb_array_length(unseen),1);
  current_weight := case p_profile
    when 'paciente' then 0.43 when 'agresivo' then 0.51
    when 'farolera' then 0.48 when 'marcador' then 0.47 else 0.45 end;
  if p_round = 2 then
    current_weight := case when shown_rank is not null then 0.90
                           when standing > 0 then 0.42 else 0.55 end;
  end if;
  if p_round >= 3 then current_weight := 1; end if;

  for candidate in select value from jsonb_array_elements(coalesce(p_remaining,'[]'::jsonb)) loop
    rank_now := (candidate->>'rank')::int;
    if shown_rank is not null then
      current_chance := case when rank_now < shown_rank then 1
                             when rank_now = shown_rank then
                               case when p_mano=p_bot then 0.63 else 0.42 end
                             else 0 end;
    else
      select (count(*) filter (where (e.value->>'rank')::int > rank_now)
              + 0.5 * count(*) filter (where (e.value->>'rank')::int = rank_now)) / n::numeric
        into current_chance from jsonb_array_elements(unseen) e;
    end if;

    future_chance := 0;
    for other_card in select value from jsonb_array_elements(p_remaining) loop
      if other_card = candidate then continue; end if;
      rest_rank := (other_card->>'rank')::int;
      future_chance := greatest(future_chance,
        (select (count(*) filter (where (e.value->>'rank')::int > rest_rank)
                  + 0.5 * count(*) filter (where (e.value->>'rank')::int = rest_rank)) / n::numeric
           from jsonb_array_elements(unseen) e));
    end loop;

    -- La fuerza que queda importa más cuando se perdió la primera baza.
    candidate_score := current_weight * current_chance
                     + (1-current_weight) * future_chance
                     - (15-rank_now) * case when p_round=1 then 0.004 else 0.001 end;
    if candidate_score > best_score or (candidate_score = best_score and
       (best_card is null or rank_now > (best_card->>'rank')::int)) then
      best_score := candidate_score;
      best_card := candidate;
      best_chance := current_chance;
      best_future := future_chance;
    end if;
  end loop;

  return jsonb_build_object('card',best_card,'chance',best_chance,
                            'future',best_future,'standing',coalesce(standing,0),
                            'opponent_rank',shown_rank);
end;
$function$;

-- Función de decisión pura: el llamador entrega la semilla y ÚNICAMENTE
-- cartas propias + cartas ya reveladas. Es comprobable con dos manos humanas
-- ocultas distintas manteniendo iguales estas entradas.
create or replace function public._northwest_plan(
  p_remaining jsonb, p_full jsonb, p_played jsonb, p_results jsonb,
  p_envido jsonb, p_truco jsonb, p_bot uuid, p_mano uuid, p_round int,
  p_bot_turn boolean, p_bot_score int, p_human_score int,
  p_profile text, p_liar int, p_aggressive int,
  p_style jsonb, p_seed numeric
) returns jsonb language plpgsql stable set search_path = public as $function$
declare
  choice jsonb; card jsonb; et int; hand_chance numeric; env_chance numeric;
  current_chance numeric; future_chance numeric; standing int;
  es text := coalesce(p_envido->>'status','none');
  ts text := coalesce(p_truco->>'status','none');
  value_truco int := coalesce((p_truco->>'value')::int,2);
  value_env int; reject_env int; acceptance numeric; bluff numeric;
  human_bluff numeric := coalesce((p_style->>'liar_rate')::numeric,0);
  human_fold numeric := coalesce((p_style->>'fold_rate')::numeric,0);
  human_aggr numeric := coalesce((p_style->>'aggr_rate')::numeric,0);
  reads numeric := coalesce((p_style->>'read')::numeric,0);
  can_env boolean;
begin
  choice := public._northwest_card_choice(p_remaining,p_full,p_played,p_results,
                                           p_bot,p_mano,p_round,p_profile);
  card := choice->'card';
  current_chance := coalesce((choice->>'chance')::numeric,0);
  future_chance := coalesce((choice->>'future')::numeric,0);
  standing := coalesce((choice->>'standing')::int,0);
  et := public._envido_points(p_full);
  env_chance := greatest(0.04,least(0.97,0.16 + (et-20)*0.055));

  if p_round >= 3 then hand_chance := current_chance;
  elsif standing > 0 then hand_chance := 1-(1-current_chance)*(1-future_chance);
  elsif standing < 0 then hand_chance := current_chance*future_chance;
  else hand_chance := current_chance*future_chance
                           + (1-current_chance)*current_chance*future_chance;
  end if;
  hand_chance := greatest(0.02,least(0.98,hand_chance
    + case when p_mano=p_bot then 0.04 else 0 end
    + case when p_profile='calculador' then 0.02 else 0 end));
  bluff := case when p_profile='farolera' then 0.08
                when p_profile='agresivo' then 0.045 else 0.015 end
           + greatest(0, human_fold-human_aggr)*reads*0.12
           + greatest(0,p_liar-5)*0.004;

  if es='declaring' and p_envido->>'declare_turn'=p_bot::text then
    if (p_envido->>'mano_declared') is null or et>(p_envido->>'mano_declared')::int then
      return jsonb_build_object('action','envido_say','type','tengo');
    end if;
    return jsonb_build_object('action','envido_say','type','son_buenas');
  end if;

  if es in ('envido','real_envido','falta_envido')
     and p_envido->>'last_singer' is distinct from p_bot::text then
    value_env := greatest(1,coalesce((p_envido->>'value')::int,2));
    reject_env := public._envido_reject_value(p_envido->'chain',p_bot_score,p_human_score,30);
    acceptance := greatest(case es when 'falta_envido' then 0.82
                                   when 'real_envido' then 0.51 else 0.36 end,
                           (value_env-reject_env)::numeric/(2*value_env)+0.10);
    if p_human_score+value_env>=30 then acceptance := acceptance+0.06; end if;
    if es<>'falta_envido' then acceptance := acceptance-human_bluff*reads*0.12; end if;
    if es='falta_envido' and et<29 then acceptance := 1; end if;
    if es='envido' and env_chance>0.81 and p_seed<0.30
       and p_human_score+5<30 then
      return jsonb_build_object('action','sing_envido','type','real_envido');
    end if;
    if env_chance>=acceptance then
      return jsonb_build_object('action','respond_envido_yes');
    end if;
    return jsonb_build_object('action','respond_envido_no');
  end if;

  if ts in ('truco','retruco','vale_cuatro')
     and p_truco->>'last_singer' is distinct from p_bot::text then
    acceptance := 0.42 + case when p_human_score+value_truco>=30 then 0.12 else 0 end
                       - case when p_bot_score+value_truco>=30 then 0.06 else 0 end
                       - human_bluff*reads*0.10;
    if value_truco<4 and hand_chance>0.78
       and p_seed<0.25 + greatest(0,p_aggressive-5)*0.025
       and p_human_score+value_truco+1<30 then
      return jsonb_build_object('action','sing_truco','type',
                                case value_truco when 2 then 'retruco' else 'vale_cuatro' end);
    end if;
    if hand_chance>=acceptance then
      return jsonb_build_object('action','respond_truco_yes');
    end if;
    return jsonb_build_object('action','respond_truco_no');
  end if;

  if not p_bot_turn then return jsonb_build_object('action','wait'); end if;
  can_env := es='none' and p_round=1 and ts<>'accepted'
             and not exists (select 1 from jsonb_array_elements(p_played) e
                             where e.value->>'player_id'=p_bot::text);
  if can_env and ((env_chance>0.32 and
      p_seed<least(1,0.60+(env_chance-0.32)*0.70)) or
     (et<=19 and p_seed<bluff and p_human_score+2<30)) then
    return jsonb_build_object('action','sing_envido','type',
      case when env_chance>0.88 and p_bot_score+3>=30 then 'real_envido' else 'envido' end);
  end if;

  if ts='none' and (hand_chance>case p_profile
                    when 'paciente' then 0.68 when 'agresivo' then 0.56
                    when 'marcador' then case when p_bot_score<p_human_score then 0.57 else 0.66 end
                    else 0.62 end
                    or (hand_chance<0.24 and p_seed<bluff
                        and p_human_score+2<30)) then
    return jsonb_build_object('action','sing_truco','type','truco');
  end if;
  if ts='accepted' and p_truco->>'last_singer' is distinct from p_bot::text
     and value_truco<4 and hand_chance>0.78 and p_seed<0.18
     and p_human_score+value_truco+1<30 then
    return jsonb_build_object('action','sing_truco','type',
                              case value_truco when 2 then 'retruco' else 'vale_cuatro' end);
  end if;
  if card is null then return jsonb_build_object('action','wait'); end if;
  return jsonb_build_object('action','play','card',card,'chance',hand_chance);
end;
$function$;

create or replace function public._northwest_bot_step(p_game_id uuid)
returns games language plpgsql security definer set search_path = public as $function$
declare
  uid uuid := auth.uid(); g games%rowtype; r campaign_rivals%rowtype;
  v_bot uuid; v_human uuid; remaining jsonb; full_hand jsonb;
  cs campaign_style%rowtype; hp int; fama numeric; reads numeric;
  style jsonb; decision jsonb; action text; ok boolean := true; error_text text;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id=p_game_id;
  if not found then raise exception 'game not found'; end if;
  if uid not in (g.player1_id,g.player2_id) then raise exception 'not a player of this game'; end if;
  select * into r from campaign_rivals where id=g.campaign_rival_id;
  if r.strategy_profile is null then raise exception 'rival sin estrategia del Noroeste'; end if;
  select id into v_bot from profiles where id in (g.player1_id,g.player2_id) and is_bot limit 1;
  if v_bot is null or uid=v_bot then raise exception 'el bot no juega solo'; end if;
  if g.status<>'playing' or g.awaiting_deal then return g; end if;
  v_human := case when v_bot=g.player1_id then g.player2_id else g.player1_id end;

  -- ÚNICA lectura de game_hands: la fila del bot. Las cartas jugadas son
  -- públicas; se reconstruye así el envido de su mano original.
  select cards into remaining from game_hands where game_id=p_game_id and player_id=v_bot;
  full_hand := coalesce(remaining,'[]'::jsonb) || coalesce(
    (select jsonb_agg(e.value->'card') from jsonb_array_elements(g.played_cards) e
     where e.value->>'player_id'=v_bot::text),'[]'::jsonb);
  select * into cs from campaign_style where user_id=v_human;
  hp := coalesce(cs.hands_played,0);
  select least(1,coalesce(campaign_points,0)::numeric/2000) into fama from profiles where id=v_human;
  reads := coalesce(fama,0)*least(1,hp::numeric/20);
  style := jsonb_build_object('read',reads,
    'liar_rate',(coalesce(cs.envido_bluff,0)+coalesce(cs.truco_bluff,0))::numeric /
      greatest(1,coalesce(cs.envido_sung,0)+coalesce(cs.truco_sung,0)),
    'fold_rate',least(1,(coalesce(cs.envido_folded,0)+coalesce(cs.truco_folded,0))::numeric /
      greatest(1,hp)*2),
    'aggr_rate',least(1,(coalesce(cs.envido_sung,0)+coalesce(cs.truco_sung,0))::numeric /
      greatest(1,hp)/1.5));
  decision := public._northwest_plan(remaining,full_hand,g.played_cards,g.round_results,
    g.envido_state,g.truco_state,v_bot,g.mano_player,g.round_number,
    g.current_turn=v_bot,
    case when v_bot=g.player1_id then g.player1_score else g.player2_score end,
    case when v_human=g.player1_id then g.player1_score else g.player2_score end,
    r.strategy_profile,r.trait_liar,r.trait_aggressive,style,random());
  action := decision->>'action';
  if action='wait' then return g; end if;

  perform set_config('request.jwt.claim.sub',v_bot::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',v_bot::text,'role','authenticated')::text,true);
  begin
    case action
      when 'play' then perform public.play_card(p_game_id,decision->'card');
      when 'sing_envido' then perform public.sing_envido(p_game_id,decision->>'type');
      when 'sing_truco' then perform public.sing_truco(p_game_id,decision->>'type');
      when 'respond_envido_yes' then perform public.respond_envido(p_game_id,true);
      when 'respond_envido_no' then perform public.respond_envido(p_game_id,false);
      when 'respond_truco_yes' then perform public.respond_truco(p_game_id,true);
      when 'respond_truco_no' then perform public.respond_truco(p_game_id,false);
      when 'envido_say' then perform public.envido_say(p_game_id,decision->>'type');
    end case;
  exception when others then
    ok := false; error_text := sqlerrm;
  end;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',uid::text,'role','authenticated')::text,true);
  insert into bot_decisions (game_id,rival_id,situation,action,detail,numbers,ok,error)
  values (p_game_id,g.campaign_rival_id,'noroeste',action,decision->>'type',decision,ok,error_text);
  select * into g from games where id=p_game_id;
  return g;
end;
$function$;

create or replace function public.bot_step(p_game_id uuid)
returns games language plpgsql security definer set search_path = public as $function$
begin
  if exists (select 1 from games g join campaign_rivals r on r.id=g.campaign_rival_id
             where g.id=p_game_id and r.strategy_profile is not null) then
    return public._northwest_bot_step(p_game_id);
  end if;
  return public._bot_step_pre_noroeste(p_game_id);
end;
$function$;

revoke execute on function public._bot_step_pre_noroeste(uuid) from public, anon, authenticated;
revoke execute on function public._northwest_card_choice(jsonb,jsonb,jsonb,jsonb,uuid,uuid,int,text) from public, anon, authenticated;
revoke execute on function public._northwest_plan(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,uuid,uuid,int,boolean,int,int,text,int,int,jsonb,numeric) from public, anon, authenticated;
revoke execute on function public._northwest_bot_step(uuid) from public, anon, authenticated;
revoke execute on function public.bot_step(uuid) from public, anon;
grant execute on function public.bot_step(uuid) to authenticated;

commit;
