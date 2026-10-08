import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { normalizeTask, normalizeResult } from './contracts.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class TaskStore {
  constructor(directory, now = () => Date.now()) { this.directory = directory; this.now = now; this.serial = Promise.resolve(); this.data = { tasks: [] }; }
  async load() { await mkdir(this.directory, {recursive:true}); try { this.data = JSON.parse(await readFile(join(this.directory,'tasks.json'),'utf8')); if (!Array.isArray(this.data.tasks)) throw new Error('Kho yêu cầu không hợp lệ.'); } catch(e) { if (e.code !== 'ENOENT') throw e; } return this; }
  mutate(fn) { const result = this.serial.then(async () => { const next = structuredClone(this.data); const value = fn(next); const temp = join(this.directory,'tasks.tmp'); await writeFile(temp, JSON.stringify(next), {mode:0o600}); await rename(temp,join(this.directory,'tasks.json')); this.data = next; return structuredClone(value); }); this.serial = result.catch(()=>{}); return result; }
  async enqueue(raw) { const input = normalizeTask(raw), fingerprint = hash(input); return this.mutate(data => {
    const existing = data.tasks.find(t=>t.key===input.key);
    if (existing) { if (existing.fingerprint!==fingerprint) throw new Error('Mã yêu cầu đã có nội dung khác; tạo mã mới.'); return existing; }
    if (data.tasks.length >= 5000) throw new Error('Kho đạt 5.000 yêu cầu. Sao lưu và dọn dữ liệu đã xử lý.');
    const task = {...input,id:randomUUID(),fingerprint,status:'pending',createdAt:new Date(this.now()).toISOString(),expiresAt:this.now()+30*60*1000}; data.tasks.push(task); return task;
  }); }
  get(id) { const task = this.data.tasks.find(t=>t.id===id); if (!task) throw new Error('Không tìm thấy yêu cầu.'); return structuredClone({...task,status:task.status==='pending'&&task.expiresAt<=this.now()?'expired':task.status}); }
  list(status='pending',offset=0,limit=20) { return this.data.tasks.map(t=>this.get(t.id)).filter(t=>t.status===status).slice(offset,offset+limit).map(({fingerprint,...t})=>t); }
  async submit(raw) { return this.mutate(data=> { const task=data.tasks.find(t=>t.id===raw.id); if (!task) throw new Error('Không tìm thấy yêu cầu.'); const result=normalizeResult(task,raw);
    if (task.status==='completed') { if (hash(task.result)!==hash(result)) throw new Error('Yêu cầu đã hoàn tất bằng kết quả khác.'); return task; }
    if (task.status!=='pending'||task.expiresAt<=this.now()) throw new Error('Yêu cầu đã hủy hoặc hết hạn; không nhận kết quả muộn.');
    task.result=result; task.status='completed'; task.completedAt=new Date(this.now()).toISOString(); return task;
  }); }
  cancel(id) { return this.mutate(data=> { const task=data.tasks.find(t=>t.id===id); if(!task) throw new Error('Không tìm thấy yêu cầu.'); if(task.status==='pending') task.status='cancelled'; return task; }); }
  summary() { const counts={pending:0,completed:0,cancelled:0,expired:0}; for(const t of this.data.tasks) counts[this.get(t.id).status]++; return {counts,total:this.data.tasks.length}; }
}
