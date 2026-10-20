import assert from 'node:assert/strict'
import { rankingMail } from '../src/lib/email/content'

const base = {
  username: 'Santi',
  preferencesUrl: 'https://www.trucazo.com.ar/email/preferencias?token=test',
}

const first = rankingMail({ ...base, oldRank: 2, newRank: 1 })
assert.equal(first.subject, '¡Llegaste al puesto 1 de Trucazo!')
assert.match(first.text, /nuevo líder/i)
assert.match(first.text, /utm_campaign=ranking-top-3/)

const second = rankingMail({ ...base, oldRank: 3, newRank: 2 })
assert.equal(second.subject, '¡Subiste al puesto 2!')
assert.match(second.text, /segundo puesto/i)

const third = rankingMail({ ...base, oldRank: null, newRank: 3 })
assert.equal(third.subject, '¡Entraste al top 3!')
assert.match(third.text, /tercer puesto/i)

const displaced = rankingMail({
  ...base,
  oldRank: 1,
  newRank: 2,
  passedByUsername: 'La Parda',
})
assert.equal(displaced.subject, 'Ahora estás en el puesto 2')
assert.match(displaced.text, /La Parda te pasó/)
assert.match(displaced.text, /Recuperar mi puesto/)

const outside = rankingMail({
  ...base,
  oldRank: 3,
  newRank: null,
  passedByUsername: '<script>alert(1)</script>',
})
assert.equal(outside.subject, 'Te sacaron del top 3')
assert.match(outside.text, /<script>alert\(1\)<\/script> te pasó/)
assert.doesNotMatch(outside.html, /<script>alert\(1\)<\/script>/)
assert.match(outside.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)

console.log('Ranking: contenidos de puestos, descenso, salida, tracking y escape correctos.')
