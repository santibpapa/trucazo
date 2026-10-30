-- ANDROID-13: piloto QA. No habilita envíos a jugadores ni publica la API.
begin;
create schema native_push;
revoke all on schema native_push from public,anon,authenticated;
create table native_push.settings (
  singleton boolean primary key default true check(singleton),
  pilot boolean not null default true, dispatch_enabled boolean not null default false
);
insert into native_push.settings(singleton) values(true);
create table native_push.preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  invite boolean not null default true, checkin boolean not null default true, match boolean not null default true
);
create table native_push.devices (
  installation uuid primary key, secret_hash text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique check(length(token) between 30 and 4096), binding uuid not null,
  enabled boolean not null default true, bound_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);
create index native_push_devices_user on native_push.devices(user_id) where enabled;
create table native_push.events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('invite','checkin','match')), subject uuid not null,
  tournament_id uuid references public.tournaments(id) on delete cascade, version integer,
  sender uuid references public.profiles(id) on delete cascade,
  event_key text not null, created_at timestamptz not null default now(), expires_at timestamptz not null,
  unique(user_id,event_key)
);
create index native_push_events_due on native_push.events(expires_at);
create index native_push_invite_limits on native_push.events(user_id,sender,created_at) where kind='invite';
create table native_push.deliveries (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references native_push.events(id) on delete cascade,
  installation uuid not null references native_push.devices(installation) on delete cascade, binding uuid not null,
  key uuid not null default gen_random_uuid(), lease uuid, token_hash text, attempts integer not null default 0,
  status text not null default 'pending' check(status in ('pending','sending','sent','cancelled','failed')),
  next_at timestamptz not null default now(), sent_at timestamptz,
  unique(event_id,installation)
);
create index native_push_delivery_due on native_push.deliveries(next_at) where status in ('pending','sending');
alter table native_push.settings enable row level security;
alter table native_push.preferences enable row level security;
alter table native_push.devices enable row level security;
alter table native_push.events enable row level security;
alter table native_push.deliveries enable row level security;
revoke all on all tables in schema native_push from public,anon,authenticated;

create function native_push.allowed(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
   where p.id=p_user and not p.is_bot and not coalesce(u.is_anonymous,true)
   and (not (select pilot from native_push.settings where singleton)
     or u.raw_app_meta_data->>'qa_purpose'='android-app-acceptance'));
$$;

create function public.native_push_state() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Entrá con tu cuenta.' using errcode='42501'; end if;
 return jsonb_build_object('available',native_push.allowed(auth.uid()),'preferences',coalesce(
   (select to_jsonb(p)-'user_id' from native_push.preferences p where user_id=auth.uid()),
   '{"invite":true,"checkin":true,"match":true}'::jsonb));
end; $$;

