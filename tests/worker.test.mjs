import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, reducer, renderTemplate, TEMPLATES, AFFILIATE_URL } from '../extension/model.mjs';
let local = {}, session = {}, listener, alarmListener, calls = 0;
const store = which => ({ get: async key => structuredClone(which()), set: async values => Object.assign(which(), structuredClone(values)), remove: async key => { delete which()[key]; } });
globalThis.chrome = {
  storage: { local: store(() => local), session: store(() => session) },
  runtime: { id: 'test', getURL: p => `chrome-extension://test/${p}`, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener(fn) { listener = fn; } } },
  alarms: { get: async () => true, create: async () => {}, onAlarm: { addListener(fn) { alarmListener = fn; } } },
  permissions: { contains: async () => true },
  tabs: { create: async () => ({ id: 1 }), get: async () => ({ status: 'complete', url: 'https://www.facebook.com/groups/123/posts/456/' }), remove: async () => {} },
  scripting: { executeScript: async () => { throw new Error('Unexpected browser action in worker test'); } }
};
globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ id: '123_456' }) }; };
await import('../extension/background.js');
const msg = message => new Promise(resolve => listener(message, { id: 'test', url: 'chrome-extension://test/dashboard.html' }, resolve));
function setupPage() {
  let state = emptyState();
  state = reducer(state, { type: 'SAVE_DESTINATION', data: { id: 'page', name: 'Test page', kind: 'page', pageId: '123' } });
  state = reducer(state, { type: 'SAVE_SETTINGS', data: { apiVersion: 'v99.0' } });
  state = reducer(state, { type: 'ADD_JOB', data: { campaignId: 'agentshop247', destinationId: 'page', body: renderTemplate(state.campaigns[0], TEMPLATES[1].body) } });
  state = reducer(state, { type: 'REVIEW_JOB', id: state.jobs[0].id, approved: true });
  local = { state }; session = { connection: { pageId: '123', name: 'Test page', token: 'mock-secret' }, aiKey: 'fake-ai-key' }; calls = 0;
  return state.jobs[0].id;
}
test('concurrent clicks publish once and public GET never leaks tokens', async () => {
  const id = setupPage();
  const result = await Promise.all([msg({ type: 'PUBLISH', id }), msg({ type: 'PUBLISH', id })]);
  assert.equal(result.filter(r => r.ok).length, 1); assert.equal(calls, 1);
  assert.equal(local.state.jobs[0].status, 'published');
  const publicData = JSON.stringify(await msg({ type: 'GET' }));
  assert.equal(publicData.includes('mock-secret'), false); assert.equal(publicData.includes('fake-ai-key'), false);
});
test('blocks a changed referral link before reaching Facebook', async () => {
  const id = setupPage(); local.state.jobs[0].body = local.state.jobs[0].body.replace(AFFILIATE_URL, AFFILIATE_URL + 'x');
  const result = await msg({ type: 'PUBLISH', id });
  assert.equal(result.ok, false); assert.equal(calls, 0);
});
test('an interrupted publishing record becomes uncertain and cannot resend', async () => {
  const id = setupPage(); local.state.jobs[0].status = 'publishing';
  const result = await msg({ type: 'GET' }); assert.equal(result.state.jobs[0].status, 'uncertain');
  assert.equal((await msg({ type: 'PUBLISH', id })).ok, false); assert.equal(calls, 0);
});
test('runner processes an approved Page queue and stops at the configured cap', async () => {
  setupPage();
  assert.equal((await msg({ type: 'START_RUNNER', config: { mode: 'queue', campaignId: 'agentshop247', destinationIds: ['page'], maxPosts: 1 } })).ok, true);
  for (let i = 0; i < 30 && local.state.runner.running; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(local.state.runner.running, false); assert.equal(local.state.runner.completed, 1); assert.equal(calls, 1);
});
test('ChatGPT runner needs no AI key and STOP cancels pending content without a Page send', async () => {
  setupPage();
  session.aiKey = undefined; session.composer = {url:'http://127.0.0.1:8787',token:'T'.repeat(43)};
  const taskId='00000000-0000-4000-8000-000000000001';let task, cancelled=false, graphCalls=0;
  globalThis.fetch=async(url,options)=>{if(url.includes('graph.facebook.com')){graphCalls++;throw new Error('Unexpected publish');}if(url.endsWith('/cancel')){cancelled=true;return {ok:true,json:async()=>({...task,status:'cancelled'})};}if(options.method==='POST'){task={...JSON.parse(options.body),id:taskId,status:'pending'};return {ok:true,json:async()=>task};}return {ok:true,json:async()=>task};};
  const result=await msg({type:'START_RUNNER',config:{mode:'discover',campaignId:'agentshop247',destinationIds:['page'],maxPosts:1}});assert.equal(result.ok,true);
  for(let i=0;i<40&&!local.state.runner.aiTaskId;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(local.state.runner.aiTaskId,taskId);assert.equal(local.state.runner.running,true);assert.match(local.state.runner.message,/chờ ChatGPT/);assert.equal(graphCalls,0);
  await msg({type:'STOP_RUNNER'});assert.equal(cancelled,true);await alarmListener({name:'linkdesk-tick'});assert.equal(local.state.runner.running,false);assert.equal(graphCalls,0);
  const publicData=JSON.stringify(await msg({type:'GET'}));assert.equal(publicData.includes('T'.repeat(43)),false);
});
