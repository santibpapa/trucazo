-- ANDROID-12. Protección compartida por web y app; no cambia el motor del juego.
begin;
create schema if not exists community_safety;
revoke all on schema community_safety from public, anon, authenticated;
grant usage on schema community_safety to authenticated;

-- La web pública aún usa la versión anterior. El piloto exige normas a las QA;
-- el lanzamiento de la interfaz activará la exigencia para todos en una sola operación.
create table if not exists community_safety.settings (
  singleton boolean primary key default true check(singleton), enforce_rules boolean not null default false
);
insert into community_safety.settings(singleton) values(true) on conflict do nothing;
alter table public.news add column if not exists author_id uuid references public.profiles(id) on delete set null;
update public.news n set author_id=p.id from public.profiles p where n.author_id is null and p.username=n.author_username;

create table if not exists community_safety.acceptances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  version text not null, accepted_at timestamptz not null default now()
);
create table if not exists community_safety.blocks (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(owner_id,target_id), check(owner_id<>target_id)
);
create index if not exists safety_blocks_target on community_safety.blocks(target_id,owner_id);
create table if not exists community_safety.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  subject_id uuid references public.profiles(id) on delete set null,
  kind text not null check(kind in ('profile','chat','match_chat','group','news','feedback','table','team_table')),
  target_id uuid not null,
  reason text not null check(reason in ('harassment','hate','sexual','personal_data','spam','other')),
  detail text not null check(char_length(detail)<=1000),
  evidence jsonb not null, evidence_hash text not null,
  media jsonb not null default '[]' check(jsonb_typeof(media)='array' and jsonb_array_length(media)<=3 and octet_length(media::text)<=2000000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by uuid references public.profiles(id) on delete set null,
  action text check(action in ('dismiss','remove','restrict')), resolution text,
  unique(reporter_id,kind,target_id,evidence_hash)
);
create index if not exists safety_reports_queue on community_safety.reports(created_at) where resolved_at is null;
create index if not exists safety_reports_reporter on community_safety.reports(reporter_id,created_at desc);
create table if not exists community_safety.restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  until_at timestamptz not null, report_id uuid references community_safety.reports(id) on delete set null
);
alter table community_safety.acceptances enable row level security;
alter table community_safety.blocks enable row level security;
alter table community_safety.reports enable row level security;
alter table community_safety.restrictions enable row level security;
alter table community_safety.settings enable row level security;
revoke all on all tables in schema community_safety from public,anon,authenticated;

create or replace function community_safety.blocked(a uuid,b uuid) returns boolean
language sql volatile security definer set search_path='' as $$
  select exists(select 1 from community_safety.blocks where (owner_id=a and target_id=b) or (owner_id=b and target_id=a));
$$;
create or replace function community_safety.rules_required() returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select enforce_rules from community_safety.settings where singleton),false)
    or exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'qa_purpose'='android-app-acceptance');
$$;
-- Sólo permite consultar el vínculo del propio usuario, nunca listas ajenas.
create or replace function community_safety.visible_author(p_author uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is null or not community_safety.blocked(auth.uid(),p_author);
$$;
create or replace function community_safety.require_contribution(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not community_safety.rules_required() and not exists(select 1 from community_safety.restrictions where user_id=p_user and until_at>now()) then return; end if;
  if p_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or not exists(select 1 from public.profiles where id=p_user and not is_bot)
    then raise exception 'Entrá con una cuenta registrada'; end if;
  if community_safety.rules_required() and not exists(select 1 from community_safety.acceptances where user_id=p_user and version='2026-10-15')
    then raise exception 'Aceptá las normas de convivencia antes de participar'; end if;
  if exists(select 1 from community_safety.restrictions where user_id=p_user and until_at>now())
    then raise exception 'Tu participación social está restringida temporalmente. Podés seguir jugando y consultar Convivencia'; end if;
end;
$$;
create or replace function public.accept_community_rules(p_version text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
    then raise exception 'Entrá con una cuenta registrada'; end if;
  if p_version is distinct from '2026-10-15' then raise exception 'Las normas cambiaron. Volvé a abrirlas'; end if;
  insert into community_safety.acceptances(user_id,version) values(auth.uid(),p_version)
    on conflict(user_id) do update set version=excluded.version,accepted_at=now();
end;
$$;
create or replace function public.community_safety_state() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  return jsonb_build_object(
    'accepted',exists(select 1 from community_safety.acceptances where user_id=auth.uid() and version='2026-10-15'),
    'restricted_until',(select until_at from community_safety.restrictions where user_id=auth.uid() and until_at>now()),
    'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',b.target_id,'username',p.username) order by b.created_at desc)
      from community_safety.blocks b join public.profiles p on p.id=b.target_id where b.owner_id=auth.uid()),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(x) from (select id,kind,reason,created_at,resolved_at,action,resolution
      from community_safety.reports where reporter_id=auth.uid() order by created_at desc limit 50) x),'[]'::jsonb));
