import type { SupabaseClient } from '@supabase/supabase-js'

export type TournamentMode = '1v1' | '2v2'
export type TournamentFormat = 'knockout' | 'groups'
export type TournamentStatus = 'draft' | 'published' | 'running' | 'completed' | 'cancelled'
export type TournamentEntryStatus =
  | 'active'
  | 'waitlisted'
  | 'eliminated'
  | 'disqualified'
  | 'withdrawn'
  | 'replaced'
export type TournamentEntryKind = 'solo' | 'team'
export type TournamentMemberStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'replaced'
export type TournamentMatchStatus = 'pending' | 'ready' | 'playing' | 'finished' | 'forfeit' | 'cancelled'

export interface Tournament {
  id: string
  name: string
  description: string
  mode: TournamentMode
  format: TournamentFormat
  capacity: 4 | 8 | 16 | 32
  target_score: 15 | 30
  prize_first: number
  prize_second: number
  prize_third: number
  starts_at: string
  status: TournamentStatus
  published_at: string | null
  paused_at: string | null
  roster_frozen_at: string | null
  schedule_version: number
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  active_players?: number
}

export interface TournamentMember {
  id?: string
  user_id: string
  username: string
  avatar_url: string | null
  role?: 'captain' | 'invitee' | 'assigned' | 'replacement'
  status?: TournamentMemberStatus
  invited_at?: string | null
  accepted_at?: string | null
}

export interface TournamentAdminMember {
  id: string
  tournament_id: string
  entry_id: string
  user_id: string
  role: 'captain' | 'invitee' | 'assigned' | 'replacement'
  status: TournamentMemberStatus
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  withdrawn_at: string | null
  replaced_at: string | null
  replaced_by: string | null
  created_at: string
}

