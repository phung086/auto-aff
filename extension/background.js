import { emptyState, reducer, importState, assertLink, httpUrl, postTarget, canFill } from './model.mjs';
import { graphRequest } from './facebook.mjs';
import { analyzeSource, generateBody } from './ai.mjs';
import { readBrowserPage, scanGroup, prepareAutoComment, submitAutoComment, discoverGroups, requestGroupJoin } from './browser.mjs';
import { brokerRequest, pairingConfig, campaignPayload, completedResult, localWorkerStatus, pendingWorkerState, recoverAnalysis } from './composer.mjs';

let serial = Promise.resolve(), tickBusy = false;
const activeJobs = new Set();
const enqueue = task => { const next = serial.then(task, task); serial = next.catch(() => {}); return next; };
const readState = async () => {
  const stored = (await chrome.storage.local.get('state')).state;
  if (!stored) return emptyState();
  return { ...emptyState(), ...stored, settings: { ...emptyState().settings, ...stored.settings } };
};
const saveState = state => chrome.storage.local.set({ state });
const update = task => enqueue(async () => { const state = await readState(); const result = await task(state); await saveState(state); return result; });
const sessions = () => chrome.storage.session.get(['connection', 'aiKey', 'composer']);
const publicSession = s => ({ connection: s.connection ? { pageId: s.connection.pageId, name: s.connection.name } : null, aiConnected: Boolean(s.aiKey), composerPaired: Boolean(s.composer) });
async function cancelRunnerTask() { const state = await readState(), session = await sessions(); const id = state.runner?.aiTaskId; if (id && session.composer) await brokerRequest(session.composer, `/tasks/${id}/cancel`, {}).catch(() => {}); }
async function recoverInterrupted() {
  return enqueue(async () => {
    const state = await readState(); let changed = false;
    for (const j of state.jobs) if (j.status === 'publishing' && !activeJobs.has(j.id)) { j.status = 'uncertain'; j.error = 'Lần gửi trước bị gián đoạn. Kiểm tra Facebook trước khi gửi lại.'; changed = true; }
    if (state.runner?.running && !tickBusy && state.runner.busy) { state.runner.running = false; state.runner.busy = false; state.runner.message = 'Phiên chạy bị gián đoạn. Kiểm tra các mục cần đối chiếu trước khi chạy tiếp.'; changed = true; }
    if (changed) await saveState(state);
  });
}
async function ensureAlarm() { if (!await chrome.alarms.get('linkdesk-tick')) await chrome.alarms.create('linkdesk-tick', { periodInMinutes: 1 }); }
chrome.runtime.onInstalled.addListener(() => { update(() => {}).then(ensureAlarm).catch(() => {}); });
chrome.runtime.onStartup.addListener(() => { recoverInterrupted().then(ensureAlarm).catch(() => {}); });
ensureAlarm().catch(() => {});

