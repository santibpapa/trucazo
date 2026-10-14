-- Capturas privadas: firma del propietario y lectura efímera del agente.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='feedback leer en mi carpeta') then
create policy "feedback leer en mi carpeta" on storage.objects for select to authenticated
using (bucket_id = 'feedback-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end; $$;


create table if not exists feedback_internal.image_tickets (
  token_hash text primary key,
  run_id uuid not null references feedback_internal.runs(id) on delete cascade,
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  source_hash text not null,
  image_path text not null,
  expires_at timestamptz not null default clock_timestamp() + interval '10 minutes',
  used_at timestamptz
);
alter table feedback_internal.image_tickets enable row level security;
revoke all on feedback_internal.image_tickets from public, anon, authenticated;
grant usage on schema feedback_internal to service_role;
grant select, update on feedback_internal.image_tickets to service_role;
grant select on feedback_internal.runs, feedback_internal.reviews to service_role;

-- Sólo SQL administrativo: no se expone por PostgREST ni se concede a jugadores.
create or replace function feedback_internal.image_ticket(p_run uuid, p_feedback uuid, p_index integer)
returns text language plpgsql security invoker set search_path='' as $$
declare v_path text; v_hash text; v_token text;
begin
  perform feedback_internal.heartbeat(p_run);
  select f.image_paths[p_index],r.source_hash into v_path,v_hash
    from feedback_internal.reviews r join public.feedback f on f.id=r.feedback_id
    where r.feedback_id=p_feedback and r.run_id=p_run and r.status='processing'
      and r.source_hash=feedback_internal.fingerprint(f)
      and p_index between 1 and cardinality(f.image_paths)
      and split_part(f.image_paths[p_index], '/', 1)=f.user_id::text;
  if v_path is null then raise exception 'Adjunto fuera de la reseña reclamada o contenido modificado'; end if;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into feedback_internal.image_tickets(token_hash,run_id,feedback_id,source_hash,image_path)
    values(encode(extensions.digest(v_token,'sha256'),'hex'),p_run,p_feedback,v_hash,v_path);
  return v_token;
end;
$$;
revoke all on function feedback_internal.image_ticket(uuid,uuid,integer) from public,anon,authenticated,service_role;

-- Puente mínimo para Edge: INVOKER, ejecutable sólo por la clave del servidor.
create or replace function public.consume_feedback_image_ticket(p_token text)
returns text language plpgsql security invoker set search_path='' as $$
declare v_path text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
  update feedback_internal.image_tickets t set used_at=clock_timestamp()
    from feedback_internal.reviews r,feedback_internal.runs x,public.feedback f
    where t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and t.used_at is null and t.expires_at>clock_timestamp()
      and x.id=t.run_id and x.status='running' and x.lease_until>clock_timestamp()
      and r.feedback_id=t.feedback_id and r.run_id=t.run_id and r.status='processing'
      and f.id=t.feedback_id and r.source_hash=t.source_hash
      and feedback_internal.fingerprint(f)=t.source_hash
      and t.image_path=any(f.image_paths)
      and split_part(t.image_path,'/',1)=f.user_id::text
    returning t.image_path into v_path;
  return v_path;
end;
$$;
revoke all on function public.consume_feedback_image_ticket(text) from public,anon,authenticated;
grant execute on function public.consume_feedback_image_ticket(text) to service_role;
grant execute on function feedback_internal.fingerprint(public.feedback) to service_role;
