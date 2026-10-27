// Retira sólo la invitación/amistad que creó ANDROID-13; ingreso normal con QA1.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts(), test = JSON.parse(await readFile('android/generated/android-13-real-invitation.json', 'utf8'))
const a = saved.accounts.find(account => account.id === test.from)
assert.ok(a && test.to === saved.registrationAccount.id)
const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
try {
  assert.equal((await client.auth.signInWithPassword({ email: a.email, password: a.password })).error, null)
  const rpc = async (name, body = {}) => { const r = await client.rpc(name, body); assert.equal(r.error, null); return r.data }
  let state = await rpc('get_community')
  if (state.invite_out?.invite_id === test.invite_id) await rpc('cancel_game_invite', { p_invite_id: test.invite_id })
  state = await rpc('get_community')
  assert.ok(state.invite_out?.invite_id !== test.invite_id)
  const friendship = state.friends.find(friend => friend.user_id === test.to)
  if (!test.friendshipExisted && friendship) await rpc('remove_friend', { p_friendship_id: friendship.friendship_id })
  state = await rpc('get_community')
  if (!test.friendshipExisted) assert.ok(!state.friends.some(friend => friend.user_id === test.to))
  const table = await client.from('tables').select('id').eq('id', test.table_id)
  assert.equal(table.error, null); assert.equal(table.data.length, 0)
  await writeFile('android/generated/android-13-cleanup.json', JSON.stringify({ invitationGone: true, testTableGone: true, previousFriendshipStateRestored: true, noGamePlayed: true }, null, 2))
  console.log('OK invitación/mesa QA retiradas y amistad previa restaurada; sin jugar ni modificar Historia.')
} finally { await client.auth.signOut({ scope: 'local' }) }
