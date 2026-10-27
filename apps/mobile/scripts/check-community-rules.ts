import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { communityFixture } from './community-fixture'
import { ids } from './online-fixture'

async function main() {
  const f = await communityFixture(), passed: string[] = []
  const community = (id: string) => f.rpc('get_community', {}, id)
  try {
    await assert.rejects(() => f.rpc('send_friend_request', { p_username: 'Cuenta A' }, ids.A))
    await f.rpc('send_friend_request', { p_username: 'Cuenta B' }, ids.A)
    const incoming = (await community(ids.B)).incoming[0].friendship_id
    await assert.rejects(() => f.rpc('respond_friend_request', { p_friendship_id: incoming, p_accept: true }, ids.bot))
    await f.rpc('respond_friend_request', { p_friendship_id: incoming, p_accept: true }, ids.B)
    assert.equal((await community(ids.A)).friends[0].username, 'Cuenta B')
    await f.rpc('touch_online', {}, ids.B)
    assert.equal((await community(ids.A)).friends[0].online, true)
    await f.db.query("update user_presence set last_seen_at=now()-interval '80 seconds' where user_id=$1", [ids.B])
    assert.equal((await community(ids.A)).friends[0].online, false)
    passed.push('amistad, identidad y presencia 75s')
    await f.rpc('create_group', { p_name: 'ANDROID-11 aislado', p_description: 'QA' }, ids.A)
    await f.rpc('invite_to_group', { p_friend_id: ids.B }, ids.A)
    await f.rpc('respond_group_invite', { p_invite_id: (await community(ids.B)).group_invites_in[0].invite_id, p_accept: true }, ids.B)
    assert.equal((await community(ids.B)).group.members.length, 2)
    await f.rpc('delete_group', {}, ids.B)
    assert.equal((await community(ids.A)).group.members.length, 2)
    await assert.rejects(() => f.rpc('kick_group_member', { p_user_id: ids.A }, ids.B))
    await f.rpc('leave_group', {}, ids.B)
    assert.equal((await community(ids.B)).group, null)
    await f.rpc('delete_group', {}, ids.A)
    passed.push('grupos, invitación, salida y rol líder')
    await f.rpc('send_chat_message', { p_body: 'Prueba aislada ' + 'a'.repeat(400) }, ids.A)
    assert.equal((await f.db.query<{ body: string }>('select body from chat_messages')).rows[0].body.length, 300)
    await assert.rejects(() => f.rpc('send_chat_message', { p_body: 'Demasiado pronto' }, ids.A), /esper/)
    const message = (await f.db.query<{ id: string }>('select id from chat_messages')).rows[0].id
    await assert.rejects(() => f.rpc('delete_chat_message', { p_id: message }, ids.B))
    await assert.rejects(() => f.rpc('clear_chat', {}, ids.B))
    await f.rpc('delete_chat_message', { p_id: message }, ids.A)
    assert.equal((await f.db.query('select * from chat_messages')).rows.length, 0)
    await assert.rejects(() => f.rpc('send_chat_message', { p_body: ' ' }, ids.B))
    passed.push('chat: 300 caracteres, frecuencia, vacío, borrado y admin')
    await assert.rejects(() => f.rpc('publish_news', { p_title: 'No admin', p_body: 'No' }, ids.B))
    await f.db.query('update profiles set is_admin=true where id=$1', [ids.A])
    await f.rpc('publish_news', { p_title: 'Sólo local', p_body: 'Sin campañas ni destinatarios' }, ids.A)
    const news = (await f.db.query<{ id: string }>('select id from news')).rows[0].id
    await f.rpc('delete_news', { p_id: news }, ids.A)
    await f.rpc('clear_chat', {}, ids.A)
    passed.push('novedades y limpieza por administrador')
    await writeFile('android/generated/android-11-rules.json', JSON.stringify({ scope: 'SQL vigente PGlite aislado; no certifica Realtime remoto', passed }, null, 2))
    console.log('OK', passed.join('; '))
  } finally { await f.db.close() }
}
void main().catch(error => { console.error(error.stack); process.exitCode = 1 })
