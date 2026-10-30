-- ============================================================
-- TRUCAZO — Casilla «Completar con bots» en el panel de torneos
-- Fecha: 2026-10-30
--
-- Antes había que marcar cada torneo con SQL en tournament_internal.bot_fill
-- (20261030223000). Estas dos funciones, sólo para administradores, leen y
-- cambian esa marca desde el panel. Se puede activar en torneos 1v1 en
-- borrador o publicados que todavía no arrancaron; desactivar, siempre.
-- ============================================================

begin;

create or replace function public.tournament_admin_bot_fill(p_tournament_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  perform tournament_internal.require_admin();
  return exists (select 1 from tournament_internal.bot_fill where tournament_id = p_tournament_id);
end;
$$;

create or replace function public.tournament_admin_set_bot_fill(p_tournament_id uuid, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.deleted_at is not null then raise exception 'Torneo no disponible'; end if;
  if not p_enabled then
    delete from tournament_internal.bot_fill where tournament_id = t.id;
  else
    if t.mode <> '1v1' then raise exception 'Completar con bots sólo funciona en torneos 1 vs 1'; end if;
    if t.status not in ('draft', 'published') or t.roster_frozen_at is not null then
      raise exception 'El torneo ya empezó';
    end if;
    insert into tournament_internal.bot_fill(tournament_id) values (t.id)
      on conflict (tournament_id) do nothing;
  end if;
  perform tournament_internal.audit(t.id, v_actor, 'bot_fill_changed', null,
    jsonb_build_object('enabled', p_enabled));
  return p_enabled;
end;
$$;

revoke all on function public.tournament_admin_bot_fill(uuid) from public, anon;
revoke all on function public.tournament_admin_set_bot_fill(uuid, boolean) from public, anon;
grant execute on function public.tournament_admin_bot_fill(uuid) to authenticated;
grant execute on function public.tournament_admin_set_bot_fill(uuid, boolean) to authenticated;

commit;
