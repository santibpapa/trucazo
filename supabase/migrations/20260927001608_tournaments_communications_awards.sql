-- PR 5: comunicaciones, premios y lectura publica de partidas.
-- No modifica las migraciones ya aplicadas. El cron se pausa con
-- select cron.alter_job(jobid := ..., active := false) si se revierte el lanzamiento.
begin;

alter table public.email_preferences add column tournaments_enabled boolean not null default true;
alter table public.email_deliveries drop constraint email_deliveries_kind_check;
alter table public.email_deliveries add constraint email_deliveries_kind_check
  check (kind in ('news','never_played','inactive','tournament'));
alter table public.email_deliveries drop constraint email_delivery_source_check;
alter table public.email_deliveries add constraint email_delivery_source_check check (
  (kind='news' and campaign_id is null) or
  (kind in ('never_played','inactive') and news_id is null and campaign_id is not null) or
  (kind='tournament' and news_id is null and campaign_id is null));
alter table public.tournament_email_jobs
  add column token uuid not null default gen_random_uuid(),
  add column next_attempt_at timestamptz not null default now(),
  add column provider_id text;
create index tournament_email_retry_idx on public.tournament_email_jobs(next_attempt_at)
  where status in ('pending','failed','processing');
grant select, update on public.tournament_email_jobs to service_role;

create table tournament_internal.email_settings (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false
);
insert into tournament_internal.email_settings(singleton,enabled) values(true,false);
alter table tournament_internal.email_settings enable row level security;
revoke all on tournament_internal.email_settings from public,anon,authenticated;

insert into public.medals(slug,name,description,emoji,kind,sort_order) values
 ('torneo_oro','Campeón de torneo','Ganaste un torneo de Trucazo.','🥇','event',10),
 ('torneo_plata','Subcampeón de torneo','Terminaste segundo en un torneo.','🥈','event',11),
 ('torneo_bronce','Tercer puesto de torneo','Terminaste tercero en un torneo.','🥉','event',12)
on conflict(slug) do nothing;

