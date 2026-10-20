-- Corrección y refuerzo exclusivo de los rivales del Noroeste.
-- No modifica bot_step anterior, repartos, reglas ni recompensas.
begin;

-- Integra las 27 combinaciones ganar/pardar/perder. Los resultados públicos
-- tienen probabilidad 0/1: una mano decidida nunca se degrada a una heurística.
-- Usa el desempate vigente del motor 1v1 (mayoría; igualdad final -> mano).
create or replace function public._northwest_win_probability(w numeric[], t numeric[], is_mano boolean)
returns numeric language plpgsql immutable set search_path=public as $$
declare a int; b int; c int; pa numeric; pb numeric; pc numeric; result numeric:=0;
begin
  for a in -1..1 loop
    pa:=case a when 1 then w[1] when 0 then t[1] else 1-w[1]-t[1] end;
    if pa=0 then continue; end if;
    for b in -1..1 loop
      pb:=case b when 1 then w[2] when 0 then t[2] else 1-w[2]-t[2] end;
      if pb=0 then continue; end if;
      -- Dos ganadas o una ganada y una parda cierran en segunda.
      if a+b>0 and a>=0 and b>=0 then result:=result+pa*pb; continue; end if;
      if a+b<0 and a<=0 and b<=0 then continue; end if;
      for c in -1..1 loop
        pc:=case c when 1 then w[3] when 0 then t[3] else 1-w[3]-t[3] end;
        if a+b+c>0 or (a+b+c=0 and is_mano) then result:=result+pa*pb*pc; end if;
      end loop;
    end loop;
  end loop;
  return greatest(0,least(1,result));
end $$;

create or replace function public._northwest_card_choice(
  p_remaining jsonb, p_full jsonb, p_played jsonb, p_results jsonb,
  p_bot uuid, p_mano uuid, p_round int, p_profile text
) returns jsonb language plpgsql stable set search_path=public as $$
declare
  known jsonb:=coalesce(p_full,'[]')||coalesce((select jsonb_agg(e.value->'card')
    from jsonb_array_elements(coalesce(p_played,'[]')) e where e.value->>'player_id'<>p_bot::text),'[]');
  unseen jsonb; shown jsonb; own_shown jsonb; candidates jsonb;
  candidate jsonb; rest jsonb; future_card jsonb; result_row jsonb;
  w numeric[]; t numeric[]; odds_w numeric[]:=array_fill(0::numeric,array[14]);
  odds_t numeric[]:=array_fill(0::numeric,array[14]);
  n int; k int; j int; ordering int; r int; rank_now int; shown_rank int;
  chance numeric; best numeric:=-1; best_card jsonb; ow numeric; ot numeric;
  standing int:=0; best_current numeric:=0; best_future numeric:=0;
begin
  select coalesce(jsonb_agg(d.value),'[]') into unseen from jsonb_array_elements(_truco_deck()) d
    where not exists(select 1 from jsonb_array_elements(known) x
      where x.value->>'suit'=d.value->>'suit' and x.value->>'value'=d.value->>'value');
  n:=greatest(1,jsonb_array_length(unseen));
  for k in 1..14 loop
    select count(*) filter(where (e.value->>'rank')::int>k)::numeric/n,
           count(*) filter(where (e.value->>'rank')::int=k)::numeric/n
      into ow,ot from jsonb_array_elements(unseen) e;
    odds_w[k]:=ow;odds_t[k]:=ot;
  end loop;
  select e.value->'card' into shown from jsonb_array_elements(p_played) e
    where (e.value->>'round')::int=p_round and e.value->>'player_id'<>p_bot::text limit 1;
  select e.value->'card' into own_shown from jsonb_array_elements(p_played) e
    where (e.value->>'round')::int=p_round and e.value->>'player_id'=p_bot::text limit 1;
  shown_rank:=(shown->>'rank')::int;
  -- Responder un canto DESPUÉS de tirar no significa jugar otra carta:
  -- valorar la que ya está en la mesa aunque p_remaining esté vacío.
  candidates:=case when own_shown is not null then jsonb_build_array(own_shown) else p_remaining end;
  for candidate in select value from jsonb_array_elements(candidates) loop
    rank_now:=(candidate->>'rank')::int;
    select coalesce(jsonb_agg(e.value order by (e.value->>'rank')::int),'[]') into rest
      from jsonb_array_elements(p_remaining) e where own_shown is not null or e.value<>candidate;
    -- A lo sumo dos órdenes futuros. No inspecciona la mano humana:
    -- las probabilidades son estimaciones con las cartas aún posibles.
    for ordering in 0..case when jsonb_array_length(rest)=2 then 1 else 0 end loop
      w:=array[0::numeric,0,0]; t:=array[0::numeric,0,0]; standing:=0;
      for result_row in select value from jsonb_array_elements(p_results) loop
        r:=(result_row->>'round')::int;
        if r is null then
          -- Compatibilidad con fixtures antiguos sin número de baza.
          r:=1;
        end if;
        if result_row->>'winner_id'=p_bot::text then w[r]:=1; standing:=standing+1;
        elsif result_row->>'winner_id' is null then t[r]:=1;
        else standing:=standing-1; end if;
      end loop;
      if shown_rank is null then w[p_round]:=odds_w[rank_now];t[p_round]:=odds_t[rank_now];
      else w[p_round]:=case when rank_now<shown_rank then 1 else 0 end;
           t[p_round]:=case when rank_now=shown_rank then 1 else 0 end; end if;
      for j in 0..jsonb_array_length(rest)-1 loop
        future_card:=rest->case when ordering=0 then j else jsonb_array_length(rest)-1-j end;
        r:=p_round+j+1;
        w[r]:=odds_w[(future_card->>'rank')::int];t[r]:=odds_t[(future_card->>'rank')::int];
      end loop;
      chance:=_northwest_win_probability(w,t,p_mano=p_bot);
      if chance>best or (chance=best and (best_card is null or rank_now>(best_card->>'rank')::int)) then
        best:=chance;best_card:=candidate;best_current:=w[p_round]+t[p_round]*0.5;
        best_future:=case when p_round<3 then w[p_round+1]+t[p_round+1]*0.5 else 0 end;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('card',case when own_shown is null then best_card else null end,
    'chance',best_current,'future',best_future,'hand_chance',greatest(0,best),
    'standing',standing,'opponent_rank',shown_rank);
