-- Guardar la foto de perfil de forma segura.
-- profiles no tiene policy de UPDATE (a propósito: evita que el cliente toque
-- monedas u otros campos). Esta función security definer actualiza SOLO
-- avatar_url del propio usuario. p_url puede ser null para quitar la foto.
create or replace function public.set_avatar_url(p_url text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;
  update profiles set avatar_url = p_url where id = auth.uid();
end;
$function$;

grant execute on function public.set_avatar_url(text) to authenticated;