create function tournament_internal.award_podium(p_tournament_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; podium record; member record; v_id uuid;
begin
 select * into t from public.tournaments where id=p_tournament_id for update;
 if t.status <> 'completed' then return; end if;
 for podium in
  select 1 as placement, m.winner_entry_id as entry_id, t.prize_first as coins, 'torneo_oro' as medal
    from public.tournament_matches m where m.tournament_id=t.id and m.phase='final' and m.status in ('finished','forfeit')
  union all
  select 2, m.loser_entry_id, t.prize_second, 'torneo_plata'
    from public.tournament_matches m where m.tournament_id=t.id and m.phase='final' and m.status in ('finished','forfeit')
  union all
  select 3, m.winner_entry_id, t.prize_third, 'torneo_bronce'
    from public.tournament_matches m where m.tournament_id=t.id and m.phase='third_place' and m.status in ('finished','forfeit')
 loop
  if podium.entry_id is null then continue; end if;
  for member in select distinct em.user_id from public.tournament_entry_members em
    where em.entry_id=podium.entry_id and em.status='accepted'
  loop
   insert into public.tournament_awards(tournament_id,entry_id,user_id,placement,coins,medal_slug,dedupe_key,awarded_at)
   values(t.id,podium.entry_id,member.user_id,podium.placement,podium.coins,podium.medal,
     t.id::text||':'||member.user_id::text||':'||podium.placement,now())
   on conflict do nothing returning id into v_id;
   if v_id is not null then
    update public.profiles set coins=coins+podium.coins where id=member.user_id;
    insert into public.profile_medals(profile_id,medal_slug) values(member.user_id,podium.medal)
      on conflict do nothing;
   end if;
   v_id:=null;
  end loop;
 end loop;
end; $$;
revoke all on function tournament_internal.award_podium(uuid) from public,anon,authenticated;

create function tournament_internal.queue_email(p_tournament_id uuid,p_user_id uuid,p_type text,
 p_due timestamptz,p_version integer,p_suffix text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.tournament_email_jobs(tournament_id,user_id,job_type,due_at,next_attempt_at,
   schedule_version,dedupe_key)
 values(p_tournament_id,p_user_id,p_type,greatest(p_due,now()),greatest(p_due,now()),p_version,
   p_tournament_id::text||':'||p_version::text||':'||p_type||':'||p_user_id::text||':'||p_suffix)
 on conflict(dedupe_key) do nothing;
end; $$;
revoke all on function tournament_internal.queue_email(uuid,uuid,text,timestamptz,integer,text) from public,anon,authenticated;

create function tournament_internal.notify(p_tournament_id uuid,p_user_id uuid,p_type text,p_key text,
 p_payload jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.tournament_notifications(tournament_id,user_id,kind,payload,dedupe_key)
 values(p_tournament_id,p_user_id,p_type,p_payload,p_key) on conflict(dedupe_key) do nothing;
end; $$;
revoke all on function tournament_internal.notify(uuid,uuid,text,text,jsonb) from public,anon,authenticated;

create function tournament_internal.schedule_member(p_tournament_id uuid,p_user_id uuid,
 p_receipt boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tournaments;
begin
 select * into t from public.tournaments where id=p_tournament_id;
 if t.status <> 'published' then return; end if;
 if p_receipt then
   perform tournament_internal.queue_email(t.id,p_user_id,'registration',now(),t.schedule_version);
   perform tournament_internal.notify(t.id,p_user_id,'registration',
     t.id::text||':registration:'||p_user_id::text);
 end if;
 if t.starts_at - now() >= interval '24 hours' then
  perform tournament_internal.queue_email(t.id,p_user_id,'reminder',t.starts_at-interval '24 hours',t.schedule_version);
 end if;
 perform tournament_internal.queue_email(t.id,p_user_id,'checkin',t.starts_at-interval '30 minutes',t.schedule_version);
end; $$;
revoke all on function tournament_internal.schedule_member(uuid,uuid,boolean) from public,anon,authenticated;

create function tournament_internal.member_communications() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ready_match record;
begin
 if tg_op='INSERT' then
  if new.status<>'accepted' then return new; end if;
  perform tournament_internal.schedule_member(new.tournament_id,new.user_id,true);
 elsif new.status='accepted' and old.status is distinct from 'accepted' then
  perform tournament_internal.schedule_member(new.tournament_id,new.user_id,true);
 else
  return new;
 end if;
 -- Un reemplazo admitido después de abrir un cruce también necesita el aviso.
 for ready_match in select m.id,m.ready_at,t.schedule_version from public.tournament_matches m
  join public.tournaments t on t.id=m.tournament_id
  where m.tournament_id=new.tournament_id and t.status='running'
   and m.status='ready' and m.entry_deadline>now()
   and new.entry_id in (m.side_a_entry_id,m.side_b_entry_id)
 loop
  perform tournament_internal.queue_email(new.tournament_id,new.user_id,'match',now(),
   ready_match.schedule_version,ready_match.id::text||':'||ready_match.ready_at::text);
  update public.tournament_email_jobs set audience=jsonb_build_object('match_id',ready_match.id)
   where dedupe_key=new.tournament_id::text||':'||ready_match.schedule_version::text||
    ':match:'||new.user_id::text||':'||ready_match.id::text||':'||ready_match.ready_at::text;
  perform tournament_internal.notify(new.tournament_id,new.user_id,'match',
   ready_match.id::text||':match:'||ready_match.ready_at::text||':'||new.user_id::text,
   jsonb_build_object('match_id',ready_match.id));
 end loop;
 return new;
end; $$;
create trigger tournament_member_communications after insert or update of status
 on public.tournament_entry_members for each row execute function tournament_internal.member_communications();

create function tournament_internal.tournament_communications() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient record;
begin
 if tg_op='INSERT' then
  if new.status='published' then
   for recipient in select p.id from public.profiles p join auth.users u on u.id=p.id
    where not p.is_bot and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous,false) loop
    perform tournament_internal.queue_email(new.id,recipient.id,'announcement',now(),new.schedule_version);
   end loop;
  end if;
  return new;
 end if;
 if new.status='completed' and old.status is distinct from 'completed' then
  perform tournament_internal.award_podium(new.id);
 end if;
 if new.status='published' and old.status is distinct from 'published' then
  -- Anuncio a las cuentas registradas y confirmadas. El endpoint vuelve a
  -- comprobar correo, preferencias, cuenta anonima y direcciones de prueba.
  for recipient in select p.id from public.profiles p join auth.users u on u.id=p.id
   where not p.is_bot and u.email_confirmed_at is not null
     and not coalesce(u.is_anonymous,false) loop
   perform tournament_internal.queue_email(new.id,recipient.id,'announcement',now(),new.schedule_version);
  end loop;
  for recipient in select distinct em.user_id from public.tournament_entry_members em
   where em.tournament_id=new.id and em.status='accepted' loop
   perform tournament_internal.schedule_member(new.id,recipient.user_id);
  end loop;
 end if;
 if new.status='published' and new.schedule_version<>old.schedule_version then
  update public.tournament_email_jobs set status='cancelled',updated_at=now()
   where tournament_id=new.id and schedule_version<>new.schedule_version
     and status in ('pending','failed','processing');
  for recipient in select distinct em.user_id from public.tournament_entry_members em
   where em.tournament_id=new.id and em.status='accepted' loop
   perform tournament_internal.queue_email(new.id,recipient.user_id,'rescheduled',now(),new.schedule_version);
   perform tournament_internal.notify(new.id,recipient.user_id,'rescheduled',
    new.id::text||':rescheduled:'||new.schedule_version||':'||recipient.user_id::text,
    jsonb_build_object('starts_at',new.starts_at));
   perform tournament_internal.schedule_member(new.id,recipient.user_id);
  end loop;
 end if;
 if new.status='cancelled' and old.status is distinct from 'cancelled' then
  update public.tournament_email_jobs set status='cancelled',updated_at=now()
   where tournament_id=new.id and status in ('pending','failed','processing');
  if old.published_at is not null then
   for recipient in select distinct em.user_id from public.tournament_entry_members em
    where em.tournament_id=new.id and em.status='accepted' loop
    perform tournament_internal.queue_email(new.id,recipient.user_id,'cancelled',now(),new.schedule_version);
    perform tournament_internal.notify(new.id,recipient.user_id,'cancelled',
      new.id::text||':cancelled:'||recipient.user_id::text);
   end loop;
  end if;
 end if;
 return new;
end; $$;
create trigger tournament_communications_insert after insert
 on public.tournaments for each row execute function tournament_internal.tournament_communications();
create trigger tournament_communications after update of status,schedule_version
 on public.tournaments for each row execute function tournament_internal.tournament_communications();

create function tournament_internal.match_communications() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient record; t public.tournaments;
begin
 if new.status='ready' and old.status is distinct from 'ready' then
  select * into t from public.tournaments where id=new.tournament_id;
  if t.status='running' then
   for recipient in select distinct em.user_id from public.tournament_entry_members em
    where em.entry_id in (new.side_a_entry_id,new.side_b_entry_id) and em.status='accepted' loop
    perform tournament_internal.queue_email(t.id,recipient.user_id,'match',now(),t.schedule_version,
      new.id::text||':'||new.ready_at::text);
    update public.tournament_email_jobs set audience=jsonb_build_object('match_id',new.id)
     where dedupe_key=t.id::text||':'||t.schedule_version::text||':match:'||
       recipient.user_id::text||':'||new.id::text||':'||new.ready_at::text;
    perform tournament_internal.notify(t.id,recipient.user_id,'match',
      new.id::text||':match:'||new.ready_at::text||':'||recipient.user_id::text,
      jsonb_build_object('match_id',new.id));
   end loop;
  end if;
 end if;
 return new;
end; $$;
create trigger tournament_match_communications after update of status
 on public.tournament_matches for each row execute function tournament_internal.match_communications();

create function public.tournament_notifications_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false))
 then raise exception 'Necesitás una cuenta registrada'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'tournament_id',n.tournament_id,
  'kind',n.kind,'payload',n.payload,'created_at',n.created_at,'read_at',n.read_at)
  order by n.created_at desc) from (select * from public.tournament_notifications
   where user_id=uid order by created_at desc limit 30) n),'[]'::jsonb);
