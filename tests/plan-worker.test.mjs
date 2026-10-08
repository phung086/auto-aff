import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ChatGPTPlan,completedResponse } from '../server/chatgpt-plan.mjs';
import { PlanWorker,parseDraft,taskPrompt,workerStatus } from '../server/plan-worker.mjs';

const link='https://agentshop247.com/?ref=AS362560C5A713';
const task={id:randomUUID(),kind:'compose',status:'pending',campaign:{name:'AI',product:'Claude',benefit:'Theo nguồn',keywords:'AI',link,source:'Nguồn'},context:'Tôi cần tìm tài khoản AI',postKind:'comment'};
const sse=(...events)=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join(''),{headers:{'content-type':'text/event-stream'}});
const done=text=>({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text}]}]}});

test('overlong analysis is rewritten once within budget, never silently truncated',async()=>{
  const analysis={id:randomUUID(),kind:'analyze',status:'pending',link,source:'Tài khoản AI',extra:''};
  const campaign={name:'AI',product:'x'.repeat(301),benefit:'Theo nguồn',keywords:'AI'};
  let calls=0,submitted;const config={enabled:true,remaining:2,model:'m'};
  const worker=new PlanWorker({plan:{access:async()=>'t'},config,save:async()=>{},request:async(p,b)=>p.startsWith('/tasks?')?{tasks:[analysis]}:p==='/results'?(submitted=b,{}):analysis,fetcher:async(u,o)=>{
    calls++;const body=JSON.parse(o.body);assert.match(body.instructions,/product tối đa 300/);
    if(calls===2)assert.match(body.instructions,/Lượt trước vượt/);
    return sse(done(JSON.stringify({campaign:{...campaign,product:calls===1?campaign.product:'Tài khoản AI'}})));
  }});
  await worker.tick();assert.equal(calls,2);assert.equal(config.remaining,0);assert.equal(submitted.campaign.product,'Tài khoản AI');
  await worker.tick();assert.equal(config.enabled,false);assert.equal(calls,2);
});