end $$;

create or replace function public._northwest_plan(
  p_remaining jsonb, p_full jsonb, p_played jsonb, p_results jsonb,
  p_envido jsonb, p_truco jsonb, p_bot uuid, p_mano uuid, p_round int,
  p_bot_turn boolean, p_bot_score int, p_human_score int,
  p_profile text, p_liar int, p_aggressive int,
  p_style jsonb, p_seed numeric
) returns jsonb language plpgsql stable set search_path = public as $function$
declare
  choice jsonb; card jsonb; et int; hand_chance numeric; env_chance numeric;
  gain numeric; loss numeric; reject_loss numeric;
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
  hand_chance := coalesce((choice->>'hand_chance')::numeric,0);
  et := public._envido_points(p_full);
  env_chance := greatest(0.04,least(0.97,0.16 + (et-20)*0.055));
  if et=33 and p_mano=p_bot then env_chance:=1; end if;
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
    acceptance := greatest(case es when 'falta_envido' then 0.80
                                   when 'real_envido' then 0.65 else 0.47 end,
                           (value_env-reject_env)::numeric/(2*value_env)+0.10);
    if p_human_score+value_env>=30 then acceptance := acceptance+0.06; end if;
    if es<>'falta_envido' then acceptance := acceptance-human_bluff*reads*0.12; end if;
    if es='falta_envido' and et<29 then acceptance := 1; end if;
    -- No querer también concede puntos. No regalar el punto del partido.
    if p_human_score+reject_env>=30 then acceptance:=0;
    elsif p_bot_score+value_env>=30 then
      gain:=30; loss:=case when p_human_score+value_env>=30 then 30 else value_env end;
      acceptance:=least(acceptance,(loss-reject_env)/(gain+loss)+0.05);
    end if;
    -- Con 33 siendo mano no hay riesgo: cobrar el máximo posible.
    if es<>'falta_envido' and env_chance=1 then
      return jsonb_build_object('action','sing_envido','type','falta_envido');
    end if;
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
    reject_loss:=greatest(1,value_truco-1);
    if p_human_score+reject_loss>=30 then acceptance:=0;
    elsif p_bot_score+value_truco>=30 then
      gain:=30;loss:=case when p_human_score+value_truco>=30 then 30 else value_truco end;
      acceptance:=least(acceptance,(loss-reject_loss)/(gain+loss)+0.05);
    end if;
    if value_truco<4 and (hand_chance=1 or (hand_chance>0.78
       and p_seed<0.25 + greatest(0,p_aggressive-5)*0.025
       and p_human_score+value_truco+1<30)) then
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
  -- Reservar el canto por valor para tantos competitivos. Los tantos medios
  -- presionan sólo si la reputación pública muestra que el rival se retira.
  if can_env and (et>=27 or
     (et>=25 and human_fold*reads>0.45 and p_seed<0.60) or
     (et<=19 and p_seed<bluff and p_human_score+2<30)) then
    return jsonb_build_object('action','sing_envido','type',
      case when env_chance=1 then 'falta_envido'
           when et>=32 and p_bot_score+3>=30 then 'real_envido' else 'envido' end);
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
     and value_truco<4 and (hand_chance=1 or (hand_chance>0.78 and p_seed<0.18
     and p_human_score+value_truco+1<30)) then
    return jsonb_build_object('action','sing_truco','type',
                              case value_truco when 2 then 'retruco' else 'vale_cuatro' end);
  end if;
  if card is null or card='null'::jsonb then return jsonb_build_object('action','wait'); end if;
  return jsonb_build_object('action','play','card',card,'chance',hand_chance);
end;
$function$;

revoke execute on function public._northwest_plan(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,uuid,uuid,int,boolean,int,int,text,int,int,jsonb,numeric) from public,anon,authenticated;
revoke execute on function public._northwest_win_probability(numeric[],numeric[],boolean) from public,anon,authenticated;
revoke execute on function public._northwest_card_choice(jsonb,jsonb,jsonb,jsonb,uuid,uuid,int,text) from public,anon,authenticated;

commit;
