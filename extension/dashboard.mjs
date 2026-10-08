import { TEMPLATES, renderTemplate, vnDate, csvCell, httpUrl } from './model.mjs';
import { request, action, esc, formatTime, STATUS, isExtension } from './bridge.mjs';
const $ = id => document.getElementById(id);
let state, connection, toastTimer, aiConnected = false, composerPaired = false, pendingManual = false;
function notify(text, error = false) { const node = $('toast'); node.textContent = text; node.classList.toggle('error', error); node.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, error ? 10000 : 4500); }
async function run(button, callback) { const label = button?.textContent; if (button) { button.disabled = true; button.textContent = 'Đang xử lý…'; } try { await callback(); } catch (e) { notify(e.message, true); } finally { if (button) { button.disabled = false; button.textContent = label; } } }
function showView(name, moveFocus = false) { document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; }); document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === name); if (b.dataset.view === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); if (moveFocus) { const heading = $(`view-${name}`)?.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus(); } } }
function options(select, items, label, placeholder) { const previous = select.value; select.innerHTML = items.length ? items.map(x => `<option value="${esc(x.id)}">${esc(label(x))}</option>`).join('') : `<option value="">${esc(placeholder)}</option>`; if (items.some(x => x.id === previous)) select.value = previous; }
function campaign() { return state.campaigns.find(x => x.id === $('job-campaign').value); }
function destination() { return state.destinations.find(x => x.id === $('job-destination').value); }
function updateCompose(regenerate = false) { const d = destination(); $('post-field').hidden = d?.kind === 'page'; $('job-url').required = d?.kind === 'group'; $('schedule-field').hidden = d?.kind !== 'page'; $('add-job').disabled = !campaign() || !d; if (regenerate || !$('job-body').value) fillTemplate(); }
function fillTemplate() { const c = campaign(); if (!c) return; try { $('job-body').value = renderTemplate(c, TEMPLATES[Number($('job-template').value)].body); } catch (e) { notify(e.message, true); } }
function renderQueue() {
  const mode = $('queue-filter').value;
  const jobs = state.jobs.filter(j => mode === 'all' || mode === j.status || mode === 'history' && !['draft', 'ready'].includes(j.status));
  $('queue-summary').textContent = `${jobs.length} mục${mode !== 'all' ? ` / ${state.jobs.length} tổng cộng` : ''}`;
  if (!jobs.length) { $('queue-list').innerHTML = state.jobs.length ? '<div class="empty"><h2>Không có mục ở trạng thái này</h2><p>Chọn trạng thái khác để xem hàng đợi và lịch sử.</p></div>' : '<div class="empty"><h2>Bắt đầu với một chiến dịch</h2><p>Thêm thông tin thật của sản phẩm, rồi chọn nơi bạn muốn chia sẻ.</p><ol><li><a href="#campaigns" data-goto="campaigns">Tạo chiến dịch và nhập link affiliate</a></li><li><a href="#destinations" data-goto="destinations">Thêm nhóm hoặc Page được phép đăng</a></li><li>Chuẩn bị nội dung ở cột bên trái và duyệt trước khi gửi.</li></ol><p>Bình luận nhóm được điền vào ô bạn chọn. Bài Page có thể đăng ngay hoặc theo lịch sau khi kết nối.</p></div>'; return; }
  $('queue-list').innerHTML = jobs.map(j => {
    const d = state.destinations.find(x => x.id === j.destinationId), c = state.campaigns.find(x => x.id === j.campaignId);
    const mutable = ['draft', 'ready', 'failed'].includes(j.status);
    const button = (op, label, cls = 'secondary') => `<button class="${cls}" data-job="${esc(j.id)}" data-op="${op}">${label}</button>`;
    let buttons = button('copy', 'Sao chép');
    if (['draft', 'ready'].includes(j.status)) buttons += button('review', j.approved ? 'Bỏ duyệt' : 'Duyệt nội dung', j.approved ? 'secondary' : 'primary');
    if (j.kind === 'page' && j.status === 'ready') buttons += button('publish', 'Đăng lên Page', 'primary');
    if (j.kind === 'comment') buttons += `<a class="secondary" href="${esc(j.targetUrl)}" target="_blank" rel="noopener noreferrer">Mở bài viết</a>`;
    if (j.kind === 'comment' && j.status === 'ready') buttons += button('confirm', 'Tôi đã gửi trên Facebook');
    if (mutable) buttons += button('edit', 'Sửa') + button('delete', 'Xóa', 'secondary danger');
    if (j.status === 'uncertain') buttons += button('resolve-yes', 'Đã kiểm tra: bài đã đăng') + button('resolve-no', 'Đã kiểm tra: chưa đăng');
    const permalink = j.status === 'published' && /^\d+_\d+$/.test(j.postId || '') ? `<a class="secondary" href="https://www.facebook.com/${esc(j.postId.split('_')[0])}/posts/${esc(j.postId.split('_')[1])}" target="_blank" rel="noopener noreferrer">Xem bài đã đăng</a>` : '';
    return `<article class="job"><div class="job-header"><div class="job-title"><h3>${esc(d?.name || 'Đích đăng')} · ${j.kind === 'page' ? 'Bài Page' : 'Bình luận nhóm'}</h3><div class="job-meta">${esc(c?.name || '')}${j.scheduledAt ? ` · Lịch: ${esc(formatTime(j.scheduledAt))} (VN)` : ''}${j.publishedAt ? ` · Gửi: ${esc(formatTime(j.publishedAt))}` : ''}${j.preparedAt && j.status === 'ready' ? ' · Đã điền, chờ bạn gửi' : ''}</div></div><span class="tag ${esc(j.status)}">${esc(STATUS[j.status])}</span></div><div class="job-body">${esc(j.body)}</div>${j.error ? `<p class="job-error">${esc(j.error)}</p>` : ''}<div class="job-actions">${buttons}${permalink}</div></article>`;
  }).join('');
}
function renderRecords() {
  $('campaign-list').innerHTML = state.campaigns.length ? state.campaigns.map(c => `<article class="record"><h3>${esc(c.name)}</h3><p><strong>${esc(c.product)}</strong><br>${esc(c.benefit)}</p><p class="url">${esc(c.link)}</p><button class="secondary" data-edit-campaign="${esc(c.id)}">Sửa chiến dịch</button></article>`).join('') : '<div class="empty"><h2>Chưa có chiến dịch</h2><p>Thông tin bạn nhập sẽ được dùng để tạo mẫu. Không thêm cam kết hay giá nếu chưa được nhà cung cấp xác nhận.</p></div>';
  $('destination-list').innerHTML = state.destinations.length ? state.destinations.map(d => `<article class="record"><h3>${esc(d.name)}</h3><p>${d.kind === 'group' ? 'Nhóm · Bạn xác nhận cho phép quảng cáo' : `Page · ID ${esc(d.pageId)}`}</p><a class="url" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.url)}</a>${d.kind === 'group' ? `<p class="hint">Tham gia: ${esc(({requesting:'Đang kiểm tra',pending:'Đang chờ duyệt',joined:'Facebook hiển thị đã tham gia',confirmed:'Bạn xác nhận là thành viên',manual_required:'Cần xử lý trên Facebook',uncertain:'Chưa rõ kết quả'})[d.membership?.status] || 'Chưa kiểm tra bằng công cụ')}</p><div class="button-row">${!d.membership ? `<button class="secondary" data-join-group="${esc(d.id)}">Kiểm tra / tham gia một lần</button>` : ''}<button class="text-button" data-confirm-member="${esc(d.id)}">Tôi đã kiểm tra: là thành viên</button></div>` : ''}</article>`).join('') : '<div class="empty"><h2>Chưa có đích đăng</h2><p>Thêm link nhóm hoặc Page ID để bắt đầu.</p></div>';
}
function renderConnection() { $('connection-status').textContent = connection ? `Đã kết nối: ${connection.name} · Page ID: ${connection.pageId}` : 'Chưa kết nối.'; $('disconnect').disabled = !connection; }
function renderAutomation() {
  options($('runner-campaign'), state.campaigns, c => c.name, 'Tạo chiến dịch trước');
  $('runner-link').textContent = state.campaigns.find(c => c.id === $('runner-campaign').value)?.link || '';
  const selected = new Set([...document.querySelectorAll('[name="runner-destination"]:checked')].map(x => x.value));
  $('runner-destinations').innerHTML = state.destinations.length ? state.destinations.map(d => `<label class="check"><input name="runner-destination" type="checkbox" value="${esc(d.id)}"${selected.has(d.id) ? ' checked' : ''}><span>${esc(d.name)} · ${d.kind === 'group' ? 'Nhóm' : 'Page'}</span></label>`).join('') : '<p class="hint">Thêm nhóm hoặc Page trong tab Đích đăng.</p>';
  const r = state.runner || {};
  $('runner-heading').textContent = r.running ? 'Phiên đang chạy' : 'Phiên đã dừng';
  $('runner-status').textContent = r.message || 'Chưa chạy.';
  $('runner-counts').textContent = `Đã gửi: ${r.completed || 0} · Đã bỏ qua: ${r.skipped || 0}`;
  $('runner-stop').disabled = !r.running;
  $('runner-start').disabled = r.running || r.busy || !state.destinations.length;
  for (const id of ['runner-campaign', 'runner-mode', 'runner-max', 'runner-authorize']) $(id).disabled = Boolean(r.running || r.busy);
  document.querySelectorAll('[name="runner-destination"]').forEach(x => { x.disabled = Boolean(r.running || r.busy); });
  $('ai-status').textContent = aiConnected ? 'Key đã lưu trong phiên Chrome. Kết nối được kiểm tra khi soạn nội dung.' : 'Chưa kết nối AI.';
  $('ai-disconnect').disabled = !aiConnected;
}
async function refresh() { const result = await request({ type: 'GET' }); state = result.state; connection = result.connection; aiConnected = result.aiConnected; composerPaired = result.composerPaired; options($('job-campaign'), state.campaigns, c => c.name, 'Tạo chiến dịch trước'); options($('job-destination'), state.destinations, d => `${d.name} · ${d.kind === 'group' ? 'Nhóm' : 'Page'}`, 'Thêm đích đăng trước'); renderQueue(); renderRecords(); renderConnection(); renderAutomation(); renderHomeStats(); updateCompose(); }
function renderHomeStats() {
  $('home-ai').textContent = state.settings.aiProvider === 'api' ? (aiConnected ? 'API key đã lưu trong phiên Chrome.' : 'Chưa kết nối OpenAI API.') : (composerPaired ? 'Đã ghép cầu nối tại máy. Kiểm tra plugin trong ChatGPT.' : 'Chưa ghép cầu nối tại máy.');
  $('home-campaign').textContent = `${state.campaigns.length} chiến dịch · có thể thêm nhà cung cấp mới.`;
  $('home-destinations').textContent = state.destinations.length ? `${state.destinations.length} nhóm / Page đã lưu.` : 'Thêm nhóm cho phép quảng cáo hoặc Page của bạn.';
  $('home-link').textContent = state.campaigns[0]?.link || 'Chưa có link.';
  const count = status => state.jobs.filter(j => status.includes(j.status)).length;
  $('home-history').textContent = `API / đã thấy: ${count(['published','sent'])} · Bạn xác nhận: ${count(['manual'])} · Cần kiểm tra: ${count(['uncertain'])}`;
  $('composer-status').textContent = composerPaired ? 'Đã ghép Chrome với cầu nối tại máy. Bấm kiểm tra để xem địa chỉ MCP hiện tại.' : 'Chưa ghép cầu nối tại máy.';
  $('composer-disconnect').disabled = !composerPaired; $('composer-check').disabled = !composerPaired;
  $('ai-provider').value = state.settings.aiProvider || 'chatgpt';
  options($('report-campaign'), state.campaigns, c => c.name, 'Tạo chiến dịch trước');
  $('report-link').textContent = state.campaigns.find(c => c.id === $('report-campaign').value)?.link || '';
  $('stats-body').innerHTML = state.campaigns.map(c => { const jobs = state.jobs.filter(j => j.campaignId === c.id); const n = statuses => jobs.filter(j => statuses.includes(j.status)).length; return `<tr><th scope="row">${esc(c.name)}</th><td>${n(['published','sent'])}</td><td>${n(['manual'])}</td><td>${n(['uncertain'])}</td><td>${n(['failed'])}</td><td>${n(['draft','ready','publishing'])}</td></tr>`; }).join('');
  const reports = state.reports || [];
  $('report-list').innerHTML = '<h2>Báo cáo từ nhà cung cấp</h2>' + (reports.length ? '<p class="hint">Dữ liệu bạn nhập; chưa xác minh với API nhà cung cấp. Không cộng các khoảng thời gian có thể trùng nhau.</p>' + reports.map(r => `<article class="record"><h3>${esc(state.campaigns.find(c => c.id === r.campaignId)?.name || r.campaignId)} · ${r.clicks.toLocaleString('vi-VN')} click</h3><p>${esc(r.source)}<br>${esc(r.periodStart)} → ${esc(r.periodEnd)}</p><p class="url">${esc(r.link)}</p><p class="hint">Nhập: ${esc(formatTime(r.importedAt))}</p></article>`).join('') : '<div class="empty"><h3>Chưa có dữ liệu click từ nhà cung cấp</h3><p>Giữ nguyên link nên LinkDesk không thêm mã theo dõi hay chuyển hướng. Nhập báo cáo thực tế khi nhà cung cấp cung cấp số liệu.</p></div>');
}
async function waitForTask(result) {
  if (!result.pending) return result;
  if (pendingManual) throw new Error('Một yêu cầu khác đang chờ. Hãy xử lý yêu cầu đó trước.');
  pendingManual = true;
  const node = $('task-status'); node.hidden = false; node.textContent = 'Đang chờ biên soạn. Worker đang bật sẽ tự xử lý; nếu dùng plugin thủ công, mở LinkDesk trong ChatGPT. Giữ bảng quản lý mở để nhận kết quả.';
  notify('Đã đưa yêu cầu vào hàng đợi ChatGPT.');
  try { const end = Date.now() + 30*60*1000; while (Date.now() < end) { await new Promise(resolve => setTimeout(resolve,4000)); const next = await request({type:'GET_TASK',id:result.taskId}); if (!next.pending) {node.textContent='Đã nhận kết quả biên soạn.'; return next;} if(next.workerMessage)node.textContent=next.workerMessage; } throw new Error('Yêu cầu hết hạn. Tạo yêu cầu mới.'); }
  catch(e){node.textContent=e.message;throw e;}
  finally { pendingManual = false; }
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
document.addEventListener('click', event => { const a = event.target.closest('[data-goto]'); if (a) { event.preventDefault(); showView(a.dataset.goto, true); } });
$('job-template').innerHTML = TEMPLATES.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('');
$('job-campaign').addEventListener('change', () => updateCompose(true));
$('job-destination').addEventListener('change', () => { const d = destination(); $('job-template').value = d?.kind === 'page' ? '1' : '0'; updateCompose(true); });
$('job-template').addEventListener('change', fillTemplate); $('regenerate').addEventListener('click', fillTemplate);
$('generate-ai').addEventListener('click', event => run(event.currentTarget, async () => {
  if (pendingManual) throw new Error('Đang chờ một yêu cầu ChatGPT khác.');
  const campaignId = campaign()?.id, destinationId = destination()?.id;
  const result = await waitForTask(await request({ type: 'GENERATE', campaignId, context: $('job-context').value, kind: destination()?.kind === 'page' ? 'page' : 'comment' }));
  if (campaign()?.id !== campaignId || destination()?.id !== destinationId) throw new Error('Chiến dịch hoặc đích đăng đã đổi khi chờ AI. Soạn lại cho lựa chọn hiện tại.');
  if (!result.relevant) throw new Error('AI nhận định bài không phù hợp với sản phẩm. Chọn bài khác hoặc bổ sung đúng ngữ cảnh.');
  $('job-body').value = result.body; notify('AI đã soạn nội dung và gắn nguyên link chiến dịch.');
}));
$('runner-campaign').addEventListener('change', () => { $('runner-link').textContent = state.campaigns.find(c => c.id === $('runner-campaign').value)?.link || ''; });
$('runner-form').addEventListener('submit', event => { event.preventDefault(); run($('runner-start'), async () => {
  const config = { campaignId: $('runner-campaign').value, mode: $('runner-mode').value, maxPosts: Number($('runner-max').value), destinationIds: [...document.querySelectorAll('[name="runner-destination"]:checked')].map(x => x.value) };
  await request({ type: 'START_RUNNER', config }); $('runner-authorize').checked = false; await refresh(); notify('Phiên tự động đã bắt đầu. Xem trạng thái hoặc bấm Dừng phiên.');
}).finally(() => renderAutomation()); });
$('runner-stop').addEventListener('click', event => run(event.currentTarget, async () => { await request({ type: 'STOP_RUNNER' }); await refresh(); notify('Đã yêu cầu dừng phiên.'); }).finally(() => renderAutomation()));
$('ai-connect-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => {
  await action('SAVE_SETTINGS', { data: { ...state.settings, aiModel: $('ai-model').value } });
  if ($('ai-key').value) { await request({ type: 'AI_CONNECT', key: $('ai-key').value }); $('ai-key').value = ''; }
  await refresh(); notify(aiConnected ? 'Đã lưu model và key trong phiên Chrome.' : 'Đã lưu model. Nhập API key để soạn bằng AI.');
}); });
$('ai-disconnect').addEventListener('click', event => run(event.currentTarget, async () => { await request({ type: 'AI_DISCONNECT' }); await refresh(); notify('Đã xóa key phiên và dừng tự động.'); }));
$('source-form').addEventListener('submit', event => { event.preventDefault(); run($('source-read'), async () => {
  if (!isExtension) throw new Error('Cài tiện ích Chrome để đọc website và gọi AI.');
  const originalLink = httpUrl($('source-link').value);
  if (!$('source-manual').value) {
    const allowed = await chrome.permissions.request({ origins: [new URL(originalLink).origin + '/*'] });
    if (!allowed) throw new Error('Bạn chưa cấp quyền đọc website. Có thể dán thông tin nguồn để dùng thay thế.');
  }
  if (pendingManual) throw new Error('Đang chờ một yêu cầu ChatGPT khác.');
  const result = await waitForTask(await request({ type: 'READ_SOURCE', link: originalLink, extra: $('source-extra').value, source: $('source-manual').value }));
  if (result.campaign.link !== originalLink) throw new Error('Link trả về không khớp. Đã chặn lưu cấu hình.');
  populateCampaign(result.campaign); showView('campaigns'); notify('Đã đọc nguồn. Kiểm tra cấu hình và bấm Lưu chiến dịch.');
}); });
$('queue-filter').addEventListener('change', renderQueue);
$('refresh').addEventListener('click', event => run(event.currentTarget, async () => { await refresh(); notify('Đã làm mới hàng đợi.'); }));
$('job-form').addEventListener('submit', event => { event.preventDefault(); run($('add-job'), async () => { await action('ADD_JOB', { data: { campaignId: $('job-campaign').value, destinationId: $('job-destination').value, targetUrl: $('job-url').value, body: $('job-body').value, scheduledAt: vnDate($('job-schedule').value) } }); $('job-url').value = ''; $('job-schedule').value = ''; await refresh(); notify('Đã thêm. Kiểm tra nội dung và bấm duyệt trước khi gửi.'); }); });
$('campaign-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => { await action('SAVE_CAMPAIGN', { data: { id: $('campaign-id').value, name: $('campaign-name').value, product: $('campaign-product').value, benefit: $('campaign-benefit').value, link: $('campaign-link').value, keywords: $('campaign-keywords').value, source: $('campaign-source').value } }); resetCampaign(); await refresh(); fillTemplate(); notify('Đã lưu chiến dịch.'); }); });
function resetCampaign() { $('campaign-form').reset(); $('campaign-id').value = ''; $('campaign-form-title').textContent = 'Thêm chiến dịch'; }
$('campaign-reset').addEventListener('click', resetCampaign);
function populateCampaign(c) { for (const key of ['id', 'name', 'product', 'benefit', 'link', 'keywords', 'source']) $(`campaign-${key}`).value = c[key] || ''; $('campaign-form-title').textContent = c.id ? 'Sửa chiến dịch' : 'Lưu cấu hình từ AI'; }
$('source-recover').addEventListener('click',event=>run(event.currentTarget,async()=>{
  if(pendingManual)throw new Error('Yêu cầu đang được theo dõi. Nếu trang đã treo, tải lại dashboard rồi nhận kết quả đã có.');
  const link=httpUrl($('source-link').value),result=await request({type:'RECOVER_ANALYSIS',link});
  if(result.campaign?.link!==link)throw new Error('Link kết quả không khớp.');
  populateCampaign(result.campaign);showView('campaigns');notify('Đã nhận cấu hình có sẵn. Kiểm tra nguồn/thông tin rồi bấm Lưu chiến dịch. Không gọi AI lại.');
}));
$('campaign-list').addEventListener('click', event => { const b = event.target.closest('[data-edit-campaign]'); if (!b) return; const c = state.campaigns.find(x => x.id === b.dataset.editCampaign); populateCampaign(c); $('campaign-name').focus(); });
function destinationFields() { const group = $('destination-kind').value === 'group'; $('group-fields').hidden = !group; $('page-fields').hidden = group; $('destination-url').required = group; $('destination-allows').required = group; $('destination-page').required = !group; }
$('destination-kind').addEventListener('change', destinationFields);
$('destination-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => { await action('SAVE_DESTINATION', { data: { name: $('destination-name').value, kind: $('destination-kind').value, url: $('destination-url').value, pageId: $('destination-page').value, allowsAds: $('destination-allows').checked } }); $('destination-form').reset(); destinationFields(); await refresh(); notify('Đã thêm đích đăng.'); }); });
$('settings-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => { await action('SAVE_SETTINGS', { data: { apiVersion: $('api-version').value, schedulerEnabled: $('scheduler-enabled').checked } }); await refresh(); notify('Đã lưu cài đặt lịch đăng.'); }); });
$('connection-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => { await action('SAVE_SETTINGS', { data: { apiVersion: $('api-version').value, schedulerEnabled: $('scheduler-enabled').checked } }); const result = await request({ type: 'CONNECT', token: $('page-token').value }); $('page-token').value = ''; connection = result.connection; renderConnection(); notify('Đã kết nối Page. Copy Page ID để thêm đích đăng.'); }); });
$('disconnect').addEventListener('click', event => run(event.currentTarget, async () => { await request({ type: 'DISCONNECT' }); connection = null; renderConnection(); notify('Đã xóa token của phiên này.'); }));
$('queue-list').addEventListener('click', event => {
  const b = event.target.closest('[data-job]'); if (!b) return;
  const j = state.jobs.find(x => x.id === b.dataset.job); if (!j) return;
  run(b, async () => {
    if (b.dataset.op === 'copy') { await navigator.clipboard.writeText(j.body); notify('Đã sao chép nội dung.'); return; }
    if (b.dataset.op === 'edit') { $('edit-job-id').value = j.id; $('edit-job-body').value = j.body; $('edit-dialog').showModal(); return; }
    if (b.dataset.op === 'review') await action('REVIEW_JOB', { id: j.id, approved: !j.approved });
    if (b.dataset.op === 'delete') await action('DELETE_JOB', { id: j.id });
    if (b.dataset.op === 'confirm') { if (!confirm('Bạn đã nhìn thấy bình luận này được gửi thành công trên Facebook?')) return; await action('CONFIRM_COMMENT', { id: j.id }); }
    if (b.dataset.op === 'publish') { if (!confirm(`Đăng nội dung đã duyệt lên Page “${state.destinations.find(d => d.id === j.destinationId)?.name}” ngay bây giờ?`)) return; await request({ type: 'PUBLISH', id: j.id }); notify('Facebook đã trả ID bài đăng.'); }
    if (b.dataset.op.startsWith('resolve-')) { if (!confirm('Bạn đã kiểm tra trực tiếp Page và xác nhận kết quả?')) return; await action('RESOLVE_UNCERTAIN', { id: j.id, published: b.dataset.op === 'resolve-yes' }); }
    await refresh();
  }).finally(() => refresh().catch(() => {}));
});
$('edit-cancel').addEventListener('click', () => $('edit-dialog').close());
$('edit-job-form').addEventListener('submit', event => { event.preventDefault(); run(event.submitter, async () => { await action('EDIT_JOB', { id: $('edit-job-id').value, body: $('edit-job-body').value }); $('edit-dialog').close(); await refresh(); notify('Đã lưu. Hãy duyệt lại nội dung.'); }); });
function download(data, filename, type) { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
$('export-json').addEventListener('click', event => run(event.currentTarget, async () => { await refresh(); download(JSON.stringify(state, null, 2), 'linkdesk-backup.json', 'application/json'); notify('Đã tải bản sao lưu, không chứa token.'); }));
$('export-csv').addEventListener('click', event => run(event.currentTarget, async () => { await refresh(); const rows = [['ID', 'Chiến dịch', 'Đích đăng', 'Loại', 'Trạng thái', 'Lịch (VN)', 'Gửi (VN)', 'URL', 'Nội dung', 'ID bài Page', 'Lỗi'], ...state.jobs.map(j => [j.id, state.campaigns.find(c => c.id === j.campaignId)?.name, state.destinations.find(d => d.id === j.destinationId)?.name, j.kind, STATUS[j.status], formatTime(j.scheduledAt), j.publishedAt ? formatTime(j.publishedAt) : '', j.targetUrl, j.body, j.postId || '', j.error || ''])]; download('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'linkdesk-history.csv', 'text/csv;charset=utf-8'); }));
$('import-json').addEventListener('change', event => run(null, async () => { const file = event.target.files[0]; if (!file) return; try { if (file.size > 6000000) throw new Error('File sao lưu quá lớn (tối đa 6 MB).'); if (!confirm('Khôi phục sẽ thay thế dữ liệu hiện tại. Bạn đã tải bản sao lưu hiện tại chưa?')) return; await request({ type: 'IMPORT', data: JSON.parse(await file.text()) }); await refresh(); $('api-version').value = state.settings.apiVersion; $('scheduler-enabled').checked = false; notify('Đã khôi phục. Các mục chưa gửi cần được duyệt lại.'); } finally { event.target.value = ''; } }));
if (!isExtension) $('mode-label').textContent = 'Bản xem trước · không đăng Facebook';
showView('home');
$('composer-pair').addEventListener('change', event => run(null, async () => { const file=event.target.files[0]; if(!file)return;try{if(file.size>4096)throw new Error('File ghép không hợp lệ.');await request({type:'COMPOSER_CONNECT',config:JSON.parse(await file.text())});await refresh();notify('Đã ghép cầu nối tại máy. Kết nối plugin trong ChatGPT để biên soạn.');}finally{event.target.value='';} }));
$('composer-check').addEventListener('click', event => run(event.currentTarget, async()=>{const health=await request({type:'COMPOSER_HEALTH'});$('composer-status').textContent='Cầu nối tại máy đang phản hồi. Chưa xác minh kết nối tài khoản ChatGPT.';$('composer-url').hidden=!health.mcpUrl;$('composer-url').textContent=health.mcpUrl||'';notify(health.mcpUrl?'Dùng địa chỉ MCP hiển thị để kết nối ChatGPT.':'Chưa có địa chỉ HTTPS. Chạy npm run connect.');}));
$('composer-disconnect').addEventListener('click', event=>run(event.currentTarget,async()=>{await request({type:'COMPOSER_DISCONNECT'});await refresh();$('composer-url').hidden=true;}));
$('ai-provider').addEventListener('change', event=>run(null,async()=>{await action('SAVE_SETTINGS',{data:{...state.settings,aiProvider:event.target.value}});await refresh();notify('Đã lưu cách biên soạn.');}));
$('report-campaign').addEventListener('change',()=>{$('report-link').textContent=state.campaigns.find(c=>c.id===$('report-campaign').value)?.link||'';});
$('report-form').addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{const c=state.campaigns.find(c=>c.id===$('report-campaign').value);await action('IMPORT_REPORT',{data:{campaignId:c.id,link:c.link,source:$('report-source').value,periodStart:$('report-start').value,periodEnd:$('report-end').value,clicks:Number($('report-clicks').value)}});await refresh();notify('Đã lưu báo cáo, kèm nguồn và khoảng thời gian.');});});
$('group-search-form').addEventListener('submit',event=>{event.preventDefault();run(event.submitter,async()=>{const result=await request({type:'DISCOVER_GROUPS',query:$('group-search-query').value});$('group-search-results').innerHTML=result.groups.length?result.groups.map(g=>`<article class="record"><h3>${esc(g.name)}</h3><a href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">Xem quy định nhóm</a><button class="secondary" data-use-group="${esc(g.url)}" data-group-name="${esc(g.name)}">Điền vào form</button></article>`).join(''):'<p>Chưa đọc được kết quả nhóm. Dùng tab Facebook đã mở và sao chép link nhóm vào form.</p>';});});
$('group-search-results').addEventListener('click',event=>{const button=event.target.closest('[data-use-group]');if(!button)return;$('destination-kind').value='group';destinationFields();$('destination-name').value=button.dataset.groupName;$('destination-url').value=button.dataset.useGroup;$('destination-allows').checked=false;$('destination-allows').focus();});
$('destination-list').addEventListener('click',event=>{const join=event.target.closest('[data-join-group]'),confirmMember=event.target.closest('[data-confirm-member]');if(!join&&!confirmMember)return;run(join||confirmMember,async()=>{if(join){const result=await request({type:'JOIN_GROUP',id:join.dataset.joinGroup});notify(result.message);}else{if(!confirm('Bạn đã mở Facebook và kiểm tra mình là thành viên của đúng nhóm này?'))return;await request({type:'CONFIRM_MEMBERSHIP',id:confirmMember.dataset.confirmMember});}await refresh();});});
try { await refresh(); $('api-version').value = state.settings.apiVersion; $('scheduler-enabled').checked = state.settings.schedulerEnabled; $('ai-model').value = state.settings.aiModel; destinationFields(); } catch (e) { notify(e.message, true); }
if (isExtension) chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.state) refresh().catch(() => {}); });
