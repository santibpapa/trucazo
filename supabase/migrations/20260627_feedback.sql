-- ============================================================
-- TRUCAZO — Reseñas / feedback de jugadores
-- Fecha: 2026-06-27
--
-- Tabla feedback + RPC submit_feedback (definer, setea user_id = auth.uid()) +
-- depósito privado 'feedback-images' para las imágenes que adjunte el jugador.
-- El dueño lee las reseñas desde el panel de Supabase (ignora RLS). Idempotente.
-- ============================================================

begin;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  rating_general int check (rating_general between 1 and 5),
  rating_aesthetics int check (rating_aesthetics between 1 and 5),
  understood boolean,
  had_problem boolean,
  comment text,
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- Sin políticas de lectura/escritura directa: se inserta solo por la RPC definer.

create or replace function public.submit_feedback(
  p_rating_general int,
  p_rating_aesthetics int,
  p_understood boolean,
  p_had_problem boolean,
  p_comment text,
  p_image_paths text[]
) returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if p_rating_general is not null and p_rating_general not between 1 and 5 then
    raise exception 'puntuacion general invalida';
  end if;
  if p_rating_aesthetics is not null and p_rating_aesthetics not between 1 and 5 then
    raise exception 'puntuacion de estetica invalida';
  end if;
  insert into public.feedback (user_id, rating_general, rating_aesthetics, understood, had_problem, comment, image_paths)
  values (auth.uid(), p_rating_general, p_rating_aesthetics, p_understood, p_had_problem,
          nullif(btrim(coalesce(p_comment,'')), ''), coalesce(p_image_paths, '{}'));
end;
$function$;

grant execute on function public.submit_feedback(int, int, boolean, boolean, text, text[]) to anon, authenticated;

-- Depósito privado para las imágenes de las reseñas
insert into storage.buckets (id, name, public) values ('feedback-images', 'feedback-images', false)
  on conflict (id) do nothing;

-- Cualquiera que esté en la app puede SUBIR (no leer) a ese depósito
drop policy if exists "feedback subir imagenes" on storage.objects;
create policy "feedback subir imagenes" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'feedback-images');

commit;
