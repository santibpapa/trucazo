-- ============================================================
-- MARCOS DEL PERFIL
-- Los jugadores gastan monedas para desbloquear marcos (aros decorativos que
-- rodean su foto de perfil) y eligen cuál usar. El marco es cosmético y se ve
-- en todos lados donde aparece el avatar (perfil, lobby, mesa, amigos).
--
-- Qué crea:
--   - Tabla `frames` (catálogo, lectura pública).
--   - Tabla `profile_frames` (qué marcos compró cada perfil).
--   - Columna `profiles.active_frame` (el marco en uso, default 'ninguno').
--   - RPC `buy_frame(slug)`   → compra: valida, descuenta monedas y lo activa.
--   - RPC `set_active_frame(slug)` → cambia el marco en uso (gratis o comprado).
--
-- El "dibujo" de cada marco NO vive acá: es CSS en src/lib/marcos.ts. Esta tabla
-- solo guarda el catálogo (nombre, precio) y quién compró qué.
-- ============================================================

-- ---------- Catálogo ----------
create table if not exists public.frames (
  slug        text primary key,
  name        text not null,
  description text not null,
  price       integer not null check (price >= 0),
  sort_order  integer not null default 0
);

alter table public.frames enable row level security;

drop policy if exists "frames_select_all" on public.frames;
create policy "frames_select_all" on public.frames
  for select to public using (true);

insert into public.frames (slug, name, description, price, sort_order) values
  ('ninguno',  'Sin marco',       'Tu foto sola, sin adorno.',                          0,    1),
  ('bronce',   'Bronce',          'Un aro de metal cálido, sobrio y clásico.',          200,  2),
  ('plata',    'Plata',           'Plata pulida con un destello frío.',                 400,  3),
  ('oro',      'Oro',             'Oro brillante que refleja la luz al girar.',         700,  4),
  ('neon',     'Neón',            'Cian y violeta girando, con resplandor eléctrico.',  1000, 5),
  ('fuego',    'Fuego',           'Naranjas y rojos en llamas alrededor de tu foto.',   1400, 6),
  ('arcoiris', 'Arcoíris',        'Todos los colores girando. El más vistoso de todos.', 2000, 7)
on conflict (slug) do nothing;

-- ---------- Marcos comprados ----------
create table if not exists public.profile_frames (
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  frame_slug   text not null references public.frames(slug) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (profile_id, frame_slug)
);

alter table public.profile_frames enable row level security;

-- Cada uno ve solo sus compras. No hay INSERT/UPDATE para el cliente:
-- las compras pasan únicamente por buy_frame (security definer).
drop policy if exists "profile_frames_select_own" on public.profile_frames;
create policy "profile_frames_select_own" on public.profile_frames
  for select to authenticated using (profile_id = auth.uid());

-- ---------- Marco activo ----------
alter table public.profiles
  add column if not exists active_frame text not null default 'ninguno';

-- ---------- Comprar un marco ----------
create or replace function public.buy_frame(p_slug text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  f       frames%rowtype;
  v_coins integer;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into f from frames where slug = p_slug;
  if not found then raise exception 'marco no encontrado'; end if;
  if f.price <= 0 then raise exception 'este marco es gratis, no hace falta comprarlo'; end if;

  -- Lock del perfil: evita comprar dos veces o gastar de más en simultáneo
  select coins into v_coins from profiles where id = uid for update;
  if not found then raise exception 'perfil no encontrado'; end if;

  if exists (select 1 from profile_frames where profile_id = uid and frame_slug = p_slug) then
    raise exception 'ya tenés este marco';
  end if;
  if v_coins < f.price then
    raise exception 'no te alcanzan las monedas';
  end if;

  update profiles
     set coins = coins - f.price,
         active_frame = p_slug          -- lo recién comprado queda en uso
   where id = uid;

  insert into profile_frames (profile_id, frame_slug) values (uid, p_slug);

  return json_build_object('coins', v_coins - f.price, 'active_frame', p_slug);
end;
$function$;

-- ---------- Elegir el marco en uso ----------
create or replace function public.set_active_frame(p_slug text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  v_price integer;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select price into v_price from frames where slug = p_slug;
  if not found then raise exception 'marco no encontrado'; end if;

  -- Los gratis los puede usar cualquiera; los pagos, solo si los compró.
  if v_price > 0
     and not exists (select 1 from profile_frames where profile_id = uid and frame_slug = p_slug) then
    raise exception 'no tenés este marco';
  end if;

  update profiles set active_frame = p_slug where id = uid;
end;
$function$;