async function claim(id, kind) {
  return update(state => {
    const j = state.jobs.find(x => x.id === id);
    if (!j || j.kind !== kind || j.status !== 'ready' || !j.approved) throw new Error('Mục này chưa được duyệt hoặc đã gửi.');
    assertLink(j, state.campaigns);
    activeJobs.add(id); j.status = 'publishing'; j.error = '';
    return { job: structuredClone(j), destination: structuredClone(state.destinations.find(x => x.id === j.destinationId)), settings: structuredClone(state.settings) };
  });
}
async function finishJob(id, fields) { return update(state => { const job = state.jobs.find(j => j.id === id); if (job) Object.assign(job, fields); activeJobs.delete(id); return job; }); }
async function publishPage(id) {
  const session = await sessions(), before = await readState();
  const job = before.jobs.find(j => j.id === id), dest = before.destinations.find(d => d.id === job?.destinationId);
  if (!dest || !session.connection || dest.pageId !== session.connection.pageId) throw new Error('Kết nối đúng Page của mục này trong Kết nối Page trước.');
  if (!before.settings.apiVersion) throw new Error('Nhập phiên bản API trước.');
  const { job: claimed, settings } = await claim(id, 'page');
  try {
    const result = await graphRequest({ version: settings.apiVersion, path: `${dest.pageId}/feed`, token: session.connection.token, body: claimed.body });
    await finishJob(id, { status: 'published', postId: String(result.id), publishedAt: new Date().toISOString() });
  } catch (error) { await finishJob(id, { status: error.uncertain ? 'uncertain' : 'failed', error: error.message }); throw error; }
}
async function publishComment(id) {
  const before = await readState(), j = before.jobs.find(x => x.id === id);
  if (!j) throw new Error('Không tìm thấy bình luận.');
  canFill(j, j.targetUrl, before.destinations); assertLink(j, before.campaigns);
  const prepared = await prepareAutoComment(j.targetUrl, j.body);
  let sent = false, claimed = false;
  try {
    const currentTab = await chrome.tabs.get(prepared.tabId);
    const currentState = await readState(), currentJob = currentState.jobs.find(x => x.id === id);
    if (!currentJob) throw new Error('Mục hàng đợi đã bị xóa. Chưa gửi.');
    canFill(currentJob, currentTab.url, currentState.destinations);
    if (currentJob.body !== j.body) throw new Error('Nội dung hàng đợi thay đổi trong lúc mở bài. Chưa gửi.');
    if (tickBusy && !currentState.runner.running) throw new Error('Bạn đã dừng phiên chạy. Chưa gửi.');
    await claim(id, 'comment'); claimed = true;
    sent = true;
    const result = await submitAutoComment(prepared.tabId, j.body, j.targetUrl);
    sent = result.sent;
    if (!result.ok) { const error = new Error(result.error); error.uncertain = sent; throw error; }
    await finishJob(id, { status: 'sent', publishedAt: new Date().toISOString() });
    await chrome.tabs.remove(prepared.tabId).catch(() => {});
  } catch (error) {
    if (claimed) await finishJob(id, { status: sent || error.uncertain ? 'uncertain' : 'failed', error: error.message });
    if (!sent) await chrome.tabs.remove(prepared.tabId).catch(() => {});
    throw error;
  }
}
const sendJob = j => j.kind === 'page' ? publishPage(j.id) : publishComment(j.id);
async function startRunner(config) {
  const session = await sessions();
  return update(state => {
    if (state.runner.running || tickBusy) throw new Error('Phiên trước đang chạy hoặc đang dừng.');
    const mode = config.mode;
    if (!['queue', 'discover'].includes(mode)) throw new Error('Chế độ không hợp lệ.');
    const maxPosts = Number(config.maxPosts);
    if (!Number.isInteger(maxPosts) || maxPosts < 1 || maxPosts > 50) throw new Error('Số lượng mỗi phiên phải từ 1 đến 50.');
    const destinations = state.destinations.filter(d => config.destinationIds?.includes(d.id));
    if (!destinations.length) throw new Error('Chọn ít nhất một đích đăng.');
    if (destinations.some(d => d.kind === 'group' && !d.allowsAds)) throw new Error('Nhóm chưa được xác nhận cho phép quảng cáo.');
    if (destinations.some(d => d.kind === 'group' && ['pending','requesting','uncertain','manual_required'].includes(d.membership?.status))) throw new Error('Có nhóm chưa xác nhận tham gia. Kiểm tra Facebook trước khi chạy.');
    if (destinations.some(d => d.kind === 'page' && session.connection?.pageId !== d.pageId)) throw new Error('Kết nối đúng Page đã chọn trước khi chạy. Một phiên kết nối một Page.');
    const campaign = state.campaigns.find(c => c.id === config.campaignId);
    if (!campaign) throw new Error('Chọn chiến dịch trước.');
    if (mode === 'discover' && (!campaign.keywords || (state.settings.aiProvider === 'api' ? !session.aiKey || !state.settings.aiModel : !session.composer))) throw new Error('Nhập từ khóa và ghép ChatGPT hoặc kết nối API trước khi tự soạn.');
    const ids = state.jobs.filter(j => j.campaignId === campaign.id && destinations.some(d => d.id === j.destinationId) && j.status === 'ready' && j.approved && (!j.scheduledAt || Date.parse(j.scheduledAt) <= Date.now())).slice(0, maxPosts).map(j => j.id);
    if (mode === 'queue' && !ids.length) throw new Error('Không có mục đã duyệt, đến giờ và khớp chiến dịch/đích đã chọn.');
    state.runner = { id: crypto.randomUUID(), running: true, busy: false, mode, campaign: structuredClone(campaign), destinationIds: destinations.map(d => d.id), maxPosts, completed: 0, skipped: 0, destinationIndex: 0, candidates: [], queueIds: ids, message: 'Đang bắt đầu. Mỗi lần xử lý một mục; bạn có thể dừng bất cứ lúc nào.', startedAt: new Date().toISOString() };
  });
}
async function autoTick() {
  if (tickBusy) return;
  tickBusy = true;
  let batchId;
  try {
    let state = await readState();
    if (!state.runner.running) return;
    batchId = state.runner.id;
    await update(s => { s.runner.busy = true; });
    const sameRun = async () => { const fresh = await readState(); return fresh.runner.running && fresh.runner.id === batchId; };
    const stop = text => update(s => { if (s.runner.id === batchId) { s.runner.running = false; s.runner.message = text; } });
    const r = state.runner;
    if (r.completed >= r.maxPosts) { await stop('Đã đạt số mục của phiên.'); return; }
    let job;
    if (r.mode === 'queue') {
      const id = r.queueIds[0];
      if (!id) { await stop('Đã xử lý xong hàng đợi đã chọn.'); return; }
      job = state.jobs.find(j => j.id === id);
      if (!job || job.status !== 'ready' || !job.approved) { await update(s => { s.runner.queueIds.shift(); s.runner.skipped++; }); return; }
      assertLink(job, state.campaigns);
    } else {
      const session = await sessions();
      if (state.settings.aiProvider === 'api' ? !session.aiKey : !session.composer) throw new Error('Phiên AI hết kết nối. Ghép lại trong AI & nguồn.');
      let candidate = r.candidates[0];
      if (!candidate) {
        const d = state.destinations.find(x => x.id === r.destinationIds[r.destinationIndex]);
        if (!d) { await stop('Đã quét xong các đích đã chọn.'); return; }
        await update(s => { s.runner.message = `Đang đọc ${d.name}…`; });
        if (d.kind === 'group') {
          const scanned = await scanGroup(d.url, r.campaign.keywords);
          const unique = new Map();
          for (const p of scanned) { try { const normalized = postTarget(p.url); if (normalized.group === d.groupId && !state.jobs.some(j => j.campaignId === r.campaign.id && j.targetUrl === normalized.url)) unique.set(normalized.url, { destinationId: d.id, targetUrl: normalized.url, context: p.text, kind: 'comment' }); } catch {} }
          if (!await sameRun()) return;
          await update(s => { s.runner.candidates = [...unique.values()]; s.runner.destinationIndex++; s.runner.message = `Tìm được ${unique.size} bài có từ khóa trong ${d.name}. AI sẽ kiểm tra mức liên quan trước khi gửi.`; });
          return;
        }
        candidate = { destinationId: d.id, targetUrl: d.url, context: '', kind: 'page' };
        await update(s => { s.runner.candidates = [candidate]; s.runner.destinationIndex++; });
      }
      if (!await sameRun()) return;
      let generated;
      if (state.settings.aiProvider === 'api') generated = await generateBody({ key: session.aiKey, model: state.settings.aiModel, campaign: r.campaign, context: candidate.context, kind: candidate.kind });
      else {
        let task;
        if (r.aiTaskId) task = await brokerRequest(session.composer, `/tasks/${r.aiTaskId}`);
        else {
          task = await brokerRequest(session.composer, '/tasks', { key: `run:${batchId}:${candidate.destinationId}:${candidate.targetUrl}`, kind: 'compose', campaign: campaignPayload(r.campaign), context: candidate.context.slice(0,2200), postKind: candidate.kind });
          await update(s => { if (s.runner.id === batchId) s.runner.aiTaskId = task.id; });
        }
        if (!await sameRun()) { await brokerRequest(session.composer, `/tasks/${task.id}/cancel`, {}).catch(()=>{}); return; }
        if (task.key !== `run:${batchId}:${candidate.destinationId}:${candidate.targetUrl}` || task.campaign?.link !== r.campaign.link || task.context !== candidate.context.slice(0,2200) || task.postKind !== candidate.kind) throw new Error('Kết quả ChatGPT không khớp yêu cầu của bài hiện tại.');
        generated = completedResult(task);
        if (!generated) { await update(s => { if (s.runner.id === batchId) s.runner.message = 'Đang chờ ChatGPT biên soạn. Mở plugin LinkDesk trong ChatGPT và yêu cầu xử lý hàng đợi.'; }); return; }
      }
      if (!await sameRun()) return;
      if (!generated.relevant) { await update(s => { s.runner.aiTaskId = null; s.runner.candidates.shift(); s.runner.skipped++; s.runner.message = 'Đã bỏ qua một bài không phù hợp với sản phẩm.'; }); return; }
      job = await update(s => {
        if (!s.runner.running || s.runner.id !== batchId) return null;
        if (s.jobs.length >= 1000) throw new Error('Hàng đợi đạt 1.000 mục. Hãy sao lưu và dọn các bản nháp.');
        if (candidate.kind === 'comment' && s.jobs.some(j => j.campaignId === r.campaign.id && j.targetUrl === candidate.targetUrl)) { s.runner.candidates.shift(); s.runner.aiTaskId = null; s.runner.skipped++; return null; }
        const freshJob = { id: crypto.randomUUID(), campaignId: r.campaign.id, destinationId: candidate.destinationId, targetUrl: candidate.targetUrl, kind: candidate.kind, body: generated.body, affiliateUrl: r.campaign.link, approved: true, status: 'ready', scheduledAt: null, createdAt: new Date().toISOString(), error: '', automated: true };
        assertLink(freshJob, s.campaigns); s.jobs.unshift(freshJob); return structuredClone(freshJob);
      });
      if (!job) return;
    }
    if (!await sameRun()) return;
    await update(s => { s.runner.message = `Đang gửi mục ${s.runner.completed + 1} / ${s.runner.maxPosts}…`; });
    await sendJob(job);
    await update(s => {
      if (s.runner.id !== batchId) return;
      s.runner.completed++;
      if (s.runner.mode === 'queue') s.runner.queueIds.shift(); else { s.runner.candidates.shift(); s.runner.aiTaskId = null; }
      s.runner.message = `Đã gửi ${s.runner.completed} mục; bỏ qua ${s.runner.skipped} bài. Mục tiếp theo xử lý ở nhịp một phút.`;
      if (s.runner.completed >= s.runner.maxPosts || s.runner.mode === 'queue' && !s.runner.queueIds.length) { s.runner.running = false; s.runner.message = `Hoàn tất phiên: đã gửi ${s.runner.completed} mục, bỏ qua ${s.runner.skipped} bài.`; }
    });
  } catch (error) {
    await update(s => { if (!batchId || s.runner.id === batchId) { s.runner.running = false; s.runner.message = `Đã dừng: ${error.message}`; } }).catch(() => {});
  } finally { await update(s => { if (s.runner.id === batchId) s.runner.busy = false; }).catch(() => {}); tickBusy = false; }
}
async function tick() {
  await recoverInterrupted();
  const state = await readState();
  if (state.runner.running) { await autoTick(); return; }
  if (!state.settings.schedulerEnabled || tickBusy) return;
  const session = await sessions(); if (!session.connection) return;
  const due = state.jobs.filter(j => j.kind === 'page' && j.status === 'ready' && j.approved && j.scheduledAt && Date.parse(j.scheduledAt) <= Date.now() && state.destinations.find(d => d.id === j.destinationId)?.pageId === session.connection.pageId).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0];
  if (due) await publishPage(due.id).catch(() => {});
}
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'linkdesk-tick') tick().catch(() => {}); });

