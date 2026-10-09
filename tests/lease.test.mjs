import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TaskStore} from '../server/store.mjs';
import {createApps,createDeviceStoreProxy} from '../server/index.mjs';
import {createMcp} from '../server/mcp.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {PlanWorker} from '../server/plan-worker.mjs';
import {emptyState,AFFILIATE_URL,DISCLOSURE} from '../extension/model.mjs';

const campaign={...emptyState().campaigns[0]};delete campaign.id;
const compose=key=>({key,kind:'compose',campaign,context:'Tìm gói AI có điều kiện rõ',postKind:'comment'});
const draft=(task,leaseToken,body='Thông tin từ nhà cung cấp.')=>({id:task.id,leaseToken,relevant:true,body});
async function setup(t,now){const directory=await mkdtemp(join(tmpdir(),'linkdesk-lease-test-'));t.after(()=>rm(directory,{recursive:true,force:true}));return new TaskStore(directory,now).load();}
async function mcp(t,store){const server=createMcp(store),client=new Client({name:'lease-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);t.after(async()=>{await client.close();await server.close();});return client;}
async function api(t,store){
  const {device}=await createApps({store,deviceToken:'fixture-device',ownerCode:'fixture-owner'});
  const server=await new Promise(resolve=>{const s=device.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(path,body)=>{const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer fixture-device','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await res.json();if(!res.ok)throw new Error(value.error);return value;};
  return {base,request};
}

test('atomic claim-next has one winner and skips another consumer lease without leaking credentials',async t=>{
  const store=await setup(t),first=await store.enqueue(compose('first'));
  const claims=await Promise.all(Array.from({length:8},(_,i)=>store.claimNext({owner:'consumer-'+i})));
  const winners=claims.filter(Boolean);assert.equal(winners.length,1);assert.equal(winners[0].task.id,first.id);
  const token=winners[0].leaseToken;
  assert.equal(token.length,43);
  await assert.rejects(store.claim(first.id,{owner:winners[0].task.lease.owner}),/đang có lease/);
  const second=await store.enqueue(compose('second'));
  assert.equal((await store.claimNext({owner:'later'})).task.id,second.id);
  const publicOutput=JSON.stringify([store.get(first.id),store.list(),await store.enqueue(compose('first')),store.page()]);
  assert.ok(!publicOutput.includes(token));assert.ok(!publicOutput.includes('tokenHash'));assert.ok(!publicOutput.includes('completionLeaseHash'));
  const persisted=await readFile(join(store.directory,'tasks.json'),'utf8');assert.ok(!persisted.includes(token));assert.ok(persisted.includes('tokenHash'));
});

test('missing or wrong lease cannot submit/renew/release even when owner label matches',async t=>{
  const store=await setup(t),task=await store.enqueue(compose('guard')),claim=await store.claim(task.id,{owner:'same-label'});
  await assert.rejects(store.submit({id:task.id,relevant:true,body:'No lease'}));
  for(const action of ['renew','release'])await assert.rejects(store[action](task.id,{leaseToken:'W'.repeat(43)}),/Lease/);
  await assert.rejects(store.submit(draft(task,'W'.repeat(43))),/Lease/);
  assert.equal(store.get(task.id).status,'pending');
  assert.equal((await store.submit(draft(task,claim.leaseToken))).status,'completed');
});

test('durable lease survives reload, expires at boundary, and fences stale attempts after reclaim',async t=>{
  let now=1000;const store=await setup(t,()=>now),task=await store.enqueue(compose('reload')),old=await store.claim(task.id,{owner:'crashed',ttlMs:15000});
  const recovered=await new TaskStore(store.directory,()=>now).load();
  await assert.rejects(recovered.claim(task.id,{owner:'new'}),/đang có lease/);
  now=old.leaseExpiresAt;
  await assert.rejects(recovered.renew(task.id,{leaseToken:old.leaseToken}),/Lease/);
  const fresh=await recovered.claim(task.id,{owner:'new'});assert.notEqual(fresh.leaseToken,old.leaseToken);
  await assert.rejects(recovered.submit(draft(task,old.leaseToken)),/Lease/);
  await assert.rejects(recovered.release(task.id,{leaseToken:old.leaseToken}),/Lease/);
  assert.equal(recovered.get(task.id).lease.owner,'new');
  await recovered.submit(draft(task,fresh.leaseToken));
});

test('lease renewal is bounded by task expiry and cancelled/expired tasks cannot revive',async t=>{
  let now=1000;const store=await setup(t,()=>now),task=await store.enqueue(compose('ttl'));
  now=task.expiresAt-20000;const claim=await store.claim(task.id,{owner:'ttl',ttlMs:15000});
  now+=5000;assert.equal((await store.renew(task.id,{leaseToken:claim.leaseToken,ttlMs:600000})).leaseExpiresAt,task.expiresAt);
  now=task.expiresAt;assert.equal(store.get(task.id).status,'expired');
  await assert.rejects(store.submit(draft(task,claim.leaseToken)),/hết hạn/);
  await assert.rejects(store.claim(task.id,{owner:'new'}),/hết hạn/);
  const cancelled=await store.enqueue(compose('cancel')),lease=await store.claim(cancelled.id,{owner:'cancel'});await store.cancel(cancelled.id);
  await assert.rejects(store.renew(cancelled.id,{leaseToken:lease.leaseToken}),/hủy/);
  await assert.rejects(store.submit(draft(cancelled,lease.leaseToken)),/hủy/);
  await assert.rejects(store.claim(cancelled.id,{owner:'new'}),/hủy/);
  assert.throws(()=>store.claimNext({owner:'x',ttlMs:600001}));
});

test('completion receipt permits same-token retry after expiry/reload but not a different result or owner',async t=>{
  let now=1000;const store=await setup(t,()=>now),task=await store.enqueue(compose('receipt')),lease=await store.claim(task.id,{owner:'receipt'}),raw=draft(task,lease.leaseToken);
  const [a,b]=await Promise.all([store.submit(raw),store.submit(raw)]);assert.equal(a.status,b.status);assert.equal(a.result.body.split(AFFILIATE_URL).length,2);assert.ok(a.result.body.includes(DISCLOSURE));
  now=task.expiresAt+1;const reloaded=await new TaskStore(store.directory,()=>now).load();assert.equal((await reloaded.submit(raw)).status,'completed');
  await assert.rejects(reloaded.submit({...raw,body:'Different'}),/kết quả khác/);
  await assert.rejects(reloaded.submit({...raw,leaseToken:'W'.repeat(43)}),/không sở hữu/);
  assert.equal(reloaded.get(task.id).lease,undefined);
  assert.ok(!JSON.stringify(reloaded.get(task.id)).includes('completionLeaseHash'));
});

test('released lease is fenced; failed persistence does not commit a claim; idle polling does not write',async t=>{
  const store=await setup(t),task=await store.enqueue(compose('release')),lease=await store.claim(task.id,{owner:'one'});
  await store.release(task.id,{leaseToken:lease.leaseToken});
  const fresh=await store.claim(task.id,{owner:'two'});
  await assert.rejects(store.submit(draft(task,lease.leaseToken)),/Lease/);
  await store.release(task.id,{leaseToken:fresh.leaseToken});
  await mkdir(join(store.directory,'tasks.tmp'));
  await assert.rejects(store.claim(task.id,{owner:'disk-error'}));assert.equal(store.get(task.id).lease,undefined);
  await rm(join(store.directory,'tasks.tmp'),{recursive:true});
  const recovered=await store.claim(task.id,{owner:'okay'});assert.equal(recovered.task.lease.owner,'okay');
  store.mutate=()=>{throw new Error('idle should not write');};assert.equal(await store.claimNext({owner:'idle'}),null);
});

test('identity cursor does not skip pending tasks when earlier rows complete; old offset remains readable',async t=>{
  const store=await setup(t),tasks=[];for(let i=0;i<5;i++)tasks.push(await store.enqueue(compose('page-'+i)));
  const first=store.page('pending',undefined,2);assert.equal(first.nextCursor,tasks[1].id);
  for(const task of tasks.slice(0,2)){const c=await store.claim(task.id,{owner:'page'});await store.submit(draft(task,c.leaseToken));}
  const second=store.page('pending',first.nextCursor,2);assert.deepEqual(second.tasks.map(t=>t.id),tasks.slice(2,4).map(t=>t.id));
  const last=store.page('pending',second.nextCursor,2);assert.deepEqual(last.tasks.map(t=>t.id),[tasks[4].id]);assert.equal(last.nextCursor,null);
  assert.equal(store.list('completed',0,20).length,2);assert.throws(()=>store.page('pending','missing',2),/Cursor/);
});

test('device, stdio proxy and MCP share one lease and cursor contract',async t=>{
  const store=await setup(t),task=await store.enqueue(compose('transport')),second=await store.enqueue(compose('transport-2'));
  const {base,request}=await api(t,store),proxy=createDeviceStoreProxy(request),client=await mcp(t,proxy);
  assert.equal((await fetch(base+'/task-claims',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  const lease=await request('/task-claims',{owner:'device'});
  const collision=await client.callTool({name:'linkdesk_claim_task',arguments:{id:task.id,owner:'mcp'}});assert.equal(collision.isError,true);
  const page=await client.callTool({name:'linkdesk_list_tasks',arguments:{limit:1}});assert.equal(page.structuredContent.nextCursor,task.id);
  const next=await client.callTool({name:'linkdesk_list_tasks',arguments:{cursor:task.id,limit:1}});assert.equal(next.structuredContent.tasks[0].id,second.id);
  await assert.rejects(request('/results',{id:task.id,relevant:true,body:'missing lease'}));
  await proxy.release(task.id,{leaseToken:lease.leaseToken});
  const claim=await client.callTool({name:'linkdesk_claim_task',arguments:{id:task.id,owner:'mcp'}});
  const token=claim.structuredContent.leaseToken;
  await client.callTool({name:'linkdesk_renew_lease',arguments:{id:task.id,leaseToken:token}});
  await assert.rejects(request('/results',draft(task,lease.leaseToken)),/Lease/);
  const completed=await client.callTool({name:'linkdesk_submit_result',arguments:draft(task,token)});assert.equal(completed.structuredContent.status,'completed');
  assert.ok(!JSON.stringify(await proxy.get(task.id)).includes(token));
});

test('two real worker instances share durable claims and only one spends inference budget',async t=>{
  const store=await setup(t);await store.enqueue(compose('workers'));
  const {request}=await api(t,store);let inference=0;
  const response=async()=>{inference++;return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:'{"relevant":true,"body":"Thông tin từ nguồn."}'}]}]}})+'\n\n',{headers:{'content-type':'text/event-stream'}});};
  const configs=[{enabled:true,remaining:2,model:'fixture'},{enabled:true,remaining:2,model:'fixture'}];
  const workers=configs.map(config=>new PlanWorker({config,plan:{access:async()=>'fixture-access'},save:async()=>{},request,fetcher:response}));
  await Promise.all(workers.map(w=>w.tick()));assert.equal(inference,1);assert.equal(configs[0].remaining+configs[1].remaining,3);assert.equal(store.summary().counts.completed,1);
});

