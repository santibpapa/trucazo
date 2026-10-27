import assert from 'node:assert/strict'
import { authDestination, parseAppLink } from '../../../src/lib/auth-links'
const id = '11111111-1111-4111-8111-111111111111'
assert.equal(authDestination('/comunidad'), '/comunidad')
assert.equal(authDestination('/resena?game=' + id), '/resena?game=' + id)
assert.equal(authDestination('/email/preferencias?token=' + id), '/email/preferencias?token=' + id)
assert.equal(parseAppLink('https://www.trucazo.com.ar/comunidad')?.path, '/comunidad')
assert.equal(parseAppLink('https://www.trucazo.com.ar/email/preferencias?token=' + id)?.path, '/email/preferencias?token=' + id)
for (const url of ['https://ajeno.invalid/comunidad', 'https://www.trucazo.com.ar/email/preferencias?token=mal',
  'https://www.trucazo.com.ar/email/preferencias?token=' + id + '&next=https://ajeno.invalid',
  'https://www.trucazo.com.ar/email/preferencias?token=' + id + '&token=' + id,
  'https://www.trucazo.com.ar/comunidad?next=/admin']) assert.equal(parseAppLink(url), null)
console.log('OK enlaces sociales, token de preferencias y destinos ajenos/incompletos rechazados.')
