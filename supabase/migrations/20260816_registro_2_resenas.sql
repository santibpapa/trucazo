-- ============================================================
-- TRUCAZO — Registro (2 de 3): endurecer las reseñas y sus imágenes
-- Fecha: 2026-08-16
--
-- CÓMO ESTABA:
--   * Al depósito de imágenes podía subir CUALQUIERA, incluso sin haber
--     iniciado sesión (`to anon, authenticated`), y a cualquier nombre de
--     archivo. Nada ataba una imagen a quien la subió, así que alguien podía
--     pisar el archivo de otro o llenar el depósito con basura.
--   * `submit_feedback` solo miraba que las estrellitas fueran de 1 a 5. No
--     miraba el largo del comentario, ni cuántas imágenes, ni si esas rutas eran
--     realmente suyas, ni cada cuánto se mandaba. Un script podía dejar miles de
--     reseñas con textos enormes.
--
-- CÓMO QUEDA:
--   * Cada uno sube DENTRO DE SU CARPETA: la ruta tiene que empezar con su
--     propio identificador. La regla la aplica el depósito, no el navegador.
--   * Hay que tener sesión (los invitados también tienen: entran con una cuenta
--     anónima de Supabase, que es igual de válida acá).
--   * El propio depósito limita el tamaño (5 MB) y los tipos de archivo, así no
--     alcanza con esquivar la validación del navegador.
--   * `submit_feedback` valida de verdad: sesión, estrellitas, largo del
--     comentario, cantidad de imágenes, que cada ruta sea suya y con formato
--     válido, y un máximo de reseñas por hora.
--
-- Las reseñas ya enviadas no se tocan. Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. EL DEPÓSITO: cada uno en su carpeta
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('feedback-images', 'feedback-images', false)
on conflict (id) do nothing;

-- Tope de tamaño y tipos permitidos en el propio depósito. Antes esto vivía solo
-- en el navegador, y el navegador se puede saltear.
update storage.buckets
   set file_size_limit = 5242880,          -- 5 MB
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
 where id = 'feedback-images';

-- La política vieja dejaba subir a cualquiera, a cualquier ruta.
drop policy if exists "feedback subir imagenes" on storage.objects;
drop policy if exists "feedback subir en mi carpeta" on storage.objects;

-- La ruta tiene que ser  <mi-id>/<nombre>.<ext>  — el primer tramo es la carpeta.
create policy "feedback subir en mi carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feedback-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 2. LA FUNCIÓN QUE GUARDA LA RESEÑA
-- ------------------------------------------------------------

create or replace function public.submit_feedback(
  p_rating_general integer,
  p_rating_aesthetics integer,
  p_understood boolean,
  p_had_problem boolean,
  p_comment text,
  p_image_paths text[]
) returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid           uuid := auth.uid();
  v_paths       text[] := coalesce(p_image_paths, '{}');
  v_comment     text;
  v_recientes   int;
  p             text;
  max_imagenes  constant int := 3;
  max_comentario constant int := 2000;
  max_por_hora  constant int := 5;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  if p_rating_general is not null and p_rating_general not between 1 and 5 then
    raise exception 'puntuacion general invalida';
  end if;
  if p_rating_aesthetics is not null and p_rating_aesthetics not between 1 and 5 then
    raise exception 'puntuacion de estetica invalida';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');
  if length(coalesce(v_comment, '')) > max_comentario then
    raise exception 'el comentario es demasiado largo';
  end if;

  if array_length(v_paths, 1) > max_imagenes then
    raise exception 'demasiadas imagenes';
  end if;

  -- Cada ruta tiene que estar en MI carpeta y con un nombre sano. Así nadie
  -- puede adjuntar a su reseña la imagen de otro.
  foreach p in array v_paths loop
    if p !~ ('^' || uid::text || '/[A-Za-z0-9._-]{1,100}\.(jpg|jpeg|png|webp|gif)$') then
      raise exception 'ruta de imagen invalida';
    end if;
  end loop;

  -- Freno anti-spam: unas pocas reseñas por hora y listo.
  select count(*) into v_recientes
    from feedback
   where user_id = uid and created_at > now() - interval '1 hour';
  if v_recientes >= max_por_hora then
    raise exception 'ya mandaste varias reseñas; probá mas tarde';
  end if;

  insert into feedback (user_id, rating_general, rating_aesthetics, understood,
                        had_problem, comment, image_paths)
  values (uid, p_rating_general, p_rating_aesthetics, p_understood, p_had_problem,
          v_comment, v_paths);
end;
$function$;

grant execute on function public.submit_feedback(integer, integer, boolean, boolean, text, text[])
  to authenticated;

commit;
