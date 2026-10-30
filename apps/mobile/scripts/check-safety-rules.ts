import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { safetyFixture } from './safety-fixture'
import { ids } from './online-fixture'

async function main() {
  const f = await safetyFixture(), passed: string[] = []
  const admin = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'
  const rpc = (name: string, body: Record<string, unknown> = {}, owner = ids.A) => f.rpc(name, body, owner)
  try {
    await f.db.query("insert into profiles(id,username,is_admin) values($1,'Admin aislado',true)", [admin])
    await assert.rejects(() => rpc('send_chat_message', { p_body: 'Sin aceptación' }), /normas/)
    await assert.rejects(() => rpc('accept_community_rules', { p_version: 'antigua' }), /cambiaron/)
    for (const owner of [ids.A, ids.B, admin]) await rpc('accept_community_rules', { p_version: '2026-10-15' }, owner)
    assert.equal((await rpc('community_safety_state')).accepted, true)
    passed.push('normas versionadas exigidas en servidor')

    await rpc('send_chat_message', { p_body: 'Texto de evidencia privado' }, ids.B)
    const message = (await f.db.query<{ id: string }>('select id from chat_messages')).rows[0].id
    const args = { p_kind: 'chat', p_target: message, p_reason: 'harassment', p_detail: 'Prueba aislada' }
    const report = await rpc('report_community_content', args)
    assert.equal(await rpc('report_community_content', args), report)
    assert.equal((await rpc('community_safety_state', {}, ids.B)).reports.length, 0)
    await assert.rejects(() => rpc('moderation_reports'), /administradores/)
    await assert.rejects(() => rpc('resolve_community_report', { p_report: report, p_action: 'remove', p_resolution: 'Sin permiso' }), /administradores/)
    for (const table of ['reports','blocks','acceptances','restrictions']) {
      await assert.rejects(() => f.asUser(ids.A, () => f.db.query('select * from community_safety.' + table)), /permission denied/)
    }
    await f.db.query('delete from chat_messages where id=$1', [message])
    assert.equal((await rpc('moderation_reports', {}, admin))[0].evidence.body, 'Texto de evidencia privado')
    await rpc('resolve_community_report', { p_report: report, p_action: 'remove', p_resolution: 'Contenido retirado en prueba aislada' }, admin)
    assert.equal((await rpc('community_safety_state')).reports[0].action, 'remove')
    passed.push('denuncia idempotente, evidencia tras limpieza, privacidad y resolución admin')

    await rpc('send_friend_request', { p_username: 'Cuenta B' })
    const friendship = (await rpc('get_community', {}, ids.B)).incoming[0].friendship_id
    await rpc('respond_friend_request', { p_friendship_id: friendship, p_accept: true }, ids.B)
    const coins = (await f.db.query('select id,coins from profiles order by id')).rows
    await rpc('invite_friend', { p_friend_id: ids.B })
    await rpc('set_player_block', { p_target: ids.B, p_blocked: true })
    assert.deepEqual((await f.db.query('select id,coins from profiles order by id')).rows, coins)
    assert.equal((await rpc('get_community')).friends.length, 0)
    assert.equal((await rpc('get_community', {}, ids.B)).invites_in.length, 0)
    await assert.rejects(() => rpc('send_friend_request', { p_username: 'Cuenta A' }, ids.B), /bloqueo/)
    await assert.rejects(() => rpc('send_friend_request', { p_username: 'Cuenta B' }), /bloqueo/)
    const table = await rpc('create_table', { p_name: 'Mesa privada', p_bet: 10, p_target_score: 15, p_is_private: true, p_private_code: 'QA12TEST' }, ids.B)
    await assert.rejects(() => rpc('join_table', { p_table_id: table.id }), /mesa|bloqueo/)
    await assert.rejects(() => rpc('join_table_by_code', { p_code: table.private_code }), /bloqueo/)
    await rpc('cancel_table', { p_table_id: table.id }, ids.B)
    passed.push('bloqueo bilateral: amistad, invitación/reembolso, mesa pública/privada/código')

    await f.db.query("update chat_messages set created_at=now()-interval '2 seconds'")
    await rpc('send_chat_message', { p_body: 'Invisible para A' }, ids.B)
    assert.equal((await f.asUser(ids.A, () => f.db.query('select * from chat_messages'))).rows.length, 0)
    assert.equal((await f.asUser(ids.B, () => f.db.query('select * from chat_messages'))).rows.length, 1)
    await rpc('set_player_block', { p_target: ids.B, p_blocked: false })
    assert.equal((await rpc('community_safety_state')).blocks.length, 0)
    assert.equal((await f.asUser(ids.A, () => f.db.query('select * from chat_messages'))).rows.length, 1)
    passed.push('chat filtrado por servidor y desbloqueo sin restaurar amistades')

    const t = await rpc('create_table', { p_name: 'Partida existente', p_bet: 10, p_target_score: 15, p_is_private: false })
    await rpc('join_table', { p_table_id: t.id }, ids.B)
    const game = await rpc('start_game', { p_game_id: t.id })
    await rpc('set_player_block', { p_target: ids.B, p_blocked: true })
    const unchanged = (await f.db.query<any>('select * from games where id=$1', [game.id])).rows[0]
    assert.equal(unchanged.status, game.status); assert.equal(unchanged.player1_score, game.player1_score); assert.equal(unchanged.current_turn, game.current_turn)
    await rpc('send_match_chat_message', { p_mode: 'game', p_match_id: game.id, p_body: 'Chat bloqueado', p_request_id: crypto.randomUUID() }, ids.B)
    assert.equal((await f.asUser(ids.A, () => f.db.query('select * from match_chat_messages'))).rows.length, 0)
    await assert.rejects(() => rpc('report_community_content', { p_kind: 'match_chat', p_target: (unchanged.id as string), p_reason: 'spam' }, admin), /disponible/)
    passed.push('partida iniciada intacta; chat de mesa filtrado, no accesible al espectador')

    const team = await rpc('team_create', { p_request_id: crypto.randomUUID(), p_name: 'Mesa de ensayo', p_bet: 10, p_target_score: 15, p_time_limit: 30, p_is_private: true })
    await assert.rejects(() => rpc('team_join', { p_table_id: team.table.id, p_request_id: crypto.randomUUID() }, ids.B), /Mesa|bloqueo/)
    await assert.rejects(() => rpc('team_join', { p_code: team.table.private_code, p_request_id: crypto.randomUUID() }, ids.B), /bloqueo/)
    await rpc('create_group', { p_name: 'Grupo de ensayo', p_description: 'Contexto conservado' })
    await rpc('send_friend_request', { p_username: 'Admin aislado' })
    const adminRequest = (await rpc('get_community', {}, admin)).incoming[0].friendship_id
    await rpc('respond_friend_request', { p_friendship_id: adminRequest, p_accept: true }, admin)
    await rpc('invite_to_group', { p_friend_id: admin })
    await rpc('respond_group_invite', { p_invite_id: (await rpc('get_community', {}, admin)).group_invites_in[0].invite_id, p_accept: true }, admin)
    await rpc('send_friend_request', { p_username: 'Cuenta B' }, admin)
    await rpc('respond_friend_request', { p_friendship_id: (await rpc('get_community', {}, ids.B)).incoming[0].friendship_id, p_accept: true }, ids.B)
    await assert.rejects(() => rpc('invite_to_group', { p_friend_id: ids.B }, admin), /bloqueo/)
    assert.equal((await rpc('get_community')).group.members.length, 2)
    passed.push('parejas por id/código y grupo mediante un tercero no evitan el bloqueo')

    await f.db.exec('delete from community_safety.acceptances where user_id=\'' + admin + '\'')
    await assert.rejects(() => f.asUser(admin, () => f.db.exec("insert into storage.objects(bucket_id,name) values('avatars','ensayo.jpg')")), /row-level security/)
    await rpc('accept_community_rules', { p_version: '2026-10-15' }, admin)
    await f.asUser(admin, () => f.db.exec("insert into storage.objects(bucket_id,name) values('avatars','ensayo.jpg')"))
    passed.push('subidas directas exigen normas, además del control de la interfaz')

    await rpc('publish_news', { p_title: 'Novedad aislada', p_body: 'Texto para revisar' }, admin)
    const news = (await f.db.query<{ id: string }>('select id from news')).rows[0].id
    const newsReport = await rpc('report_community_content', { p_kind: 'news', p_target: news, p_reason: 'other' }, ids.B)
    await rpc('resolve_community_report', { p_report: newsReport, p_action: 'remove', p_resolution: 'Novedad retirada en ensayo' }, admin)
    assert.equal((await f.db.query('select * from news')).rows.length, 0)
    await rpc('submit_feedback', { p_rating_general: 4, p_rating_aesthetics: 4, p_understood: true, p_had_problem: false, p_comment: 'Reseña privada aislada', p_image_paths: [] }, ids.B)
    const feedback = (await f.db.query<{ id: string }>('select id from feedback')).rows[0].id
    await assert.rejects(() => rpc('report_community_content', { p_kind: 'feedback', p_target: feedback, p_reason: 'spam' }), /disponible/)
    assert.equal((await rpc('moderation_feedback', {}, admin)).length, 1)
    const feedbackReport = await rpc('report_community_content', { p_kind: 'feedback', p_target: feedback, p_reason: 'spam' }, admin)
    await rpc('resolve_community_report', { p_report: feedbackReport, p_action: 'remove', p_resolution: 'Reseña retirada en ensayo' }, admin)
    assert.equal((await f.db.query<{ comment: string }>('select comment from feedback')).rows[0].comment, 'Contenido retirado por moderación')
    const groupId = (await rpc('get_community')).group.id
    const groupReport = await rpc('report_community_content', { p_kind: 'group', p_target: groupId, p_reason: 'other' }, admin)
    await rpc('resolve_community_report', { p_report: groupReport, p_action: 'remove', p_resolution: 'Nombre y descripción retirados' }, admin)
    assert.equal((await rpc('get_community')).group.name, 'Grupo moderado')
    const tableReport = await rpc('report_community_content', { p_kind: 'table', p_target: t.id, p_reason: 'other' }, ids.B)
    await rpc('resolve_community_report', { p_report: tableReport, p_action: 'remove', p_resolution: 'Nombre de mesa retirado' }, admin)
    assert.equal((await f.db.query<{ name: string }>('select name from tables where id=$1', [t.id])).rows[0].name, 'Mesa moderada')
    passed.push('novedades, grupos, reseñas privadas y nombres de mesa: evidencia, acceso y retirada')

    for (let i = 0; i < 8; i++) {
      const target = 'eeeeeeee-eeee-4eee-eeee-' + String(i).padStart(12, '0')
      await f.db.query('insert into profiles(id,username) values($1,$2)', [target, 'Perfil aislado ' + i])
      await rpc('report_community_content', { p_kind: 'profile', p_target: target, p_reason: 'spam' })
    }

    const profileReport = await rpc('report_community_content', { p_kind: 'profile', p_target: ids.B, p_reason: 'spam' })
    await assert.rejects(() => rpc('report_community_content', { p_kind: 'profile', p_target: admin, p_reason: 'spam' }), /límite/)
    await rpc('resolve_community_report', { p_report: profileReport, p_action: 'restrict', p_resolution: 'Sanción de ensayo por siete días' }, admin)
    await f.db.exec("update chat_messages set created_at=now()-interval '2 seconds'")
    await assert.rejects(() => rpc('send_chat_message', { p_body: 'Intento sancionado' }, ids.B), /restringida/)
    await assert.rejects(() => rpc('send_friend_request', { p_username: 'Cuenta A' }, ids.B), /restringida/)
    const before = (await rpc('moderation_reports', {}, admin)).find((r: any) => r.id === profileReport).resolved_at
    await rpc('resolve_community_report', { p_report: profileReport, p_action: 'dismiss', p_resolution: 'Reintento no modifica decisión' }, admin)
    assert.equal((await rpc('moderation_reports', {}, admin)).find((r: any) => r.id === profileReport).resolved_at, before)
    await f.db.exec("update community_safety.reports set resolved_at=now()-interval '91 days'; select community_safety.cleanup()")
    assert.equal((await rpc('community_safety_state')).reports.length, 0)
    passed.push('sanción social, decisión inmutable al reintentar y retención efectiva')
    await writeFile('android/generated/android-12-rules.json', JSON.stringify({ environment: 'PGlite SQL aislado, sin usuarios reales', passed }, null, 2))
    console.log('OK', passed.join('; '))
  } finally { await f.db.close() }
}
void main().catch(error => { console.error(error.stack); process.exitCode = 1 })