export interface TournamentEntry {
  id: string
  tournament_id: string
  status: TournamentEntryStatus
  kind: TournamentEntryKind
  sequence_no: number
  priority_at: string
  draw_seed: string
  replaced_entry_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TournamentEntrySnapshot {
  entry: TournamentEntry
  members: TournamentMember[]
  checkin: {
    entry_id: string
    tournament_id: string
    confirmed_by: string
    confirmed_at: string
  } | null
}

export interface TournamentListData {
  drafts: Tournament[]
  upcoming: Tournament[]
  active: Tournament[]
  past: Tournament[]
}

export interface TournamentDetailData {
  tournament: Tournament
  active_players: number
  participants: Array<{
    entry_id: string
    kind: TournamentEntryKind
    status: 'active'
    members: TournamentMember[]
    checked_in: boolean
  }>
  waitlist: Array<{
    entry_id: string
    kind: TournamentEntryKind
    members: TournamentMember[]
  }>
  groups: Array<{ id: string; group_number: number; status: string }>
  group_members: Array<{
    group_id: string
    entry_id: string
    position: number
    wins: number
    losses: number
    points_for: number
    points_against: number
    tie_break_seed: string
    rank: number
  }>
  competition_entries: Array<{
    entry_id: string
    username: string
    avatar_url: string | null
    status: TournamentEntryStatus
  }>
  matches: Array<{
    id: string
    phase: 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'third_place' | 'final'
    group_id: string | null
    round_number: number
    match_number: number
    side_a_entry_id: string | null
    side_b_entry_id: string | null
    status: TournamentMatchStatus
    entry_deadline: string | null
    finish_reason: string | null
    winner_entry_id: string | null
    score_a: number | null
    score_b: number | null
    game_id: string | null
  }>
  admin_entries?: Array<{
    entry: TournamentEntry
    members: TournamentAdminMember[]
  }>
}

export interface TournamentDraftInput {
  name: string
  description: string
  mode: TournamentMode
  format: TournamentFormat
  capacity: 4 | 8 | 16 | 32
  targetScore: 15 | 30
  prizeFirst: number
  prizeSecond: number
  prizeThird: number
  startsAt: string
}

function draftRpcArgs(requestId: string, input: TournamentDraftInput) {
  return {
    p_request_id: requestId,
    p_name: input.name,
    p_description: input.description,
    p_mode: input.mode,
    p_format: input.format,
    p_capacity: input.capacity,
    p_target_score: input.targetScore,
    p_prize_first: input.prizeFirst,
    p_prize_second: input.prizeSecond,
    p_prize_third: input.prizeThird,
    p_starts_at: input.startsAt,
  }
}

/**
 * Contrato unico para las RPC de torneos. PR 2 conecta estas llamadas a la UI;
 * mantenerlas aca evita que cada pantalla invente nombres o argumentos.
 */
export function tournamentApi(client: SupabaseClient) {
  return {
    list: () => client.rpc('tournament_list'),
    detail: (tournamentId: string) => client.rpc('tournament_detail', {
      p_tournament_id: tournamentId,
    }),
    myEntry: (tournamentId: string) => client.rpc('tournament_my_entry', {
      p_tournament_id: tournamentId,
    }),
    adminCreate: (requestId: string, input: TournamentDraftInput, publish = false) =>
      client.rpc('tournament_admin_create', {
        ...draftRpcArgs(requestId, input),
        p_publish: publish,
      }),
    adminUpdate: (requestId: string, tournamentId: string, input: TournamentDraftInput) =>
      client.rpc('tournament_admin_update', {
        ...draftRpcArgs(requestId, input),
        p_tournament_id: tournamentId,
      }),
    adminPublish: (requestId: string, tournamentId: string) =>
      client.rpc('tournament_admin_publish', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
      }),
    adminReschedule: (requestId: string, tournamentId: string, startsAt: string) =>
      client.rpc('tournament_admin_reschedule', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
        p_starts_at: startsAt,
      }),
    adminCancel: (requestId: string, tournamentId: string, reason: string) =>
      client.rpc('tournament_admin_cancel', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
        p_reason: reason,
      }),
    registerSolo: (requestId: string, tournamentId: string) =>
      client.rpc('tournament_register_solo', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
      }),
    invitePartner: (requestId: string, tournamentId: string, partnerId: string) =>
      client.rpc('tournament_invite_partner', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
        p_partner_id: partnerId,
      }),
    respondInvitation: (
      requestId: string,
      tournamentId: string,
      invitationId: string,
      accept: boolean,
    ) =>
      client.rpc('tournament_respond_invitation', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
        p_invitation_id: invitationId,
        p_accept: accept,
      }),
    withdraw: (requestId: string, tournamentId: string) =>
      client.rpc('tournament_withdraw', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
      }),
    checkIn: (requestId: string, tournamentId: string) =>
      client.rpc('tournament_check_in', {
        p_request_id: requestId,
        p_tournament_id: tournamentId,
      }),
    enterMatch: (matchId: string) =>
      client.rpc('tournament_enter_match', { p_match_id: matchId }),
    adminStart: (tournamentId: string) =>
      client.rpc('tournament_admin_start', { p_tournament_id: tournamentId }),
    adminPause: (tournamentId: string, pause: boolean) =>
      client.rpc('tournament_admin_pause', { p_tournament_id: tournamentId, p_pause: pause }),
    adminRetryMatch: (matchId: string) =>
      client.rpc('tournament_admin_retry_match', { p_match_id: matchId }),
    adminReplace: (tournamentId: string, outgoing: string, incoming: string) =>
      client.rpc('tournament_admin_replace', {
        p_tournament_id: tournamentId,
        p_outgoing_entry_id: outgoing,
        p_waitlist_entry_id: incoming,
      }),
    adminDisqualify: (tournamentId: string, entryId: string) =>
      client.rpc('tournament_admin_disqualify', {
        p_tournament_id: tournamentId,
        p_entry_id: entryId,
      }),
  }
}

// Ausente o cualquier valor distinto de "true" equivale a apagado.
export const tournamentModeEnabled = process.env.NEXT_PUBLIC_ENABLE_TOURNAMENTS === 'true'