end;
$$;
create or replace function public.set_player_block(p_target uuid,p_blocked boolean) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); inv record;
begin
  if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Entrá con una cuenta registrada'; end if;
  if p_blocked is null then raise exception 'Elegí bloquear o desbloquear'; end if;
  if p_target=me or not exists(select 1 from public.profiles where id=p_target and not is_bot)
    then raise exception 'Jugador no disponible'; end if;
  -- Serializa el par también con los disparadores de interacción.
  perform pg_advisory_xact_lock(hashtextextended(least(me,p_target)::text||greatest(me,p_target)::text,12));
  if p_blocked then
    insert into community_safety.blocks(owner_id,target_id) values(me,p_target) on conflict do nothing;
    delete from public.friendships where (requester_id=me and addressee_id=p_target) or (requester_id=p_target and addressee_id=me);
    delete from public.group_invites where (from_id=me and to_id=p_target) or (from_id=p_target and to_id=me);
    -- La cancelación normal reembolsa la mesa de invitación; jamás una partida iniciada.
    for inv in select gi.id,gi.from_id from public.game_invites gi join public.tables t on t.id=gi.table_id
      where t.status='waiting' and ((gi.from_id=me and gi.to_id=p_target) or (gi.from_id=p_target and gi.to_id=me))
    loop
      if inv.from_id=me then perform public.cancel_game_invite(inv.id);
      else perform public.respond_game_invite(inv.id,false); end if;
    end loop;
    delete from public.game_invites where (from_id=me and to_id=p_target) or (from_id=p_target and to_id=me);
  else delete from community_safety.blocks where owner_id=me and target_id=p_target;
  end if;
end;
$$;

create or replace function public.report_community_content(p_kind text,p_target uuid,p_reason text,p_detail text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); v_evidence jsonb; v_subject uuid; v_id uuid;
begin
  if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Entrá con una cuenta registrada'; end if;
  if p_kind is null or p_kind not in ('profile','chat','match_chat','group','news','feedback','table','team_table') or p_target is null
    or p_reason is null or p_reason not in ('harassment','hate','sexual','personal_data','spam','other')
    or char_length(coalesce(p_detail,''))>1000 then raise exception 'Revisá el contenido, motivo y detalle'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text,13));
  case p_kind
    when 'profile' then
      select jsonb_build_object('username',username,'avatar_url',avatar_url),id into v_evidence,v_subject from public.profiles where id=p_target and not is_bot;
    when 'chat' then
      select to_jsonb(m),user_id into v_evidence,v_subject from public.chat_messages m where id=p_target and community_safety.visible_author(user_id);
    when 'match_chat' then
      select to_jsonb(m),sender_id into v_evidence,v_subject from public.match_chat_messages m where id=p_target and created_at>now()-interval '72 hours'
        and community_safety.visible_author(sender_id) and (
          exists(select 1 from public.games g where g.id=m.game_id and g.campaign_rival_id is null and me in(g.player1_id,g.player2_id))
          or exists(select 1 from public.team_seats s where s.table_id=m.team_table_id and s.user_id=me and s.seat is not null));
    when 'group' then
      select jsonb_build_object('name',g.name,'description',g.description,'leader_id',g.leader_id),g.leader_id into v_evidence,v_subject from public.groups g where g.id=p_target
        and (exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=me)
          or exists(select 1 from public.group_invites i where i.group_id=g.id and i.to_id=me));
    when 'news' then
      select to_jsonb(n),author_id into v_evidence,v_subject from public.news n where id=p_target;
    when 'feedback' then
      select to_jsonb(f),user_id into v_evidence,v_subject from public.feedback f where id=p_target
        and (user_id=me or exists(select 1 from public.profiles where id=me and is_admin));
    when 'table' then
      select jsonb_build_object('name',t.name,'username',t.creator_username),t.creator_id into v_evidence,v_subject from public.tables t
        where t.id=p_target and (not t.is_private or me in(t.creator_id,t.opponent_id));
    when 'team_table' then
      select jsonb_build_object('name',t.name),t.creator_id into v_evidence,v_subject from public.team_tables t
        where t.id=p_target and (not t.is_private or exists(select 1 from public.team_seats s where s.table_id=t.id and s.user_id=me));
  end case;
  if v_evidence is null then
    select id into v_id from community_safety.reports where reporter_id=me and kind=p_kind and target_id=p_target order by created_at desc limit 1;
    if found then return v_id; end if;
    raise exception 'Ese contenido no está disponible para tu cuenta';
  end if;
  if v_subject=me then raise exception 'No podés denunciarte a vos mismo'; end if;
  select id into v_id from community_safety.reports where reporter_id=me and kind=p_kind and target_id=p_target and evidence_hash=md5(v_evidence::text);
  if found then return v_id; end if;
  if (select count(*) from community_safety.reports where reporter_id=me and created_at>now()-interval '24 hours')>=10
    then raise exception 'Llegaste al límite de 10 denuncias por día'; end if;
  insert into community_safety.reports(reporter_id,subject_id,kind,target_id,reason,detail,evidence,evidence_hash)
    values(me,v_subject,p_kind,p_target,p_reason,btrim(coalesce(p_detail,'')),v_evidence,md5(v_evidence::text)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.moderation_reports() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'Sólo administradores'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x)-'media') from (select r.*,jsonb_array_length(r.media) as image_count,p.username as subject_name from community_safety.reports r
    left join public.profiles p on p.id=r.subject_id order by resolved_at nulls first,created_at desc limit 200) x),'[]'::jsonb);
