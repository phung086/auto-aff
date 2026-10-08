import { assertLink, httpUrl } from './model.mjs';
export function pairingConfig(raw) {
  if (raw?.url !== 'http://127.0.0.1:8787' || typeof raw.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(raw.token)) throw new Error('Chọn pairing.json do LinkDesk tạo tại máy này.');
  return { url: raw.url, token: raw.token };
}
export async function brokerRequest(config, path, data, fetcher = fetch) {
  const connection = pairingConfig(config);
  if (!/^\/(health|tasks(?:\/[a-f0-9-]{36}(?:\/cancel)?)?)$/.test(path)&&path!=='/tasks?status=completed&offset=0&limit=20') throw new Error('Đường dẫn kết nối không hợp lệ.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(connection.url + path, { method: data === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}), signal: controller.signal, redirect: 'error' });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(result.error || 'Kết nối cục bộ bị từ chối. Khởi động server và ghép lại pairing.json.');
    return result;
  } catch (e) { if (e.name === 'AbortError' || e instanceof TypeError) throw new Error('Không liên lạc được LinkDesk tại máy. Chạy npm start rồi thử lại.'); throw e; }
  finally { clearTimeout(timer); }
}
export const campaignPayload = c => ({name:c.name,product:c.product,benefit:c.benefit,keywords:c.keywords || '',link:httpUrl(c.link),source:c.source || ''});
export async function recoverAnalysis(config,link,fetcher=fetch) {
  const original=httpUrl(link),{tasks}=await brokerRequest(config,'/tasks?status=completed&offset=0&limit=20',undefined,fetcher);
  if(!Array.isArray(tasks))throw new Error('Không đọc được danh sách kết quả.');
  const task=[...tasks].reverse().find(t=>t.kind==='analyze'&&t.status==='completed'&&t.link===original);
  if(!task)throw new Error('Chưa tìm thấy cấu hình đã hoàn tất cho nguyên link này trong 20 kết quả kiểm tra.');
  return {...completedResult(task),taskId:task.id};
}
export async function localWorkerStatus(fetcher=fetch) {
  const response=await fetcher('http://127.0.0.1:8791/status',{signal:AbortSignal.timeout(2000),redirect:'error'});
  if(!response.ok)throw new Error('Không đọc được trạng thái worker.');
  const value=await response.json();
  if(typeof value.enabled!=='boolean'||typeof value.busy!=='boolean'||typeof value.message!=='string')throw new Error('Trạng thái worker không hợp lệ.');
  return value;
}
export function pendingWorkerState(task,status) {
  if(status&&!status.enabled&&!status.busy&&status.failure?.taskId===task.id)throw new Error(String(status.failure.message).slice(0,220));
  return {pending:true,...(status?{workerMessage:status.enabled?status.message:'Worker đang dừng. Mở AI tự động tại 127.0.0.1:8791 để kiểm tra; hoặc xử lý qua plugin ChatGPT.'}:{})};
}
export function completedResult(task) {
  if (['expired','cancelled'].includes(task.status)) throw new Error('Yêu cầu ChatGPT đã hết hạn hoặc bị hủy. Tạo yêu cầu mới.');
  if (task.status !== 'completed') return null;
  if (task.kind === 'compose') { if (typeof task.result?.relevant !== 'boolean') throw new Error('Kết quả MCP không hợp lệ.'); assertLink({ body: task.result.body, affiliateUrl: task.campaign.link }, []); }
  else if (task.result?.campaign?.link !== task.link) throw new Error('Link phân tích không khớp nguyên bản.');
  return task.result;
}