end; $$;
create function public.tournament_notification_read(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users
   where id=auth.uid() and not coalesce(is_anonymous,false)) then
  raise exception 'Necesitás una cuenta registrada';
 end if;
 update public.tournament_notifications set read_at=coalesce(read_at,now())
 where id=p_id and user_id=auth.uid();
end; $$;
revoke all on function public.tournament_notifications_list() from public,anon,authenticated;
revoke all on function public.tournament_notification_read(uuid) from public,anon,authenticated;
grant execute on function public.tournament_notifications_list() to authenticated;
grant execute on function public.tournament_notification_read(uuid) to authenticated;

-- Proyeccion explicita: no consulta game_hands ni team_hands, tampoco
-- entrega columnas internas de partida mediante to_jsonb(game).
create function public.tournament_spectator_snapshot(p_match_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); m public.tournament_matches; t public.tournaments; v_game jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false))
 then raise exception 'Necesitás una cuenta registrada'; end if;
 select * into m from public.tournament_matches where id=p_match_id;
 if not found then raise exception 'Cruce no disponible'; end if;
 select * into t from public.tournaments where id=m.tournament_id;
 if t.published_at is null or t.status='draft' then raise exception 'Cruce no disponible'; end if;
 if t.mode='1v1' then
  select jsonb_build_object('status',g.status,'scores',jsonb_build_array(g.player1_score,g.player2_score),
   'turn',g.current_turn,'hand_number',g.hand_number,'round',g.round_number,
   'played',g.played_cards,'rounds',g.round_results,
   'envido_status',g.envido_state->>'status',
   'truco_status',g.truco_state->>'status',
   'winner',g.winner_id,'updated_at',g.updated_at)
  into v_game from public.games g where g.id=m.game_id;
 else
  select jsonb_build_object('status',tb.status,'scores',g.scores,'turn',g.turn,
   'hand_number',g.hand_number,'round',g.round,'played',g.played,
   'rounds',g.rounds,'envido_status',g.envido->>'status',
   'truco_status',g.truco->>'status',
   'winner',g.winner_team,'updated_at',tb.updated_at)
  into v_game from public.team_games g join public.team_tables tb on tb.id=g.id
   where g.id=m.team_game_id;
 end if;
 return jsonb_build_object('match_id',m.id,'tournament_id',t.id,'tournament_name',t.name,
  'mode',t.mode,'phase',m.phase,'status',m.status,'score_a',m.score_a,'score_b',m.score_b,
  'side_a',tournament_internal.current_name(m.side_a_entry_id),
  'side_b',tournament_internal.current_name(m.side_b_entry_id),
  'players',coalesce((select jsonb_agg(jsonb_build_object('user_id',em.user_id,'username',p.username,'seat',s.seat,
   'team',case when em.entry_id=m.side_a_entry_id then 0 else 1 end) order by s.seat)
   from public.tournament_entry_members em join public.profiles p on p.id=em.user_id
   left join public.team_seats s on s.table_id=m.team_game_id and s.user_id=em.user_id
   where em.entry_id in (m.side_a_entry_id,m.side_b_entry_id) and em.status='accepted'),'[]'::jsonb),
  'game',v_game);