end;
$$;
create or replace function public.moderation_feedback() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'Sólo administradores'; end if;
  return coalesce((select jsonb_agg(x) from (select f.id,p.username,f.comment,cardinality(f.image_paths) as image_count,f.created_at
    from public.feedback f left join public.profiles p on p.id=f.user_id order by f.created_at desc limit 30) x),'[]'::jsonb);
end;
$$;
-- Sólo el servidor guarda las copias de imágenes; no se reciben como evidencia del cliente.
create or replace function public.community_report_media(p_report uuid,p_images jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r community_safety.reports;
begin
  select * into r from community_safety.reports where id=p_report for update;
  if not found then raise exception 'Denuncia no encontrada'; end if;
  if p_images is not null and r.media='[]'::jsonb then
    if jsonb_typeof(p_images)<>'array' or jsonb_array_length(p_images)>3 or octet_length(p_images::text)>2000000
      then raise exception 'Imágenes demasiado grandes'; end if;
    update community_safety.reports set media=p_images where id=p_report returning * into r;
  end if;
  return jsonb_build_object('subject_id',r.subject_id,'kind',r.kind,'evidence',r.evidence,'images',r.media);
end;
$$;
revoke all on function public.community_report_media(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.community_report_media(uuid,jsonb) to service_role;
create or replace function public.resolve_community_report(p_report uuid,p_action text,p_resolution text) returns void
language plpgsql security definer set search_path='' as $$
declare r community_safety.reports;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'Sólo administradores'; end if;
  if p_action is null or p_action not in ('dismiss','remove','restrict') or char_length(btrim(coalesce(p_resolution,''))) not between 5 and 500
    then raise exception 'Elegí una acción y explicá la resolución (5 a 500 caracteres)'; end if;
  select * into r from community_safety.reports where id=p_report for update;
  if not found then raise exception 'Denuncia no encontrada'; end if;
  if r.resolved_at is not null then return; end if;
  if p_action in ('remove','restrict') then
    case r.kind
      when 'chat' then delete from public.chat_messages where id=r.target_id;
      when 'match_chat' then delete from public.match_chat_messages where id=r.target_id;
      when 'news' then delete from public.news where id=r.target_id;
      when 'group' then update public.groups set name='Grupo moderado',description='' where id=r.target_id;
      when 'profile' then
        update public.profiles set username='Jugador_'||replace(id::text,'-',''),avatar_url=null where id=r.target_id;
        update public.chat_messages set username='Jugador_'||replace(r.target_id::text,'-','') where user_id=r.target_id;
        update public.match_chat_messages set sender_name='Jugador_'||replace(r.target_id::text,'-','') where sender_id=r.target_id;
        update public.tables set creator_username='Jugador_'||replace(r.target_id::text,'-','') where creator_id=r.target_id;
        update public.tables set opponent_username='Jugador_'||replace(r.target_id::text,'-','') where opponent_id=r.target_id;
        update public.games set player1_username='Jugador_'||replace(r.target_id::text,'-','') where player1_id=r.target_id;
        update public.games set player2_username='Jugador_'||replace(r.target_id::text,'-','') where player2_id=r.target_id;
        update public.game_history set opponent_username='Jugador_'||replace(r.target_id::text,'-','') where opponent_id=r.target_id;
        update public.game_invites set from_username='Jugador_'||replace(r.target_id::text,'-','') where from_id=r.target_id;
        update public.team_seats set username='Jugador_'||replace(r.target_id::text,'-',''),avatar_url=null where user_id=r.target_id;
        update public.news set author_username='Jugador_'||replace(r.target_id::text,'-','') where author_id=r.target_id;
      when 'feedback' then update public.feedback set comment='Contenido retirado por moderación',image_paths='{}' where id=r.target_id;
      when 'table' then update public.tables set name='Mesa moderada' where id=r.target_id;
      when 'team_table' then update public.team_tables set name='Mesa moderada' where id=r.target_id;
    end case;
  end if;
  if p_action='restrict' and r.subject_id is not null then
    insert into community_safety.restrictions(user_id,until_at,report_id) values(r.subject_id,now()+interval '7 days',r.id)
      on conflict(user_id) do update set until_at=greatest(community_safety.restrictions.until_at,excluded.until_at),report_id=excluded.report_id;
  end if;
  update community_safety.reports set resolved_at=now(),resolved_by=auth.uid(),action=p_action,resolution=btrim(p_resolution) where id=r.id;
end;
$$;

-- Disparadores: protegen todas las RPC actuales y escrituras directas, incluidas rutas alternativas.
create or replace function community_safety.check_pair(a uuid,b uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if a is null or b is null or a=b then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(a,b)::text||greatest(a,b)::text,12));
  if community_safety.blocked(a,b) then raise exception 'Esta interacción no está disponible por un bloqueo'; end if;
end;
$$;
create or replace function community_safety.guard_interaction() returns trigger
language plpgsql security definer set search_path='' as $$
declare other_id uuid;
begin
  if tg_table_name='friendships' then
    perform community_safety.require_contribution(auth.uid());
    perform community_safety.check_pair(new.requester_id,new.addressee_id);
  elsif tg_table_name in ('game_invites','group_invites') then
    perform community_safety.require_contribution(auth.uid());
    perform community_safety.check_pair(new.from_id,new.to_id);
    if tg_table_name='group_invites' then
      for other_id in select user_id from public.group_members where group_id=new.group_id loop
        perform community_safety.check_pair(other_id,new.to_id);
      end loop;
    end if;
  elsif tg_table_name='group_members' then
    perform community_safety.require_contribution(new.user_id);
    for other_id in select user_id from public.group_members where group_id=new.group_id loop
      perform community_safety.check_pair(other_id,new.user_id);
    end loop;
  elsif tg_table_name='tables' then
    if new.opponent_id is not null and (tg_op='INSERT' or old.opponent_id is distinct from new.opponent_id)
      and (to_jsonb(new)->>'tournament_match_id') is null then
      perform community_safety.check_pair(new.creator_id,new.opponent_id);
    end if;
  elsif tg_table_name='team_seats' then
    if new.user_id is not null and (tg_op='INSERT' or old.user_id is distinct from new.user_id)
      and exists(select 1 from public.team_tables t where t.id=new.table_id and (to_jsonb(t)->>'tournament_id') is null) then
      for other_id in select user_id from public.team_seats where table_id=new.table_id and user_id is not null loop
        perform community_safety.check_pair(other_id,new.user_id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;
create or replace function community_safety.guard_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare contributor uuid;
begin
  -- Las altas automáticas crean identidad; no constituyen aceptación de normas.
  -- Las modificaciones administrativas de moderación no actúan como el autor.
  if tg_table_name='profiles' then
    if new.is_bot then return new; end if;
    if new.username is not distinct from old.username and new.avatar_url is not distinct from old.avatar_url then return new; end if;
    contributor:=new.id;
  elsif tg_table_name='chat_messages' then contributor:=new.user_id;
  elsif tg_table_name='match_chat_messages' then contributor:=new.sender_id;
  elsif tg_table_name='groups' then contributor:=new.leader_id;
  elsif tg_table_name='news' then
    if tg_op='INSERT' then new.author_id:=auth.uid(); end if;
    contributor:=new.author_id;
  elsif tg_table_name='feedback' then contributor:=new.user_id;
  end if;
  if contributor is distinct from auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and is_admin) then return new; end if;
  perform community_safety.require_contribution(contributor);
  return new;
end;
$$;
-- La aceptación enviada en el alta es una afirmación explícita del usuario,
-- nunca se utiliza para conceder roles ni privilegios.
create or replace function community_safety.registration_rules() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from auth.users where id=new.id and is_anonymous is false
    and raw_user_meta_data->>'community_rules_version'='2026-10-15') then
    insert into community_safety.acceptances(user_id,version) values(new.id,'2026-10-15') on conflict do nothing;
  end if;
  return new;