test('invalid analysis stops after one rewrite and exposes only a bounded task error',async()=>{
  const analysis={id:randomUUID(),kind:'analyze',status:'pending',link,source:'Tài khoản AI',extra:''};
  let calls=0,submits=0;const config={enabled:true,remaining:5,model:'m'};
  const worker=new PlanWorker({plan:{access:async()=>'t'},config,save:async()=>{},request:async(p)=>p.startsWith('/tasks?')?{tasks:[analysis]}:p==='/results'?(submits++,{}):analysis,fetcher:async()=>{calls++;return sse(done(JSON.stringify({campaign:{name:'AI',product:'x'.repeat(301),benefit:'Nguồn',keywords:'AI'}})));}});
  await worker.tick();await worker.tick();assert.equal(calls,2);assert.equal(submits,0);assert.equal(config.enabled,false);assert.equal(config.remaining,3);
  const status=workerStatus(worker);assert.equal(status.failure.taskId,analysis.id);assert.match(status.failure.message,/vượt giới hạn/);assert.deepEqual(Object.keys(status).sort(),['busy','enabled','failure','message','remaining']);
  config.enabled=true;config.remaining=1;calls=0;await worker.tick();assert.equal(calls,1);assert.equal(config.remaining,0);
});
test('plan stream refuses partial, failed and incomplete responses; waits for completion',async()=>{
  const delta={type:'response.output_text.delta',delta:'partial'};
  await assert.rejects(completedResponse(async()=>sse(delta),'t',{}),/response.completed/);
  await assert.rejects(completedResponse(async()=>sse(delta,{type:'response.failed'}),'t',{}),/chưa hoàn tất/);
  await assert.rejects(completedResponse(async()=>sse(done('ok'),{type:'response.incomplete'}),'t',{}),/chưa hoàn tất/);
  let sent;assert.equal(await completedResponse(async(u,o)=>{sent=JSON.parse(o.body);assert.equal(u,'https://api.openai.com/v1/responses');return sse(delta,done('final'));},'t',{model:'allowed',input:[]}), 'final');
  assert.equal(sent.store,false);assert.equal(sent.stream,true);
});
test('plan parser forbids AI IDs, extra fields and URLs; preserves original link through contracts',()=>{
  const valid=parseDraft(task,JSON.stringify({relevant:true,body:'Bạn có thể xem thông tin sản phẩm.'}));assert.equal(valid.id,task.id);
  assert.throws(()=>parseDraft(task,JSON.stringify({...valid,id:randomUUID()})),/quyết định ID/);
  assert.throws(()=>parseDraft(task,JSON.stringify({relevant:true,body:'Mua https://wrong.invalid'})),/URL/);
  assert.throws(()=>parseDraft(task,JSON.stringify({relevant:true,body:'Text',target:'Facebook'})));
  assert.ok(!taskPrompt(task).input[0].content.includes(link));
  assert.throws(()=>parseDraft(task,JSON.stringify({relevant:true,body:'word '.repeat(71)})),/giới hạn từ/);
});
test('OAuth callback rejects state, changed client and account identity before replacing credentials',async()=>{
  const p=new ChatGPTPlan('unused',{verify:async()=>({payload:{sub:'other',nonce:p.pending?.nonce}})});p.save=async()=>{};
  p.begin('http://127.0.0.1:8791/auth/callback');const first=p.pending;
  await assert.rejects(p.callback({state:'wrong',code:'c',client_id:'issued'}),/không khớp/);assert.equal(p.pending,first);
  await assert.rejects(p.callback({state:first.state,code:'c',client_id:'dynamic_agent_client'}),/chưa hoàn tất/);
  p.data.accounts=[{clientId:'issued',subject:'saved'}];p.begin('http://127.0.0.1:8791/auth/callback','issued');let state=p.pending.state;
  await assert.rejects(p.callback({state,code:'c',client_id:'changed'}),/chưa hoàn tất/);
  p.begin('http://127.0.0.1:8791/auth/callback','issued');state=p.pending.state;
  p.tokenRequest=async()=>({id_token:'i',scope:'openid',access_token:'a',expires_in:3600});p.verify=async()=>({payload:{sub:'other',nonce:'n'}});
  await assert.rejects(p.callback({state,code:'c'}),/không khớp/);assert.equal(p.data.accounts[0].subject,'saved');
});
test('refresh serialization uses issued client and rotating token; missing scope prevents inference',async()=>{
  const p=new ChatGPTPlan('unused');p.save=async()=>{};p.data.active='issued';p.data.accounts=[{clientId:'issued',accessToken:'old',refreshToken:'refresh',expiresAt:0,scopes:['chatgpt.tokens.use.direct']}];let n=0;
  p.tokenRequest=async f=>{n++;assert.equal(f.client_id,'issued');assert.equal(f.refresh_token,'refresh');await new Promise(r=>setImmediate(r));return {access_token:'new',refresh_token:'replacement',expires_in:3600};};
  assert.deepEqual(await Promise.all([p.access(),p.access()]),['new','new']);assert.equal(n,1);assert.equal(p.account().refreshToken,'replacement');
  p.account().scopes=['openid'];await assert.rejects(p.access(),/cấp quyền/);
});
test('worker cannot submit after STOP or task cancellation; error pauses instead of retry loop',async()=>{
  let submit=0,release;const config={enabled:true,remaining:2,model:'m'};
  const request=async(path,body)=>path.startsWith('/tasks?')?{tasks:[task]}:path==='/results'?(submit++,{}):task;
  const worker=new PlanWorker({plan:{access:async()=>'t'},request,config,save:async()=>{},fetcher:async()=>{await new Promise(r=>release=r);return sse(done('{"relevant":true,"body":"Test"}'));}});
  const running=worker.tick();while(!release)await new Promise(r=>setImmediate(r));await worker.pause();release();await running;assert.equal(submit,0);assert.equal(config.remaining,1);
  config.enabled=true;worker.fetcher=async()=>sse({type:'response.failed'});await worker.tick();assert.equal(config.enabled,false);assert.equal(submit,0);assert.equal(config.remaining,0);
  config.enabled=true;config.remaining=1;worker.fetcher=async()=>sse(done('{"relevant":true,"body":"Test"}'));let reads=0;worker.request=async p=>p.startsWith('/tasks?')?{tasks:[task]}:p==='/results'?(submit++,{}):{...task,status:++reads===1?'pending':'cancelled'};await worker.tick();assert.equal(submit,0);
});