end; $$;
revoke all on function public.tournament_spectator_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.tournament_spectator_snapshot(uuid) to authenticated;

create function public.tournament_admin_monitor(p_tournament_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if not tournament_internal.is_admin(auth.uid()) then raise exception 'Solo administradores'; end if;
 return jsonb_build_object(
  'jobs',coalesce((select jsonb_object_agg(status,total) from
    (select status,count(*) total from public.tournament_email_jobs where tournament_id=p_tournament_id group by status) x),'{}'::jsonb),
  'failed',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',job_type,'attempts',attempts,
    'error',last_error,'due_at',due_at) order by due_at desc) from
    (select id,job_type,attempts,last_error,due_at from public.tournament_email_jobs
     where tournament_id=p_tournament_id and status='failed' order by due_at desc limit 10) x),'[]'::jsonb),
  'matches',coalesce((select jsonb_object_agg(status,total) from
    (select status,count(*) total from public.tournament_matches where tournament_id=p_tournament_id group by status) x),'{}'::jsonb));
end; $$;
revoke all on function public.tournament_admin_monitor(uuid) from public,anon,authenticated;
grant execute on function public.tournament_admin_monitor(uuid) to authenticated;

create function public.tournament_admin_retry_email(p_job_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=tournament_internal.require_admin(); v_tournament uuid;
begin
 update public.tournament_email_jobs j set status='pending',attempts=0,
  next_attempt_at=now(),last_error=null,updated_at=now()
 from public.tournaments t where j.id=p_job_id and t.id=j.tournament_id
  and j.status='failed' and j.schedule_version=t.schedule_version
  and (j.job_type='cancelled' or t.status<>'cancelled')
 returning j.tournament_id into v_tournament;
 if v_tournament is null then raise exception 'Este correo ya no se puede reintentar'; end if;
 perform tournament_internal.audit(v_tournament,actor,'email_retried',null,
  jsonb_build_object('job_id',p_job_id));
 return true;
end; $$;
revoke all on function public.tournament_admin_retry_email(uuid) from public,anon,authenticated;
grant execute on function public.tournament_admin_retry_email(uuid) to authenticated;

create function tournament_internal.dispatch_emails() returns void
language plpgsql security definer set search_path = '' as $$
declare job record;
begin
 if not exists(select 1 from tournament_internal.email_settings where singleton and enabled) then return; end if;
 for job in select t.id,t.schedule_version,em.user_id from public.tournaments t
  join public.tournament_entry_members em on em.tournament_id=t.id and em.status='accepted'
  join public.tournament_entries e on e.id=em.entry_id and e.status='active'
  where t.status='published' and t.starts_at-interval '30 minutes'<=now()
    and t.starts_at>now()
 loop
  perform tournament_internal.notify(job.id,job.user_id,'checkin',
    job.id::text||':checkin:'||job.schedule_version||':'||job.user_id::text);
 end loop;
 for job in select j.id,j.token from public.tournament_email_jobs j
  join public.tournaments t on t.id=j.tournament_id
  where j.status in ('pending','failed','processing') and j.attempts<6
   and j.next_attempt_at<=now() and j.due_at<=now()
   and (j.job_type='cancelled' or (t.status<>'cancelled' and j.schedule_version=t.schedule_version))
  -- Un anuncio masivo nunca debe retrasar el aviso de un cruce de cinco minutos.
  order by case j.job_type when 'match' then 0 when 'checkin' then 1
    when 'cancelled' then 2 when 'rescheduled' then 2
    when 'registration' then 3 when 'reminder' then 4 else 5 end,
    j.due_at limit 20 for update of j skip locked
 loop
  perform net.http_post(url:='https://www.trucazo.com.ar/api/email/tournament?id='||job.id::text,
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||job.token::text),
   body:='{}'::jsonb,timeout_milliseconds:=65000);
 end loop;
end; $$;
revoke all on function tournament_internal.dispatch_emails() from public,anon,authenticated;
select cron.schedule('trucazo-tournament-emails-minute','* * * * *',
 'select tournament_internal.dispatch_emails()');
commit;