test('worker STOP releases its pending lease without submitting or consuming another attempt',async t=>{
  const store=await setup(t),task=await store.enqueue(compose('stop')),{request}=await api(t,store);let finish;
  const config={enabled:true,remaining:2,model:'fixture'};
  const worker=new PlanWorker({config,plan:{access:async()=>'fixture-access'},save:async()=>{},request,fetcher:async()=>{await new Promise(resolve=>finish=resolve);return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:'{"relevant":true,"body":"Draft"}'}]}]}})+'\n\n');}});
  const running=worker.tick();while(!finish)await new Promise(resolve=>setImmediate(resolve));await worker.pause();finish();await running;
  assert.equal(store.get(task.id).status,'pending');assert.equal(store.get(task.id).lease,undefined);assert.equal(config.remaining,1);
  assert.equal((await store.claim(task.id,{owner:'after-stop'})).task.id,task.id);
});

test('worker losing an expired lease cannot submit its draft or release a replacement claim',async t=>{
  let now=1000;const store=await setup(t,()=>now),task=await store.enqueue(compose('stale-worker')),{request}=await api(t,store);
  let replacement;const config={enabled:true,remaining:2,model:'fixture'};
  const worker=new PlanWorker({config,plan:{access:async()=>'fixture'},save:async()=>{},request,fetcher:async()=>{
    now+=300000;replacement=await store.claim(task.id,{owner:'replacement'});
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:'{"relevant":true,"body":"Stale draft"}'}]}]}})+'\n\n');
  }});
  await worker.tick();assert.equal(config.enabled,false);assert.equal(config.remaining,1);assert.equal(store.get(task.id).status,'pending');assert.equal(store.get(task.id).lease.owner,'replacement');
  assert.match(config.lastFailure.message,/Lease/);
  await store.submit(draft(task,replacement.leaseToken,'Replacement draft'));assert.match(store.get(task.id).result.body,/Replacement draft/);
});
