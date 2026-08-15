-- ============================================================
-- ACCESORIOS DE LA MESA
-- Objetos que el jugador compra con monedas y apoya sobre la mesa (uno a la vez).
-- Es cosmético y "por jugador": cada uno ve el suyo en su lado, y ve el del rival
-- en el lado del rival. La imagen es /accesorios/{slug}.webp (con transparencia).
--
-- Calca la infra de la Tienda de salones / marcos:
--   - Tabla `accessories` (catálogo, lectura pública).
--   - Tabla `profile_accessories` (qué accesorios compró cada perfil).
--   - Columna `profiles.active_accessory` (el que está en la mesa, default 'ninguno').
--   - RPC `buy_accessory(slug)`        → compra: valida, descuenta y lo activa.
--   - RPC `set_active_accessory(slug)` → cambia el accesorio en uso (o lo saca).
-- ============================================================

-- ---------- Catálogo ----------
create table if not exists public.accessories (
  slug        text primary key,
  name        text not null,
  description text not null,
  price       integer not null check (price >= 0),
  sort_order  integer not null default 0
);

alter table public.accessories enable row level security;

drop policy if exists "accessories_select_all" on public.accessories;
create policy "accessories_select_all" on public.accessories
  for select to public using (true);

insert into public.accessories (slug, name, description, price, sort_order) values
  ('agua',     'Botella de agua',       'Para los que juegan con la cabeza fría.',                150,  1),
  ('fernet',   'Fernet con coca',       'Con su espumita arriba. El clásico de toda mesa.',       400,  2),
  ('whiskey',  'Vaso de whisky',        'On the rocks, para jugar con clase.',                    600,  3),
  ('cenicero', 'Cenicero',              'Con el puchito prendido al costado.',                    700,  4),
  ('habano',   'Habano',                'Un buen habano para los momentos importantes.',          1000, 5),
  ('fajo',     'Fajo de dólares',       'Verdes sobre la mesa. Que sepan que venís en serio.',    1500, 6),
  ('copa',     'Copa del Mundo',        'La Copa del Mundo al lado tuyo. Para los campeones.',     2500, 7)
on conflict (slug) do nothing;

-- ---------- Accesorios comprados ----------
create table if not exists public.profile_accessories (
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  accessory_slug   text not null references public.accessories(slug) on delete cascade,
  purchased_at     timestamptz not null default now(),
  primary key (profile_id, accessory_slug)
);

alter table public.profile_accessories enable row level security;

-- Cada uno ve solo sus compras. No hay INSERT/UPDATE de cliente:
-- las compras pasan únicamente por buy_accessory (security definer).
drop policy if exists "profile_accessories_select_own" on public.profile_accessories;
create policy "profile_accessories_select_own" on public.profile_accessories
  for select to authenticated using (profile_id = auth.uid());

-- ---------- Accesorio activo ----------
alter table public.profiles
  add column if not exists active_accessory text not null default 'ninguno';

-- ---------- Comprar un accesorio ----------
create or replace function public.buy_accessory(p_slug text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  a       accessories%rowtype;
  v_coins integer;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into a from accessories where slug = p_slug;
  if not found then raise exception 'accesorio no encontrado'; end if;
  if a.price <= 0 then raise exception 'este accesorio es gratis, no hace falta comprarlo'; end if;

  -- Lock del perfil: evita comprar dos veces o gastar de más en simultáneo
  select coins into v_coins from profiles where id = uid for update;
  if not found then raise exception 'perfil no encontrado'; end if;

  if exists (select 1 from profile_accessories where profile_id = uid and accessory_slug = p_slug) then
    raise exception 'ya tenés este accesorio';
  end if;
  if v_coins < a.price then
    raise exception 'no te alcanzan las monedas';
  end if;

  update profiles
     set coins = coins - a.price,
         active_accessory = p_slug          -- lo recién comprado queda en uso
   where id = uid;

  insert into profile_accessories (profile_id, accessory_slug) values (uid, p_slug);

  return json_build_object('coins', v_coins - a.price, 'active_accessory', p_slug);
end;
$function$;

-- ---------- Elegir el accesorio en uso (o sacarlo con 'ninguno') ----------
create or replace function public.set_active_accessory(p_slug text)
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

  -- 'ninguno' = sacar el accesorio de la mesa.
  if p_slug = 'ninguno' then
    update profiles set active_accessory = 'ninguno' where id = uid;
    return;
  end if;

  select price into v_price from accessories where slug = p_slug;
  if not found then raise exception 'accesorio no encontrado'; end if;

  -- Solo si lo compró (no hay accesorios gratis, pero por las dudas).
  if v_price > 0
     and not exists (select 1 from profile_accessories where profile_id = uid and accessory_slug = p_slug) then
    raise exception 'no tenés este accesorio';
  end if;

  update profiles set active_accessory = p_slug where id = uid;
end;
$function$;
