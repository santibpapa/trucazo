import assert from 'node:assert/strict';
import { imageHandler } from '../supabase/functions/feedback-image/handler.mjs';
import { feedbackImageLinks } from '../src/lib/feedback-images.mjs';
const token = 'a'.repeat(64);
const request = () => new Request('https://example.test/?token=' + token);
let calls = [];
const handler = imageHandler({ origin: 'https://project.supabase.co', secret: 'sb_secret_test', fetcher: async (url, init) => {
  calls.push({ url, init });
  if (url.includes('/rpc/')) return Response.json('owner/image.jpg');
  return new Response(new Uint8Array([255,216,255]), { headers: { 'Content-Type': 'image/jpeg' } });
} });
let result = await handler(request());
assert.equal(result.status,200);
assert.equal(result.headers.get('cache-control'),'no-store');
assert.equal(result.headers.get('content-type'),'image/jpeg');
assert.equal(calls.length,2);
assert.equal(calls[0].init.headers.apikey,'sb_secret_test');
assert.equal(calls[0].init.headers.Authorization,undefined);
assert.equal(JSON.parse(calls[0].init.body).p_token,token);
assert.match(calls[1].url,/feedback-images\/owner\/image.jpg$/);
assert.equal((await handler(new Request('https://example.test/'))).status,403);
assert.equal((await handler(new Request('https://example.test/?token=wrong'))).status,403);
assert.equal((await handler(new Request('https://example.test/',{method:'POST'}))).status,405);
assert.equal(calls.length,2);
for (const [response,status] of [[Response.json(null),403],[new Response('',{status:500}),503]]) {
  let attempts=0;
  const denied=imageHandler({origin:'https://example.test',secret:'legacy',fetcher:async()=>{attempts++;return response;}});
  assert.equal((await denied(request())).status,status);
  assert.equal(attempts,1); // No toca Storage si no autorizó el ticket.
}
let unsafeCalls=0;
const unsafePath=imageHandler({origin:'https://example.test',secret:'legacy',fetcher:async()=>{unsafeCalls++;return Response.json('owner/../../other');}});
assert.equal((await unsafePath(request())).status,403);
assert.equal(unsafeCalls,1);
const badImage=imageHandler({origin:'https://example.test',secret:'legacy',fetcher:async(url,init)=>{
  assert.equal(init.headers.Authorization,'Bearer legacy');
  return url.includes('/rpc/') ? Response.json('owner/file.svg') : new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}});
}});
assert.equal((await badImage(request())).status,415);
const unavailable=imageHandler({origin:'https://example.test',secret:'legacy',fetcher:async()=>{throw Error('private');}});
assert.equal((await unavailable(request())).status,503);
const store={createSignedUrl:async(p,ttl)=>{assert.equal(ttl,604800);return p==='ok'?{data:{signedUrl:'https://signed.test'},error:null}:{data:null,error:Error('denied')};}};
assert.equal(await feedbackImageLinks(store,[]),'(ninguna)');
assert.equal(await feedbackImageLinks(store,['ok']),'https://signed.test');
assert.match(await feedbackImageLinks(store,['ok','bad']),/^https:\/\/signed.test\nCaptura 2: guardada; enlace no disponible/);
assert.match(await feedbackImageLinks({createSignedUrl:async()=>{throw Error('network');}},['bad']),/guardada; enlace no disponible/);
console.log('Capturas: enlaces de correo, autenticación, privacidad y fallos aprobados.');
