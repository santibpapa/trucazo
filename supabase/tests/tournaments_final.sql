-- PR 5: cola, agenda, premios y proyección de espectadores. Todo se revierte.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Torneos PR5: %',msg; end if; end $$;

insert into auth.users(instance_id,id,aud,role,email,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',
 ('dd100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid,
 'authenticated','authenticated','final-tournament-'||i||'@trucazo.com.ar',now(),
 '{}','{}',i=9,now(),now() from generate_series(0,9) i;
insert into public.profiles(id,username,is_admin,is_bot,coins)
select ('dd100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid,
 'Finalista'||i,i=0,false,100 from generate_series(0,9) i
on conflict(id) do update set username=excluded.username,is_admin=excluded.is_admin,
 is_bot=false,coins=100;

create function pg_temp.uid(i integer) returns uuid language sql immutable as $$
 select ('dd100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid $$;

do $$
declare t uuid; t2 uuid; t3 uuid; e uuid[]:='{}'; e2 uuid[]:='{}';
 v_e uuid; v_game uuid; i integer; final_id uuid;
begin
 insert into public.tournaments(name,mode,format,capacity,target_score,
  prize_first,prize_second,prize_third,starts_at,status,published_at,created_by,updated_by)
 values('Final de prueba','1v1','knockout',4,15,200,100,50,
  now()+interval '2 days','published',now(),pg_temp.uid(0),pg_temp.uid(0)) returning id into t;
 perform pg_temp.check((select count(*)=9 from public.tournament_email_jobs
  where tournament_id=t and job_type='announcement'),
  'publicar directamente no anunció o incluyó una cuenta anónima');
 for i in 1..4 loop
  insert into public.tournament_entries(tournament_id,status,kind,created_by)
   values(t,'active','solo',pg_temp.uid(i)) returning id into v_e;
  e:=array_append(e,v_e);
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
   values(t,e[i],pg_temp.uid(i),'captain','accepted',now());
 end loop;
 perform pg_temp.check((select count(*)=4 from public.tournament_email_jobs
  where tournament_id=t and job_type='registration'), 'falta confirmación de inscripción');
 perform pg_temp.check((select count(*)=4 from public.tournament_email_jobs
  where tournament_id=t and job_type='reminder'), 'faltan recordatorios');
 perform pg_temp.check((select count(*)=4 from public.tournament_email_jobs
  where tournament_id=t and job_type='checkin'), 'falta agenda de check-in');
 update public.tournaments set starts_at=now()+interval '3 days',schedule_version=2 where id=t;
 perform pg_temp.check((select count(*)=4 from public.tournament_email_jobs
  where tournament_id=t and job_type='rescheduled'), 'reprogramar no avisó');
 perform pg_temp.check((select count(*)=0 from public.tournament_email_jobs
  where tournament_id=t and schedule_version=1 and status='pending'),
  'quedaron trabajos viejos pendientes');
 perform pg_temp.check((select count(*)=4 from public.tournament_notifications
  where tournament_id=t and kind='rescheduled'), 'faltan avisos dentro del juego');

 insert into public.tables(name,creator_id,creator_username,opponent_id,opponent_username,
   bet,status,is_private,private_code,target_score,time_limit)
 values('Mesa local PR5',pg_temp.uid(1),'Finalista1',pg_temp.uid(2),'Finalista2',
   10,'playing',true,'PR5LOCAL',15,30) returning id into v_game;
 insert into public.games(id,player1_id,player2_id,player1_username,player2_username,
   current_turn,mano_player,bet,target_score)
 values(v_game,pg_temp.uid(1),pg_temp.uid(2),'Finalista1','Finalista2',
   pg_temp.uid(1),pg_temp.uid(1),10,15);
 insert into public.game_hands(game_id,player_id,cards)
 values(v_game,pg_temp.uid(1),'[{"suit":"oro","value":1}]'),
   (v_game,pg_temp.uid(2),'[{"suit":"espada","value":1}]');
 insert into public.tournament_matches(tournament_id,phase,round_number,match_number,
  side_a_entry_id,side_b_entry_id,status,winner_entry_id,loser_entry_id,game_id,
  finished_at,result_applied_at)
 values(t,'final',2,1,e[1],e[2],'finished',e[1],e[2],v_game,now(),now()) returning id into final_id;
 insert into public.tournament_matches(tournament_id,phase,round_number,match_number,
  side_a_entry_id,side_b_entry_id,status,winner_entry_id,loser_entry_id,
  finished_at,result_applied_at)
 values(t,'third_place',2,1,e[3],e[4],'finished',e[3],e[4],now(),now());
 update public.tournaments set status='running' where id=t;
 update public.tournaments set status='completed' where id=t;
 perform tournament_internal.award_podium(t);
 perform pg_temp.check((select coins=300 from public.profiles where id=pg_temp.uid(1)),
  'oro no acreditado exactamente una vez');
 perform pg_temp.check((select coins=200 from public.profiles where id=pg_temp.uid(2)),
  'plata no acreditada exactamente una vez');
 perform pg_temp.check((select coins=150 from public.profiles where id=pg_temp.uid(3)),
  'bronce no acreditado exactamente una vez');
 perform pg_temp.check((select count(*)=3 from public.tournament_awards where tournament_id=t),
  'se duplicaron premios');
 perform pg_temp.check((select count(*)=3 from public.profile_medals
  where profile_id in (pg_temp.uid(1),pg_temp.uid(2),pg_temp.uid(3))
  and medal_slug in ('torneo_oro','torneo_plata','torneo_bronce')), 'faltan insignias');

 insert into public.tournaments(name,mode,format,capacity,target_score,
  prize_first,prize_second,prize_third,starts_at,status,published_at,created_by,updated_by)
 values('Parejas de prueba','2v2','knockout',8,15,30,20,10,
  now()+interval '2 days','published',now(),pg_temp.uid(0),pg_temp.uid(0)) returning id into t2;
 for i in 0..3 loop
  insert into public.tournament_entries(tournament_id,status,kind,created_by)
   values(t2,'active','team',pg_temp.uid(2*i+1)) returning id into v_e;
  e2:=array_append(e2,v_e);
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
   values(t2,v_e,pg_temp.uid(2*i+1),'captain','accepted',now()),
    (t2,v_e,pg_temp.uid(2*i+2),'invitee','accepted',now());
 end loop;
 insert into public.tournament_matches(tournament_id,phase,round_number,match_number,
  side_a_entry_id,side_b_entry_id,status,winner_entry_id,loser_entry_id,
  finished_at,result_applied_at)
 values(t2,'final',2,1,e2[1],e2[2],'finished',e2[1],e2[2],now(),now()),
  (t2,'third_place',2,1,e2[3],e2[4],'finished',e2[3],e2[4],now(),now());
 update public.tournaments set status='running' where id=t2;
 update public.tournaments set status='completed' where id=t2;
 perform tournament_internal.award_podium(t2);
 perform pg_temp.check((select count(*)=6 from public.tournament_awards where tournament_id=t2),
  'parejas: faltan premios individuales o se duplicaron');
 perform pg_temp.check((select coins=330 from public.profiles where id=pg_temp.uid(1))
  and (select coins=230 from public.profiles where id=pg_temp.uid(2)),
  'parejas: el oro no se acreditó íntegro a ambos');
 perform pg_temp.check((select coins=170 from public.profiles where id=pg_temp.uid(3))
  and (select coins=120 from public.profiles where id=pg_temp.uid(4)),
  'parejas: la plata no se acreditó íntegra a ambos');
 perform pg_temp.check((select coins=110 from public.profiles where id=pg_temp.uid(5))
  and (select coins=110 from public.profiles where id=pg_temp.uid(6)),
  'parejas: el bronce no se acreditó íntegro a ambos');

 insert into public.tournaments(name,mode,format,capacity,target_score,
  starts_at,status,published_at,created_by,updated_by)
 values('Cancelado de prueba','1v1','knockout',4,15,now()+interval '2 days',
  'published',now(),pg_temp.uid(0),pg_temp.uid(0)) returning id into t3;
 insert into public.tournament_entries(tournament_id,status,kind,created_by)
  values(t3,'active','solo',pg_temp.uid(8)) returning id into v_e;
 insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
  values(t3,v_e,pg_temp.uid(8),'captain','accepted',now());
 update public.tournaments set status='cancelled',cancelled_at=now() where id=t3;
 perform pg_temp.check((select count(*)=1 from public.tournament_email_jobs
  where tournament_id=t3 and job_type='cancelled' and status='pending'),
  'cancelar no encoló el aviso');
 perform pg_temp.check((select count(*)=0 from public.tournament_email_jobs
  where tournament_id=t3 and job_type<>'cancelled' and status='pending'),
  'cancelar dejó correos viejos listos para enviar');
 select id into v_e from public.tournament_email_jobs where tournament_id=t3
  and job_type='cancelled' limit 1;
 update public.tournament_email_jobs set status='failed',attempts=6 where id=v_e;
 perform set_config('request.jwt.claim.sub',pg_temp.uid(0)::text,true);
 set local role authenticated;
 perform public.tournament_admin_retry_email(v_e);
 reset role;
 perform pg_temp.check((select status='pending' and attempts=0
  from public.tournament_email_jobs where id=v_e), 'admin no pudo reintentar un envío fallido');

 perform set_config('request.jwt.claim.sub',pg_temp.uid(5)::text,true);
 perform pg_temp.check((public.tournament_spectator_snapshot(final_id)->>'match_id')=final_id::text,
  'espectador registrado no puede consultar');
 perform pg_temp.check(not ((public.tournament_spectator_snapshot(final_id)->'game') ? 'hand')
  and not ((public.tournament_spectator_snapshot(final_id)->'game') ? 'cards'),
  'se filtró una mano');
 set local role authenticated;
 perform pg_temp.check((select count(*)=0 from public.game_hands where game_id=v_game),
  'un espectador leyó manos directamente');
 reset role;
 perform set_config('request.jwt.claim.sub',pg_temp.uid(9)::text,true);
 begin
  perform public.tournament_spectator_snapshot(final_id);
  raise exception 'invitado leyó partida';
 exception when raise_exception then
  if sqlerrm='invitado leyó partida' then raise; end if;
 end;
 perform set_config('request.jwt.claim.sub',pg_temp.uid(5)::text,true);
 perform pg_temp.check(jsonb_array_length(public.tournament_notifications_list())>=0,
  'consulta de avisos falló');
end $$;
rollback;
