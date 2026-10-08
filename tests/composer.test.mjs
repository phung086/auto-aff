import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskStore } from '../server/store.mjs';
import { createApps } from '../server/index.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcp } from '../server/mcp.mjs';
import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { emptyState, reducer, importState, AFFILIATE_URL, DISCLOSURE } from '../extension/model.mjs';
import { brokerRequest, completedResult } from '../extension/composer.mjs';

const campaign={...emptyState().campaigns[0]};delete campaign.id;
const compose=key=>({key,kind:'compose',campaign,context:'Tôi cần công cụ AI hỗ trợ lập trình',postKind:'comment'});
async function tempStore(t,now) {const directory=await mkdtemp(join(tmpdir(),'linkdesk-test-'));t.after(()=>rm(directory,{recursive:true,force:true}));return new TaskStore(directory,now).load();}
async function listen(t,app){const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}`;}
// Native HTTP retains an explicit Host for testing proxy and DNS-rebind guards.
// Node fetch intentionally overrides Host, so it cannot exercise that scenario.
const hostFetch = (url, options={}) => new Promise((done,fail)=>{const req=httpRequest(url,{method:options.method||'GET',headers:options.headers instanceof Headers?Object.fromEntries(options.headers):options.headers||{}},res=>{const parts=[];res.on('data',chunk=>parts.push(chunk));res.on('end',()=>done(new Response(Buffer.concat(parts),{status:res.statusCode,headers:res.headers})));});req.on('error',fail);if(options.body)req.write(options.body);req.end();});
test('broker survives reload, concurrent requests dedupe and mismatched reuse fails',async t=>{
  const store=await tempStore(t);const tasks=await Promise.all(Array.from({length:6},()=>store.enqueue(compose('same'))));assert.equal(new Set(tasks.map(t=>t.id)).size,1);
  await assert.rejects(store.enqueue({...compose('same'),context:'changed'}),/nội dung khác/);
  const reloaded=await new TaskStore(store.directory).load();assert.equal(reloaded.list().length,1);assert.equal(reloaded.get(tasks[0].id).campaign.link,AFFILIATE_URL);
});
test('broker rejects model URLs, preserves raw link, accepts identical result only',async t=>{
  const store=await tempStore(t),task=await store.enqueue(compose('result'));
  await assert.rejects(store.submit({id:task.id,relevant:true,body:'Xem HTTPS://evil.invalid/'}),/URL/);
  const result={id:task.id,relevant:true,body:'Bạn có thể xem các gói công cụ phù hợp.'};await Promise.all([store.submit(result),store.submit(result)]);
  const output=completedResult(store.get(task.id));assert.equal(output.body.split(AFFILIATE_URL).length,2);assert.ok(output.body.includes(DISCLOSURE));
  await assert.rejects(store.submit({...result,body:'different'}),/kết quả khác/);
});
test('cancel and expiry reject late results; failed writes do not alter committed state',async t=>{
  let now=10000;const store=await tempStore(t,()=>now),cancelled=await store.enqueue(compose('cancel')),expired=await store.enqueue(compose('expire'));
  await store.cancel(cancelled.id);await assert.rejects(store.submit({id:cancelled.id,relevant:false,body:''}),/hủy/);
  now+=31*60000;assert.equal(store.get(expired.id).status,'expired');await assert.rejects(store.submit({id:expired.id,relevant:true,body:'body'}),/hết hạn/);
  assert.deepEqual(store.summary().counts,{pending:0,completed:0,cancelled:1,expired:1});
});
test('source analysis uses saved original link and rejects model-supplied URLs',async t=>{
  const store=await tempStore(t),link='https://example.com/?b=2&a=%2f&ref=ExactCASE';
  const task=await store.enqueue({key:'analyze',kind:'analyze',link,source:'Thông tin nguồn đã cung cấp'});
  await assert.rejects(store.submit({id:task.id,campaign:{name:'X',product:'Y',benefit:'HTTPS://evil.invalid',keywords:'AI'}}),/URL/);
  await store.submit({id:task.id,campaign:{name:'X',product:'Y',benefit:'Theo nhà cung cấp, hỗ trợ công cụ AI.',keywords:'AI'}});
  assert.equal(completedResult(store.get(task.id)).campaign.link,link);
});
test('device API blocks missing token and bad Host; valid local calls enqueue once',async t=>{
  const store=await tempStore(t),token='T'.repeat(43),{device}=await createApps({store,deviceToken:token,ownerCode:'owner'}),base=await listen(t,device);
  assert.equal((await fetch(base+'/health')).status,401);
  assert.equal((await hostFetch(base+'/health',{headers:{Authorization:`Bearer ${token}`,Host:'evil.invalid'}})).status,403);
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/health',{headers})).status,200);
  const task=await (await fetch(base+'/tasks',{method:'POST',headers,body:JSON.stringify(compose('device'))})).json();assert.equal(task.status,'pending');
});
test('extension refuses non-loopback pairing and redirects; token only in header',async()=>{
  await assert.rejects(brokerRequest({url:'https://evil.invalid',token:'T'.repeat(43)},'/health'),/pairing/);
  let seen;await brokerRequest({url:'http://127.0.0.1:8787',token:'T'.repeat(43)},'/health',undefined,async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({ok:true})};});
  assert.equal(seen.options.redirect,'error');assert.equal(seen.url.includes('TTTT'),false);assert.equal(seen.options.headers.Authorization,'Bearer '+'T'.repeat(43));
});
test('MCP SDK handshake, tools, structured pagination and valid compose result',async t=>{
  const store=await tempStore(t);const first=await store.enqueue(compose('mcp1'));await store.enqueue(compose('mcp2'));
  const server=createMcp(store),client=new Client({name:'test',version:'1.0'});const [left,right]=InMemoryTransport.createLinkedPair();await server.connect(left);await client.connect(right);t.after(async()=>{await client.close();await server.close();});
  const tools=(await client.listTools()).tools;assert.equal(tools.length,4);assert.equal(tools.find(t=>t.name==='linkdesk_submit_result').annotations.readOnlyHint,false);
  const list=await client.callTool({name:'linkdesk_list_tasks',arguments:{offset:1,limit:1}});assert.equal(list.structuredContent.tasks.length,1);assert.notEqual(list.structuredContent.tasks[0].id,first.id);
  const written=await client.callTool({name:'linkdesk_submit_result',arguments:{id:first.id,relevant:true,body:'Thông tin có thể phù hợp với nhu cầu của bạn.'}});assert.equal(written.structuredContent.status,'completed');
  const summary=await client.callTool({name:'linkdesk_queue_summary',arguments:{}});assert.equal(summary.structuredContent.counts.completed,1);
});
test('OAuth requires owner consent, PKCE, resource/client binding and one-use code',async t=>{
  const store=await tempStore(t),origin='https://linkdesk.example',{remote,provider}=await createApps({store,deviceToken:'T'.repeat(43),ownerCode:'owner',publicOrigin:origin}),base=await listen(t,remote);
  const call=(path,options={})=>hostFetch(base+path,{redirect:'manual',...options,headers:{Host:'linkdesk.example',...(options.headers||{})}});
  const metadata=await call('/.well-known/oauth-protected-resource/mcp');assert.equal(metadata.status,200);
  assert.equal((await call('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  const registered=await call('/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({redirect_uris:['https://chatgpt.com/callback'],token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code'],client_name:'Test client'})});assert.equal(registered.status,201);const c=await registered.json();
  const verifier='a'.repeat(43),challenge=createHash('sha256').update(verifier).digest('base64url');
  const authorize=await call('/authorize?'+new URLSearchParams({client_id:c.client_id,redirect_uri:c.redirect_uris[0],response_type:'code',code_challenge:challenge,code_challenge_method:'S256',scope:'compose',resource:origin+'/mcp',state:'exact-state'}));assert.equal(authorize.status,200);
  assert.match(authorize.headers.get('content-security-policy'),/form-action 'self' https:\/\/chatgpt\.com;/);
  const html=await authorize.text(),nonce=html.match(/name="nonce" value="([^"]+)"/)[1];assert.throws(()=>provider.consent(nonce,'wrong'));
  const consent=from=>call('/consent',{method:'POST',headers:{Origin:from,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({nonce,code:'owner'}).toString()});
  assert.equal((await consent('https://evil.invalid')).status,403);
  const allowed=await consent(origin);assert.equal(allowed.status,303);
  const callback=new URL(allowed.headers.get('location'));assert.equal(callback.searchParams.get('state'),'exact-state');const code=callback.searchParams.get('code');
  await assert.rejects(provider.challengeForAuthorizationCode({...c,client_id:'other-client'},code));
  await assert.rejects(provider.exchangeAuthorizationCode(c,code,undefined,'https://evil.invalid/callback',new URL(origin+'/mcp')));
  await assert.rejects(provider.exchangeAuthorizationCode(c,code,undefined,c.redirect_uris[0],new URL('https://evil.invalid/mcp')));
  const exchange=v=>call('/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:c.client_id,code,code_verifier:v,redirect_uri:c.redirect_uris[0],resource:origin+'/mcp'}).toString()});
  assert.equal((await exchange('b'.repeat(43))).status,400);const granted=await exchange(verifier);assert.equal(granted.status,200);const tokens=await granted.json();assert.equal((await provider.verifyAccessToken(tokens.access_token)).scopes[0],'compose');assert.equal((await exchange(verifier)).status,400);
  await provider.revokeToken(c,{token:tokens.access_token});await assert.rejects(provider.verifyAccessToken(tokens.access_token));
});
test('stateless Streamable HTTP responds to authenticated SDK initialize/list/call',async t=>{
  const store=await tempStore(t),origin='https://linkdesk.example',{remote,provider}=await createApps({store,deviceToken:'T'.repeat(43),ownerCode:'owner',publicOrigin:origin}),base=await listen(t,remote);
  provider.tokens.set('test-access',{clientId:'test',scopes:['compose'],expiresAt:Math.floor(Date.now()/1000)+60,resource:new URL(origin+'/mcp')});
  const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp'),{requestInit:{headers:{Host:'linkdesk.example',Authorization:'Bearer test-access'}},fetch:hostFetch});const client=new Client({name:'http-test',version:'1.0'});t.after(()=>client.close());
  await client.connect(transport);assert.equal((await client.listTools()).tools.length,4);const summary=await client.callTool({name:'linkdesk_queue_summary',arguments:{}});assert.equal(summary.structuredContent.total,0);
});
test('reports reject changed links, invalid dates and negatives; backups preserve historical snapshot',()=>{
  let state=emptyState();const data={campaignId:'agentshop247',link:AFFILIATE_URL,source:'Supplier dashboard',periodStart:'2026-10-01',periodEnd:'2026-10-08',clicks:12};
  assert.throws(()=>reducer(state,{type:'IMPORT_REPORT',data:{...data,link:AFFILIATE_URL+'x'}}));assert.throws(()=>reducer(state,{type:'IMPORT_REPORT',data:{...data,clicks:-1}}));assert.throws(()=>reducer(state,{type:'IMPORT_REPORT',data:{...data,periodStart:'2026-02-30'}}));
  state=reducer(state,{type:'IMPORT_REPORT',data});assert.throws(()=>reducer(state,{type:'IMPORT_REPORT',data}));
  state=reducer(state,{type:'SAVE_CAMPAIGN',data:{...state.campaigns[0],link:'https://example.com/?ref=new'}});
  const restored=importState(state);assert.equal(restored.reports[0].link,AFFILIATE_URL);assert.equal(restored.reports[0].clicks,12);assert.equal(restored.settings.aiProvider,'chatgpt');
});