end;
$$;
create or replace function community_safety.can_upload() returns boolean
language sql stable security definer set search_path='' as $$
  select (not community_safety.rules_required() or (auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
    and exists(select 1 from community_safety.acceptances where user_id=auth.uid() and version='2026-10-15')))
    and not exists(select 1 from community_safety.restrictions where user_id=auth.uid() and until_at>now());
$$;
create policy safety_upload_insert on storage.objects as restrictive for insert to anon,authenticated
  with check (bucket_id not in ('avatars','feedback-images') or community_safety.can_upload());
create policy safety_upload_update on storage.objects as restrictive for update to anon,authenticated
  using (bucket_id not in ('avatars','feedback-images') or community_safety.can_upload())
  with check (bucket_id not in ('avatars','feedback-images') or community_safety.can_upload());
-- Se puede jugar sin aportar un nombre: los nombres automáticos se vuelven neutros
-- mientras no se acepten normas o durante una restricción social.
create or replace function community_safety.guard_table_name() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not community_safety.can_upload() and not exists(select 1 from public.profiles where id=new.creator_id and is_bot) then new.name:='Mesa de truco'; end if;
  return new;
end;
$$;
create trigger safety_table_name before insert or update of name on public.tables for each row execute function community_safety.guard_table_name();
create trigger safety_team_name before insert or update of name on public.team_tables for each row execute function community_safety.guard_table_name();
create trigger safety_registration after insert on public.profiles for each row execute function community_safety.registration_rules();
create trigger safety_friendships before insert or update on public.friendships for each row execute function community_safety.guard_interaction();
create trigger safety_game_invites before insert or update on public.game_invites for each row execute function community_safety.guard_interaction();
create trigger safety_group_invites before insert or update on public.group_invites for each row execute function community_safety.guard_interaction();
create trigger safety_group_members before insert on public.group_members for each row execute function community_safety.guard_interaction();
create trigger safety_tables before insert or update on public.tables for each row execute function community_safety.guard_interaction();
create trigger safety_team_seats before insert or update of user_id on public.team_seats for each row execute function community_safety.guard_interaction();
create trigger safety_profiles before update of username,avatar_url on public.profiles for each row execute function community_safety.guard_content();
create trigger safety_chat before insert or update of username,body on public.chat_messages for each row execute function community_safety.guard_content();
create trigger safety_match_chat before insert or update of sender_name,body on public.match_chat_messages for each row execute function community_safety.guard_content();
create trigger safety_groups before insert or update of name,description on public.groups for each row execute function community_safety.guard_content();
create trigger safety_news before insert or update of title,body,author_username on public.news for each row execute function community_safety.guard_content();
create trigger safety_feedback before insert or update of comment,image_paths on public.feedback for each row execute function community_safety.guard_content();

