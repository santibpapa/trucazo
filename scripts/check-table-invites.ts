import assert from 'node:assert/strict'
import test from 'node:test'
import { invitationPath, invitationAuthLink, authDestination } from '../src/lib/table-invites'
import { loginDestination } from '../src/lib/android-entry'

const token = 'faf00100-0000-4000-a000-000000000001'
const next = `/invitar/${token}`

test('clave opaca normalizada y destino local estricto', () => {
  assert.equal(invitationPath(token.toUpperCase()), next)
  assert.equal(invitationPath(next), next)
  assert.equal(authDestination(next), next)
  for (const value of [null, undefined, [], {}, '', '/invitar/ABC123', `//evil.test${next}`,
    `https://evil.test${next}`, `${next}/extra`, `${next}?redirect=evil`, `${next}#extra`,
    `/invitar/%2f${token}`, `/invitar/../${token}`, `/invitar/${token}\n`]) {
    assert.equal(invitationPath(value), null, String(value))
    assert.equal(authDestination(value), '/lobby', String(value))
  }
  assert.equal(authDestination('/android'), '/android')
  assert.equal(authDestination('/eliminar-cuenta'), '/eliminar-cuenta')
  assert.equal(invitationAuthLink('/login', next), `/login?next=${encodeURIComponent(next)}`)
  assert.equal(invitationAuthLink('/register', 'https://evil.test'), '/register')
})

test('email y registro vuelven a la invitación, sin aceptar destinos externos', () => {
  const location = { pathname: '/login', search: `?next=${encodeURIComponent(next)}` }
  Object.assign(globalThis, { window: { location }, document: { referrer: '', cookie: '' }, sessionStorage: { getItem: () => null } })
  try {
    assert.equal(loginDestination(), next)
    location.search = '?next=https://evil.test'
    assert.equal(loginDestination(), '/lobby')
    location.search = '?android=1'
    Object.assign(globalThis, { sessionStorage: { getItem: () => null, setItem: () => undefined } })
    assert.equal(loginDestination(), '/android')
  } finally {
    for (const key of ['window', 'document', 'sessionStorage']) Reflect.deleteProperty(globalThis, key)
  }
})
