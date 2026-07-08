-- ============================================================
-- TIENDA DE SALONES
-- Los jugadores gastan monedas para desbloquear salones (fondos de la mesa de
-- juego) y eligen cuál usar. El salón es cosmético: cada jugador ve el suyo.
--
-- Qué crea:
--   - Tabla `salons` (catálogo, lectura pública).
--   - Tabla `profile_salons` (qué salones compró cada perfil).
--   - Columna `profiles.active_salon` (el salón en uso, default 'clasico').
--   - RPC `buy_salon(slug)`   → compra: valida, descuenta monedas y lo activa.
--   - RPC `set_active_salon(slug)` → cambia el salón en uso (gratis o comprado).
-- ============================================================

-- ---------- Catálogo ----------
create table if not exists public.salons (
  slug        text primary key,
  name        text not null,
  description text not null,
  price       integer not null check (price >= 0),
  sort_order  integer not null default 0
);

alter table public.salons enable row level security;

drop policy if exists "salons_select_all" on public.salons;
create policy "salons_select_all" on public.salons
  for select to public using (true);

insert into public.salons (slug, name, description, price, sort_order) values
  ('clasico',      'Salón Clásico',      'Madera oscura, luz baja y cuero. El de siempre.',                 0,    1),
  ('cafetin',      'Cafetín Porteño',    'Mesas de mármol, espejos y un bandoneón sonando al fondo.',      250,  2),
  ('quincho',      'Quincho de Estancia','Ladrillo visto, parrilla encendida y campo por la ventana.',     500,  3),
  ('bodega',       'Bodega Mendocina',   'Barricas de roble y penumbra cálida entre botellas.',            800,  4),
  ('nautico',      'Club Náutico',       'Madera clara, bronce y el río al atardecer.',                    1200, 5),
  ('presidencial', 'Salón Presidencial', 'Boiserie dorada, arañas de cristal y alfombra roja.',            1800, 6)
on conflict (slug) do nothing;

-- ---------- Salones comprados ----------
create table if not exists public.profile_salons (
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  salon_slug   text not null references public.salons(slug) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (profile_id, salon_slug)
);

alter table public.profile_salons enable row level security;

-- Cada uno ve solo sus compras. No hay INSERT/UPDATE para el cliente:
-- las compras pasan únicamente por buy_salon (security definer).
drop policy if exists "profile_salons_select_own" on public.profile_salons;
create policy "profile_salons_select_own" on public.profile_salons
  for select to authenticated using (profile_id = auth.uid());

-- ---------- Salón activo ----------
alter table public.profiles
  add column if not exists active_salon text not null default 'clasico';

-- ---------- Comprar un salón ----------
create or replace function public.buy_salon(p_slug text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  s       salons%rowtype;
  v_coins integer;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into s from salons where slug = p_slug;
  if not found then raise exception 'salón no encontrado'; end if;
  if s.price <= 0 then raise exception 'este salón es gratis, no hace falta comprarlo'; end if;

  -- Lock del perfil: evita comprar dos veces o gastar de más en simultáneo
  select coins into v_coins from profiles where id = uid for update;
  if not found then raise exception 'perfil no encontrado'; end if;

  if exists (select 1 from profile_salons where profile_id = uid and salon_slug = p_slug) then
    raise exception 'ya tenés este salón';
  end if;
  if v_coins < s.price then
    raise exception 'no te alcanzan las monedas';
  end if;

  update profiles
     set coins = coins - s.price,
         active_salon = p_slug          -- lo recién comprado queda en uso
   where id = uid;

  insert into profile_salons (profile_id, salon_slug) values (uid, p_slug);

  return json_build_object('coins', v_coins - s.price, 'active_salon', p_slug);
end;
$function$;

-- ---------- Elegir el salón en uso ----------
create or replace function public.set_active_salon(p_slug text)
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

  select price into v_price from salons where slug = p_slug;
  if not found then raise exception 'salón no encontrado'; end if;

  -- Los gratis los puede usar cualquiera; los pagos, solo si los compró.
  if v_price > 0
     and not exists (select 1 from profile_salons where profile_id = uid and salon_slug = p_slug) then
    raise exception 'no tenés este salón';
  end if;

  update profiles set active_salon = p_slug where id = uid;
end;
$function$;