create policy safety_chat_visibility on public.chat_messages as restrictive for select to authenticated
  using (community_safety.visible_author(user_id));
create policy safety_match_visibility on public.match_chat_messages as restrictive for select to authenticated
  using (community_safety.visible_author(sender_id));
-- Se preserva la membresía del grupo compartido; no hay chat de grupo. Sus invitaciones sí quedan impedidas.
-- Perfil/ranking/participantes conservan identidad y puntajes públicos; bloquear no los elimina.

create or replace function community_safety.cleanup() returns void
language sql security definer set search_path='' as $$
  delete from community_safety.reports where created_at<now()-interval '180 days' or resolved_at<now()-interval '90 days';
  delete from community_safety.restrictions where until_at<now();
$$;
revoke all on all functions in schema community_safety from public,anon,authenticated;
grant execute on function community_safety.visible_author(uuid) to authenticated;
grant usage on schema community_safety to anon;
grant execute on function community_safety.can_upload() to anon,authenticated;
revoke all on function public.accept_community_rules(text),public.community_safety_state(),public.set_player_block(uuid,boolean),
  public.report_community_content(text,uuid,text,text),public.moderation_reports(),public.resolve_community_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.accept_community_rules(text) to authenticated;
grant execute on function public.community_safety_state() to authenticated;
grant execute on function public.set_player_block(uuid,boolean) to authenticated;
grant execute on function public.report_community_content(text,uuid,text,text) to authenticated;
grant execute on function public.moderation_reports() to authenticated;
revoke all on function public.moderation_feedback() from public,anon,authenticated;
grant execute on function public.moderation_feedback() to authenticated;
grant execute on function public.resolve_community_report(uuid,text,text) to authenticated;
do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.schedule('trucazo-community-safety-cleanup','20 3 * * *','select community_safety.cleanup()');
  end if;
end $$;
commit;
