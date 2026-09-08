begin;
-- Run inside a transaction and ROLLBACK: pg_net never sends uncommitted requests.
do $$
declare first_id uuid; second_id uuid; off_id uuid; paused_id uuid; amount integer;
begin
  if has_table_privilege('anon','public.news_email_jobs','SELECT')
    or has_table_privilege('authenticated','public.news_email_jobs','SELECT')
    or has_function_privilege('anon','email_internal.dispatch_news_emails(uuid)','EXECUTE') then
    raise exception 'Las credenciales del webhook deben ser privadas';
  end if;
  update public.news_email_campaign set is_active=true;
  insert into public.news(title,body,author_username) values('Prueba transaccional','Original','SantiBP') returning id into first_id;
  if not exists(select 1 from public.news_email_jobs where news_id=first_id and title='Prueba transaccional' and body='Original' and last_request_id is not null) then
    raise exception 'INSERT no creó el envío inmediato';
  end if;
  update public.news set body='Editado' where id=first_id;
  if not exists(select 1 from public.news_email_jobs where news_id=first_id and body='Original') then
    raise exception 'Se alteró el contenido en tránsito';
  end if;
  insert into public.news(title,body,author_username) values('Segunda','Otro contenido','SantiBP') returning id into second_id;
  if not exists(select 1 from public.news_email_jobs where news_id=second_id and last_request_id is not null) then
    raise exception 'Una novedad anterior bloqueó el disparo de la nueva';
  end if;
  update public.news_email_jobs set locked_until=now()+interval '2 minutes' where news_id=first_id and locked_until<=now();
  update public.news_email_jobs set locked_until=now()+interval '2 minutes' where news_id=first_id and locked_until<=now();
  get diagnostics amount=row_count;
  if amount<>0 then raise exception 'La misma tanda obtuvo dos bloqueos'; end if;
  insert into public.news(title,body,author_username,email_enabled) values('Sin mail','Texto','SantiBP',false) returning id into off_id;
  if exists(select 1 from public.news_email_jobs where news_id=off_id) then raise exception 'Se ignoró email_enabled'; end if;
  update public.news_email_campaign set is_active=false;
  insert into public.news(title,body,author_username) values('Pausada','Texto','SantiBP') returning id into paused_id;
  if exists(select 1 from public.news_email_jobs where news_id=paused_id) then raise exception 'Se ignoró la pausa'; end if;
end $$;

rollback;