async function handle(message) {
  if (message.type === 'GET') { await recoverInterrupted(); return { state: await readState(), ...publicSession(await sessions()) }; }
  if (message.type === 'DISCOVER_GROUPS') { const query=String(message.query||'').trim(); if(!query||query.length>100)throw new Error('Nhập từ khóa tìm nhóm, tối đa 100 ký tự.'); return await discoverGroups(query); }
  if (message.type === 'JOIN_GROUP') {
    const destination=await update(s=>{if(s.runner.running)throw new Error('Dừng phiên trước khi tham gia nhóm.');const d=s.destinations.find(x=>x.id===message.id);if(!d||d.kind!=='group'||!d.allowsAds)throw new Error('Thêm nhóm và xác nhận cho phép quảng cáo trước.');if(d.membership)throw new Error('Đã có lần kiểm tra/tham gia. Đối chiếu trên Facebook, không tự bấm lại.');d.membership={status:'requesting',at:new Date().toISOString()};return structuredClone(d);});
    let result;try{result=await requestGroupJoin(destination.url);}catch(e){result={status:'uncertain',message:'Lần tham gia bị gián đoạn. Kiểm tra trực tiếp trên Facebook.'};}
    await update(s=>{const d=s.destinations.find(x=>x.id===message.id);if(d)d.membership={status:result.status,at:new Date().toISOString(),message:result.message};});return result;
  }
  if (message.type === 'CONFIRM_MEMBERSHIP') { await update(s=>{if(s.runner.running)throw new Error('Dừng phiên trước khi sửa trạng thái nhóm.');const d=s.destinations.find(x=>x.id===message.id);if(!d||d.kind!=='group')throw new Error('Không tìm thấy nhóm.');d.membership={status:'confirmed',at:new Date().toISOString(),message:'Bạn xác nhận đã kiểm tra tư cách thành viên trên Facebook.'};});return {}; }
  if (message.type === 'COMPOSER_CONNECT') { const config = pairingConfig(message.config); const health = await brokerRequest(config, '/health'); if (health.version !== '0.2.0') throw new Error('Phiên bản cầu nối không khớp.'); await chrome.storage.session.set({composer:config}); return {composerPaired:true,mcpUrl:health.mcpUrl}; }
  if (message.type === 'COMPOSER_HEALTH') { const session = await sessions(); return await brokerRequest(session.composer, '/health'); }
  if (message.type === 'RECOVER_ANALYSIS') { const session=await sessions();return recoverAnalysis(session.composer,message.link); }
  if (message.type === 'COMPOSER_DISCONNECT') { await update(s=>{s.runner.running=false;s.runner.message='Đã ngắt cầu nối ChatGPT.';}); await cancelRunnerTask(); await chrome.storage.session.remove('composer'); return {}; }
  if (message.type === 'GET_TASK') { const session = await sessions(); const task = await brokerRequest(session.composer, `/tasks/${message.id}`); const result=completedResult(task); if(result)return {pending:false,...result}; return pendingWorkerState(task,await localWorkerStatus().catch(()=>null)); }
  if (message.type === 'ACTION') { await update(s => { if (s.runner.running && ['SAVE_CAMPAIGN', 'SAVE_DESTINATION', 'SAVE_SETTINGS'].includes(message.action?.type)) throw new Error('Dừng phiên tự động trước khi sửa cấu hình.'); Object.assign(s, reducer(s, message.action)); }); return { state: await readState() }; }
  if (message.type === 'CONNECT') {
    const state = await readState(), token = typeof message.token === 'string' ? message.token.trim() : '';
    const result = await graphRequest({ version: state.settings.apiVersion, path: 'me', token });
    if (!result.category || !/^\d+$/.test(String(result.id))) throw new Error('Token cần là Page access token, không phải User access token.');
    const connection = { token, pageId: String(result.id), name: String(result.name || result.id) };
    await chrome.storage.session.set({ connection }); return publicSession(await sessions());
  }
  if (message.type === 'DISCONNECT') { await update(s => { s.runner.running = false; s.runner.message = 'Đã ngắt Page và dừng tự động.'; }); await chrome.storage.session.remove('connection'); return {}; }
  if (message.type === 'AI_CONNECT') { const key = typeof message.key === 'string' ? message.key.trim() : ''; if (!key || /\s/.test(key)) throw new Error('API key không hợp lệ.'); await chrome.storage.session.set({ aiKey: key }); return { aiConnected: true }; }
  if (message.type === 'AI_DISCONNECT') { await update(s => { s.runner.running = false; s.runner.message = 'Đã ngắt AI và dừng tự động.'; }); await chrome.storage.session.remove('aiKey'); return { aiConnected: false }; }
  if (message.type === 'READ_SOURCE') {
    const url = httpUrl(message.link), origin = new URL(url).origin + '/*';
    if (!message.source && !await chrome.permissions.contains({ origins: [origin] })) throw new Error('Chưa cấp quyền đọc website nhà cung cấp. Bấm lại “Đọc link bằng AI”.');
    const source = message.source ? { title: 'Thông tin do bạn cung cấp', text: String(message.source).slice(0, 28000), url } : await readBrowserPage(url);
    const state = await readState(), session = await sessions();
    if (state.settings.aiProvider !== 'api') { const task = await brokerRequest(session.composer, '/tasks', {key:`source:${crypto.randomUUID()}`,kind:'analyze',link:url,source:source.text,extra:String(message.extra||'').slice(0,6000)}); return {pending:true,taskId:task.id}; }
    const campaign = await analyzeSource({ key: session.aiKey, model: state.settings.aiModel, source, extra: String(message.extra || '').slice(0, 6000), link: url });
    return { campaign };
  }
  if (message.type === 'GENERATE') {
    const state = await readState(), session = await sessions(), campaign = state.campaigns.find(c => c.id === message.campaignId);
    if (!campaign) throw new Error('Chọn chiến dịch trước.');
    if (state.settings.aiProvider !== 'api') { const task = await brokerRequest(session.composer, '/tasks', {key:`manual:${crypto.randomUUID()}`,kind:'compose',campaign:campaignPayload(campaign),context:String(message.context||'').slice(0,2200),postKind:message.kind==='page'?'page':'comment'}); return {pending:true,taskId:task.id}; }
    return await generateBody({ key: session.aiKey, model: state.settings.aiModel, campaign, context: String(message.context || '').slice(0, 2200), kind: message.kind === 'page' ? 'page' : 'comment' });
  }
  if (message.type === 'PUBLISH') { await publishPage(message.id); return { state: await readState() }; }
  if (message.type === 'START_RUNNER') { await startRunner(message.config); autoTick().catch(() => {}); return { state: await readState() }; }
  if (message.type === 'STOP_RUNNER') { await update(s => { s.runner.running = false; s.runner.message = 'Đã yêu cầu dừng. Thao tác gửi đang thực hiện có thể hoàn tất; sẽ không bắt đầu mục mới.'; }); await cancelRunnerTask(); return { state: await readState() }; }
  if (message.type === 'IMPORT') { await update(s => { if (s.runner.running || tickBusy || activeJobs.size) throw new Error('Dừng tự động và chờ thao tác gửi kết thúc trước khi khôi phục.'); Object.assign(s, importState(message.data)); }); return { state: await readState() }; }
  throw new Error('Thao tác không được hỗ trợ.');
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  handle(message).then(data => sendResponse({ ok: true, ...data }), error => sendResponse({ ok: false, error: error.message || 'Thao tác thất bại.' }));
  return true;
});
