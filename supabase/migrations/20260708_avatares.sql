-- Fotos de perfil (avatares)
-- 1) columna avatar_url en profiles
-- 2) bucket de storage 'avatars' (lectura pública)
-- 3) policies: cualquiera lee; cada uno sube/edita/borra SOLO lo suyo
--    (la carpeta raíz del archivo debe ser su propio uid: <uid>/loquesea.png)

-- 1) Columna --------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- 2) Bucket ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) Policies sobre storage.objects para el bucket 'avatars' ---------------
drop policy if exists "Avatares visibles para todos" on storage.objects;
create policy "Avatares visibles para todos"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Subir mi propio avatar" on storage.objects;
create policy "Subir mi propio avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Actualizar mi propio avatar" on storage.objects;
create policy "Actualizar mi propio avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Borrar mi propio avatar" on storage.objects;
create policy "Borrar mi propio avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
