import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { normalizeTask, normalizeResult, claimInput, leaseActionInput, submissionInput } from './contracts.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const matchesToken = (expected,token) => typeof expected==='string' && /^[a-f0-9]{64}$/.test(expected) && typeof token==='string' && timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(hash(token),'hex'));
const publicTask = (task,now) => {
  const {fingerprint,lease,completionLeaseHash,...visible}=task;
  visible.status=task.status==='pending'&&task.expiresAt<=now?'expired':task.status;
  if(visible.status==='pending'&&lease&&lease.expiresAt>now)visible.lease={owner:lease.owner,expiresAt:lease.expiresAt};
  return structuredClone(visible);
};
const pending = (task,now) => task.status==='pending'&&task.expiresAt>now;
const requirePending = (task,now) => {if(!pending(task,now))throw new Error('Yêu cầu đã hoàn tất, hủy hoặc hết hạn; không nhận kết quả muộn.');};
const requireLease = (task,token,now) => {
  if(!task.lease||task.lease.expiresAt<=now||!matchesToken(task.lease.tokenHash,token))throw new Error('Lease không hợp lệ hoặc hết hạn. Nhận claim mới trước khi biên soạn; không nộp kết quả của lượt cũ.');
};
export class TaskStore {
  constructor(directory, now = () => Date.now()) { this.directory = directory; this.now = now; this.serial = Promise.resolve(); this.data = { tasks: [] }; }
  async load() { await mkdir(this.directory, {recursive:true}); try { this.data = JSON.parse(await readFile(join(this.directory,'tasks.json'),'utf8')); if (!Array.isArray(this.data.tasks)) throw new Error('Kho yêu cầu không hợp lệ.'); } catch(e) { if (e.code !== 'ENOENT') throw e; } return this; }
  mutate(fn) { const result = this.serial.then(async () => { const next = structuredClone(this.data); const value = fn(next); const temp = join(this.directory,'tasks.tmp'); await writeFile(temp, JSON.stringify(next), {mode:0o600}); await rename(temp,join(this.directory,'tasks.json')); this.data = next; return structuredClone(value); }); this.serial = result.catch(()=>{}); return result; }
  async enqueue(raw) { const input = normalizeTask(raw), fingerprint = hash(input); return this.mutate(data => {
    const existing = data.tasks.find(t=>t.key===input.key);
    if (existing) { if (existing.fingerprint!==fingerprint) throw new Error('Mã yêu cầu đã có nội dung khác; tạo mã mới.'); return publicTask(existing,this.now()); }
    if (data.tasks.length >= 5000) throw new Error('Kho đạt 5.000 yêu cầu. Sao lưu và dọn dữ liệu đã xử lý.');
    const task = {...input,id:randomUUID(),fingerprint,status:'pending',createdAt:new Date(this.now()).toISOString(),expiresAt:this.now()+30*60*1000}; data.tasks.push(task); return publicTask(task,this.now());
  }); }
  get(id) { const task = this.data.tasks.find(t=>t.id===id); if (!task) throw new Error('Không tìm thấy yêu cầu.'); return publicTask(task,this.now()); }
  list(status='pending',offset=0,limit=20) { return this.data.tasks.map(t=>publicTask(t,this.now())).filter(t=>t.status===status).slice(offset,offset+limit); }
  // Append-only identity cursor stays stable when earlier pending tasks complete.
  page(status='pending',cursor,limit=10) {
    if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error('Limit phải từ1 đến20.');
    const start=cursor===undefined?-1:this.data.tasks.findIndex(t=>t.id===cursor);
    if(cursor!==undefined&&start<0)throw new Error('Cursor không tồn tại; bắt đầu lại từ trang đầu.');
    const tasks=[];let more=false;
    for(let i=start+1;i<this.data.tasks.length;i++){
      const task=publicTask(this.data.tasks[i],this.now());if(task.status!==status)continue;
      if(tasks.length===limit){more=true;break;}tasks.push(task);
    }
    return {tasks,nextCursor:more?tasks.at(-1).id:null};
  }
  claim(id,raw) {const args=claimInput.parse(raw);return this.mutate(data=>{
    const task=data.tasks.find(t=>t.id===id);if(!task)throw new Error('Không tìm thấy yêu cầu.');
    return this.claimTask(task,args);
  });}
  claimNext(raw) {const args=claimInput.parse(raw);
    // Idle polling must not rewrite the entire durable task file every four seconds.
    if(!this.data.tasks.some(t=>pending(t,this.now())&&(!t.lease||t.lease.expiresAt<=this.now())))return Promise.resolve(null);
    return this.mutate(data=>{
    const now=this.now(),task=data.tasks.find(t=>pending(t,now)&&(!t.lease||t.lease.expiresAt<=now));
    return task?this.claimTask(task,args):null;
  });}
  claimTask(task,args) {
    const now=this.now();requirePending(task,now);
    if(task.lease&&task.lease.expiresAt>now)throw new Error('Yêu cầu đang có lease. Chọn yêu cầu khác; không biên soạn trùng.');
    const leaseToken=randomBytes(32).toString('base64url');
    task.lease={owner:args.owner,tokenHash:hash(leaseToken),expiresAt:Math.min(now+args.ttlMs,task.expiresAt)};
    return {task:publicTask(task,now),leaseToken,leaseExpiresAt:task.lease.expiresAt};
  }
  renew(id,raw) {const args=leaseActionInput.parse(raw);return this.mutate(data=>{
    const task=data.tasks.find(t=>t.id===id);if(!task)throw new Error('Không tìm thấy yêu cầu.');
    const now=this.now();requirePending(task,now);requireLease(task,args.leaseToken,now);
    task.lease.expiresAt=Math.min(now+args.ttlMs,task.expiresAt);
    return {id,leaseExpiresAt:task.lease.expiresAt};
  });}
  release(id,raw) {const args=leaseActionInput.parse(raw);return this.mutate(data=>{
    const task=data.tasks.find(t=>t.id===id);if(!task)throw new Error('Không tìm thấy yêu cầu.');
    requirePending(task,this.now());requireLease(task,args.leaseToken,this.now());delete task.lease;
    return {id,status:'released'};
  });}
  async submit(raw) { return this.mutate(data=> {
    const task=data.tasks.find(t=>t.id===raw.id);if(!task)throw new Error('Không tìm thấy yêu cầu.');
    if(task.status!=='completed')requirePending(task,this.now());
    const {leaseToken,...content}=submissionInput.parse(raw),result=normalizeResult(task,content);
    if(task.status==='completed'){
      if(!matchesToken(task.completionLeaseHash,leaseToken))throw new Error('Lease không sở hữu kết quả đã hoàn tất.');
      if(hash(task.result)!==hash(result))throw new Error('Yêu cầu đã hoàn tất bằng kết quả khác.');
      return publicTask(task,this.now());
    }
    requireLease(task,leaseToken,this.now());
    task.result=result;task.status='completed';task.completedAt=new Date(this.now()).toISOString();
    task.completionLeaseHash=task.lease.tokenHash;delete task.lease;return publicTask(task,this.now());
  }); }
  cancel(id) { return this.mutate(data=> { const task=data.tasks.find(t=>t.id===id); if(!task) throw new Error('Không tìm thấy yêu cầu.'); if(task.status==='pending'){task.status='cancelled';delete task.lease;} return publicTask(task,this.now()); }); }
  summary() { const counts={pending:0,completed:0,cancelled:0,expired:0}; for(const t of this.data.tasks) counts[this.get(t.id).status]++; return {counts,total:this.data.tasks.length}; }
}