create function public.native_push_preferences(p_invite boolean,p_checkin boolean,p_match boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.native_push_state();
 if not native_push.allowed(auth.uid()) then raise exception 'Notificaciones todavía en prueba.' using errcode='42501'; end if;
 insert into native_push.preferences(user_id,invite,checkin,match) values(auth.uid(),p_invite,p_checkin,p_match)
 on conflict(user_id) do update set invite=excluded.invite,checkin=excluded.checkin,match=excluded.match;
 return public.native_push_state();
end; $$;

create function public.native_push_register(p_installation uuid,p_secret text,p_token text,p_binding uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_old native_push.devices; v_hash text;
begin
 perform public.native_push_state();
 if not native_push.allowed(auth.uid()) then raise exception 'Notificaciones todavía en prueba.' using errcode='42501'; end if;
 if p_installation is null or p_binding is null or p_secret is null or p_secret !~ '^[a-f0-9]{64}$'
   or p_token is null or length(p_token) not between 30 and 4096 then raise exception 'Dispositivo inválido.'; end if;
 v_hash:=encode(sha256(convert_to(p_secret,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_installation::text,0));
 select * into v_old from native_push.devices where installation=p_installation for update;
 if found and v_old.secret_hash<>v_hash then raise exception 'Dispositivo inválido.' using errcode='42501'; end if;
 -- Una instalación no puede apropiarse del token de otra.
 if exists(select 1 from native_push.devices where token=p_token and installation<>p_installation) then
   raise exception 'Dispositivo inválido.' using errcode='42501'; end if;
 insert into native_push.preferences(user_id) values(auth.uid()) on conflict do nothing;
 insert into native_push.devices(installation,secret_hash,user_id,token,binding)
 values(p_installation,v_hash,auth.uid(),p_token,p_binding)
 on conflict(installation) do update set user_id=excluded.user_id,token=excluded.token,binding=excluded.binding,
   enabled=true,seen_at=now(),bound_at=case when native_push.devices.user_id=excluded.user_id
     and native_push.devices.binding=excluded.binding then native_push.devices.bound_at else now() end;
end; $$;

create function public.native_push_unregister(p_installation uuid,p_secret text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.native_push_state();
 update native_push.devices set enabled=false where installation=p_installation and user_id=auth.uid()
   and secret_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex');
end; $$;

create function native_push.valid(p_id uuid) returns boolean
language sql volatile security definer set search_path='' as $$
 select exists(select 1 from native_push.events e join native_push.preferences p on p.user_id=e.user_id
   where e.id=p_id and e.expires_at>now() and native_push.allowed(e.user_id)
   and coalesce((to_jsonb(p)->>e.kind)::boolean,false)
   and case e.kind when 'invite' then exists(select 1 from public.game_invites i join public.tables t on t.id=i.table_id
     where i.id=e.subject and i.to_id=e.user_id and t.status='waiting' and t.creator_id=i.from_id
       and not community_safety.blocked(i.from_id,i.to_id))
   when 'checkin' then exists(select 1 from public.tournaments t
     join public.tournament_entry_members em on em.tournament_id=t.id and em.user_id=e.user_id and em.status='accepted'
     join public.tournament_entries te on te.id=em.entry_id and te.status='active'
     where t.id=e.tournament_id and t.schedule_version=e.version and t.status='published'
       and t.starts_at>now() and t.starts_at-interval '30 minutes'<=now()
       and not exists(select 1 from public.tournament_checkins c where c.entry_id=te.id))
   when 'match' then exists(select 1 from public.tournament_matches m join public.tournaments t on t.id=m.tournament_id
     join public.tournament_entry_members em on em.entry_id in (m.side_a_entry_id,m.side_b_entry_id)
       and em.user_id=e.user_id and em.status='accepted'
     where m.id=e.subject and t.id=e.tournament_id and t.schedule_version=e.version
       and t.status='running' and m.status='ready' and m.entry_deadline>now()) else false end);
$$;

create function native_push.invitation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not native_push.allowed(new.to_id) then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('push-invite:'||new.to_id::text,0));
 if exists(select 1 from native_push.events where kind='invite' and user_id=new.to_id and sender=new.from_id
   and created_at>now()-interval '10 minutes')
   or (select count(*) from native_push.events where kind='invite' and user_id=new.to_id
     and created_at>now()-interval '1 hour')>=5 then return new; end if;
 insert into native_push.events(user_id,kind,subject,sender,event_key,expires_at)
 values(new.to_id,'invite',new.id,new.from_id,'invite:'||new.id::text,new.created_at+interval '5 minutes')
 on conflict do nothing;
 return new;
end; $$;
create trigger native_push_invitation after insert on public.game_invites for each row execute function native_push.invitation();

create function native_push.tournament_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare t public.tournaments; m public.tournament_matches;
begin
 if new.kind<>'match' or not native_push.allowed(new.user_id) then return new; end if;
 select * into t from public.tournaments where id=new.tournament_id;
 select * into m from public.tournament_matches where id=(new.payload->>'match_id')::uuid;
 if m.id is null then return new; end if;
 insert into native_push.events(user_id,kind,subject,tournament_id,version,event_key,expires_at)
 values(new.user_id,'match',m.id,t.id,t.schedule_version,'match:'||new.dedupe_key,m.entry_deadline)
 on conflict do nothing;
 return new;
end; $$;
create trigger native_push_tournament after insert on public.tournament_notifications for each row execute function native_push.tournament_notice();

create function native_push.prepare() returns void
language plpgsql security definer set search_path='' as $$
begin
 -- No depende de que el jugador acepte correos ni de que esté activo el envío de email.
 insert into native_push.events(user_id,kind,subject,tournament_id,version,event_key,expires_at)
 select distinct em.user_id,'checkin',t.id,t.id,t.schedule_version,
   'checkin:'||t.id::text||':'||t.schedule_version::text,t.starts_at
 from public.tournaments t join public.tournament_entry_members em on em.tournament_id=t.id and em.status='accepted'
 join public.tournament_entries te on te.id=em.entry_id and te.status='active'
 where t.status='published' and t.starts_at>now() and t.starts_at-interval '30 minutes'<=now()
   and native_push.allowed(em.user_id) and exists(select 1 from native_push.devices d where d.user_id=em.user_id and d.enabled)
 on conflict do nothing;
 insert into native_push.deliveries(event_id,installation,binding)
 select e.id,d.installation,d.binding from native_push.events e join native_push.devices d on d.user_id=e.user_id
 where d.enabled and d.seen_at>now()-interval '30 days' and e.created_at>=d.bound_at and native_push.valid(e.id)
 on conflict do nothing;
 update native_push.deliveries j set status='cancelled' where j.status in ('pending','sending')
   and (not native_push.valid(j.event_id) or not exists(select 1 from native_push.devices d
     where d.installation=j.installation and d.binding=j.binding and d.enabled and d.seen_at>now()-interval '30 days'));
 delete from native_push.events where expires_at<now()-interval '30 days';
 delete from native_push.devices where seen_at<now()-interval '30 days';
end; $$;

create function public.native_push_jobs() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform native_push.prepare();
 return coalesce((select jsonb_agg(to_jsonb(j)) from (select id,key from native_push.deliveries
   where status in ('pending','sending') and next_at<=now() and attempts<6 order by next_at limit 10) j),'[]'::jsonb);
end; $$;

create function public.native_push_claim(p_id uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j native_push.deliveries; e native_push.events; d native_push.devices;
begin
 select * into j from native_push.deliveries where id=p_id and key=p_key for update;
 if not found then return null; end if;
 if j.status not in ('pending','sending') or j.next_at>now() or j.attempts>=6 then return '{"skip":true}'::jsonb; end if;
 select * into e from native_push.events where id=j.event_id;
 select * into d from native_push.devices where installation=j.installation;
 if d.installation is null or not native_push.valid(e.id) or not d.enabled or d.binding<>j.binding or d.user_id<>e.user_id
   or d.seen_at<now()-interval '30 days' then
   update native_push.deliveries set status='cancelled' where id=j.id;
   return '{"skip":true}'::jsonb;
 end if;
 update native_push.deliveries set status='sending',attempts=attempts+1,next_at=now()+interval '2 minutes',lease=gen_random_uuid(),
   token_hash=encode(sha256(convert_to(d.token,'UTF8')),'hex')
 where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'lease',j.lease,'attempts',j.attempts,'token',d.token,
   'data',jsonb_build_object('event',e.id,'user',e.user_id,'installation',d.installation,'binding',d.binding,
     'kind',e.kind,'expires',floor(extract(epoch from e.expires_at))::text,
     'title',case e.kind when 'invite' then 'Te invitaron a jugar' when 'checkin' then 'Ya podés confirmar tu torneo' else 'Tu partida está lista' end,
     'body',case e.kind when 'invite' then 'Abrí Trucazo para ver la invitación.' when 'checkin' then 'Entrá al torneo para confirmar tu presencia.' else 'Entrá al torneo para jugar tu cruce.' end,
     'path',case when e.kind='invite' then '/comunidad' else '/torneos/'||e.tournament_id::text end));
end; $$;

create function public.native_push_complete(p_id uuid,p_lease uuid,p_result text,p_delay integer default 30) returns void
language plpgsql security definer set search_path='' as $$
declare j native_push.deliveries;
begin
 select * into j from native_push.deliveries where id=p_id and lease=p_lease and status='sending' for update;
 if not found then return; end if;
 if p_result='invalid_token' then
   update native_push.devices set enabled=false where installation=j.installation and binding=j.binding
     and encode(sha256(convert_to(token,'UTF8')),'hex')=j.token_hash;
 end if;
 update native_push.deliveries set status=case when p_result='sent' then 'sent'
   when p_result='retry' and attempts<6 then 'pending' else 'failed' end,
   sent_at=case when p_result='sent' then now() else null end,
   next_at=now()+make_interval(secs=>greatest(15,least(p_delay,3600))) where id=j.id;
end; $$;

create function native_push.dispatch() returns void
language plpgsql security definer set search_path='' as $$
declare j jsonb;
begin
 if not (select dispatch_enabled from native_push.settings where singleton) then perform native_push.prepare(); return; end if;
 for j in select * from jsonb_array_elements(public.native_push_jobs()) loop
   perform net.http_post(url:='https://www.trucazo.com.ar/api/android/push/send?id='||(j->>'id'),
     headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(j->>'key')),
     body:='{}'::jsonb,timeout_milliseconds:=30000);
 end loop;
end; $$;
revoke all on all functions in schema native_push from public,anon,authenticated;
revoke all on function public.native_push_state(),public.native_push_preferences(boolean,boolean,boolean),
  public.native_push_register(uuid,text,text,uuid),public.native_push_unregister(uuid,text) from public,anon,authenticated;
grant execute on function public.native_push_state() to authenticated;
grant execute on function public.native_push_preferences(boolean,boolean,boolean) to authenticated;
grant execute on function public.native_push_register(uuid,text,text,uuid) to authenticated;
grant execute on function public.native_push_unregister(uuid,text) to authenticated;
revoke all on function public.native_push_jobs(),public.native_push_claim(uuid,uuid),
  public.native_push_complete(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.native_push_jobs(),public.native_push_claim(uuid,uuid),
  public.native_push_complete(uuid,uuid,text,integer) to service_role;
select cron.schedule('trucazo-native-push','15 seconds','select native_push.dispatch()');
commit;
