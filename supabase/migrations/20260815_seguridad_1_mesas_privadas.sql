-- ============================================================
-- TRUCAZO — Seguridad (1 de 5): que una mesa privada sea de verdad privada
-- Fecha: 2026-08-15
--
-- EL AGUJERO (verificado atacándolo, no leyendo el código):
--   1. La policy de lectura de `tables` era `using (true)`: cualquier usuario con
--      sesión podía leer TODAS las filas, incluido el `private_code` de las mesas
--      privadas de otros. En la prueba se leyó el código de una mesa ajena.
--   2. `join_table(uuid)` no miraba si la mesa era privada. Con solo saber el ID
--      (o habiendo leído el código por el agujero 1), un desconocido se sentaba
--      en la mesa que vos armaste para un amigo. En la prueba, entró.
--
-- EL ARREGLO:
--   * Lectura de `tables`: las mesas PÚBLICAS se siguen viendo (no tienen nada
--     que esconder: su `private_code` es null). Las PRIVADAS solo las ve quien
--     las juega.
--   * `join_table` rechaza de plano las mesas privadas.
--   * `join_table_by_code(text)` es el único camino para entrar con código, y
--     hace todo adentro de Postgres: normaliza, busca, bloquea la fila, valida y
--     descuenta una sola vez.
--
-- POR QUÉ LAS PÚBLICAS SE VEN AUNQUE YA ESTÉN JUGANDO (decisión consciente):
-- si se escondieran al arrancar la partida, el lobby de los demás dejaría de
-- recibir el aviso de "esta mesa se ocupó" (Realtime respeta la RLS) y quedarían
-- mesas fantasma en la lista. Una mesa pública no tiene secreto, así que se
-- esconde solo lo que hay que esconder: las privadas.
--
-- NO ROMPE LAS INVITACIONES A AMIGOS: `respond_game_invite` no pasa por
-- `join_table`, resuelve la silla por su cuenta (verificado).
--
-- Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. QUIÉN PUEDE LEER LAS MESAS
-- ------------------------------------------------------------

drop policy if exists "Las mesas son visibles para todos" on public.tables;
drop policy if exists "Mesas publicas y las mias" on public.tables;

create policy "Mesas publicas y las mias" on public.tables
  for select to anon, authenticated
  using (
    not is_private              -- el lobby de siempre
    or creator_id = auth.uid()  -- mi propia mesa privada (para mostrarte el código)
    or opponent_id = auth.uid() -- la mesa privada en la que estoy jugando
  );

-- ------------------------------------------------------------
-- 2. `join_table` NO entra a privadas
--
-- Queda igual que antes; lo único nuevo es el rechazo. El mensaje es el mismo
-- que el de una mesa que ya no está, para no confirmarle a nadie que ese ID
-- existe y es privado.
-- ------------------------------------------------------------

create or replace function public.join_table(p_table_id uuid)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  t tables%rowtype;
  v_coins int;
  v_username text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.is_private then raise exception 'la mesa ya no esta disponible'; end if;
  if t.status <> 'waiting' then raise exception 'la mesa ya no esta disponible'; end if;
  if t.opponent_id is not null then raise exception 'la mesa ya esta llena'; end if;
  if t.creator_id = auth.uid() then raise exception 'no podes unirte a tu propia mesa'; end if;

  select coins, username into v_coins, v_username
  from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins < t.bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - t.bet where id = auth.uid();

  update tables
     set opponent_id = auth.uid(),
         opponent_username = v_username,
         status = 'playing'
   where id = p_table_id
   returning * into t;

  return t;
end;
$function$;

-- ------------------------------------------------------------
-- 3. ENTRAR CON CÓDIGO, TODO ADENTRO DE POSTGRES
--
-- Antes el navegador buscaba la mesa por `private_code` y después llamaba a
-- `join_table`. Ahora manda solo el código y el servidor hace el resto.
--
-- El mensaje de error es SIEMPRE el mismo (código malo, mesa llena o mesa que ya
-- arrancó) para que nadie pueda usar los errores como detector de códigos
-- válidos. El caso "es tu propia mesa" sí se distingue: no revela nada que el
-- que llama no sepa, y evita un error confuso.
-- ------------------------------------------------------------

create or replace function public.join_table_by_code(p_code text)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  t          tables%rowtype;
  v_code     text;
  v_coins    int;
  v_username text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code = '' or length(v_code) > 12 then
    raise exception 'codigo invalido o la mesa ya no esta disponible';
  end if;

  -- Bloquea la fila: si dos entran con el mismo código a la vez, el segundo
  -- vuelve a evaluar la condición ya con la mesa ocupada y no pasa.
  select * into t from tables
   where private_code = v_code
     and is_private
     and status = 'waiting'
     and opponent_id is null
   for update;
  if not found then
    raise exception 'codigo invalido o la mesa ya no esta disponible';
  end if;

  if t.creator_id = auth.uid() then
    raise exception 'no podes unirte a tu propia mesa';
  end if;

  select coins, username into v_coins, v_username
  from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins < t.bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - t.bet where id = auth.uid();

  update tables
     set opponent_id = auth.uid(),
         opponent_username = v_username,
         status = 'playing'
   where id = t.id
   returning * into t;

  return t;
end;
$function$;

grant execute on function public.join_table_by_code(text) to authenticated;

commit;
