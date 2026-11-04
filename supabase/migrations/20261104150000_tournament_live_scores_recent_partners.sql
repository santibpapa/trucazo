-- ============================================================
-- TRUCAZO — Torneos renovados, etapa 2: marcador en vivo y compañeros recientes
-- Fecha: 2026-11-04
--
-- Dos funciones NUEVAS, sólo de lectura. No cambian reglas, tablas ni
-- funciones existentes, así que las apps ya instaladas siguen igual.
--
-- tournament_live_scores(torneo): los puntos de los cruces que se están
--   jugando, para mostrarlos en la llave. Mismo criterio que el espectador:
--   sólo cuentas registradas y torneos publicados. Los puntos salen de la
--   partida como lo hace el cierre del cruce: jugador 1 / equipo 0 es el
--   lado A. Nunca lee manos (game_hands / team_hands).
--
-- tournament_recent_partners(): hasta 8 personas con las que jugaste en los
--   últimos 60 días (mano a mano o parejas), para invitarlas a un torneo de
--   parejas sin escribir el nombre. Sólo cuentas que pueden jugar torneos
--   (sin bots, invitados ni cuentas de prueba) y sin bloqueos entre ustedes.
--   La invitación sigue validándose en tournament_invite_partner.
-- ============================================================

begin;

create or replace function public.tournament_live_scores(p_tournament_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  t public.tournaments;
begin
  if v_user_id is null or not exists (
    select 1 from auth.users where id = v_user_id and not coalesce(is_anonymous, false)
  ) then
    return '[]'::jsonb;
  end if;

  select * into t from public.tournaments
   where id = p_tournament_id and deleted_at is null;
  if not found or t.published_at is null or t.status = 'draft' then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'match_id', m.id, 'score_a', s.score_a, 'score_b', s.score_b) order by m.round_number, m.match_number)
      from public.tournament_matches m
      cross join lateral (
        select g.player1_score as score_a, g.player2_score as score_b
          from public.games g
         where t.mode = '1v1' and g.id = m.game_id
        union all
        select tg.scores[1], tg.scores[2]
          from public.team_games tg
         where t.mode = '2v2' and tg.id = m.team_game_id
      ) s
     where m.tournament_id = t.id and m.status = 'playing'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.tournament_recent_partners()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not tournament_internal.is_eligible_participant(v_user_id) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'username', c.username, 'avatar_url', c.avatar_url,
      'played_at', c.played_at) order by c.played_at desc)
      from (
        select p.id, p.username, p.avatar_url, recent.played_at
          from (
            select other_id, max(played_at) as played_at
              from (
                -- Mano a mano: la otra persona de la partida.
                select case when g.player1_id = v_user_id then g.player2_id else g.player1_id end as other_id,
                       g.created_at as played_at
                  from public.games g
                 where (g.player1_id = v_user_id or g.player2_id = v_user_id)
                   and g.created_at > now() - interval '60 days'
                union all
                -- Parejas: compañero y rivales de la misma mesa.
                select other.user_id, tt.created_at
                  from public.team_seats mine
                  join public.team_tables tt on tt.id = mine.table_id
                  join public.team_seats other on other.table_id = mine.table_id
                 where mine.user_id = v_user_id
                   and other.user_id is not null
                   and tt.status in ('playing', 'finished')
                   and tt.created_at > now() - interval '60 days'
              ) played
             where other_id is not null and other_id <> v_user_id
             group by other_id
          ) recent
          join public.profiles p on p.id = recent.other_id
         where tournament_internal.is_eligible_participant(p.id)
           and not exists (
             select 1 from community_safety.blocks b
              where (b.owner_id = v_user_id and b.target_id = p.id)
                 or (b.owner_id = p.id and b.target_id = v_user_id)
           )
         order by recent.played_at desc
         limit 8
      ) c
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.tournament_live_scores(uuid) from public, anon, authenticated;
revoke all on function public.tournament_recent_partners() from public, anon, authenticated;
grant execute on function public.tournament_live_scores(uuid) to authenticated;
grant execute on function public.tournament_recent_partners() to authenticated;

commit;
