import express from 'express';
import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ChatGPTPlan, protectDirectory } from '../server/chatgpt-plan.mjs';
import { PlanWorker } from '../server/plan-worker.mjs';
import { pairingConfig } from '../extension/composer.mjs';

const directory=resolve(process.env.LINKDESK_DATA_DIR||'.linkdesk-data');
const privateDirectory=join(directory,'chatgpt');
await protectDirectory(privateDirectory);
const lockPath=join(privateDirectory,'worker.lock');
let lock;try{lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));}catch{throw new Error('Có worker khác hoặc worker.lock từ phiên bị ngắt. Kiểm tra tiến trình trước khi dọn lock.');}
const plan=await new ChatGPTPlan(privateDirectory).load();
const pairing=pairingConfig(JSON.parse(await readFile(join(directory,'pairing.json'),'utf8')));
const request=async(path,body)=>{const r=await fetch(pairing.url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${pairing.token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),redirect:'error'});const v=await r.json();if(!r.ok)throw new Error(v.error||'Cầu nối không phản hồi.');return v;};
const configPath=join(plan.directory,'worker.json');
const save=async c=>{await writeFile(configPath+'.tmp',JSON.stringify(c),{mode:0o600});await rename(configPath+'.tmp',configPath);};
let config={enabled:false,model:'',remaining:0};
try{config=JSON.parse(await readFile(configPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Không đọc được cấu hình AI.');}
if(typeof config.enabled!=='boolean'||typeof config.model!=='string'||!Number.isInteger(config.remaining)||config.remaining<0||config.remaining>50)throw new Error('Cấu hình AI không hợp lệ.');
const worker=new PlanWorker({plan,request,save,config});
const port=8791,origin=`http://127.0.0.1:${port}`,csrf=randomBytes(32).toString('base64url');
let models=[],notice='';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const form=(path,content)=>`<form method="post" action="${path}"><input type="hidden" name="csrf" value="${csrf}">${content}</form>`;
const app=express();app.disable('x-powered-by');
app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://auth.openai.com; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});if(req.get('host')!==`127.0.0.1:${port}`)return res.sendStatus(403);next();});
app.use(express.urlencoded({extended:false,limit:'4kb'}));
app.use((req,res,next)=>{if(req.method==='POST'&&(req.get('origin')!==origin||req.body.csrf!==csrf))return res.sendStatus(403);next();});
const run=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){notice=e.message;res.redirect(303,'/');}};
app.get('/',(req,res)=>res.type('html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LinkDesk · AI tự động</title><style>body{font:17px system-ui;background:#f4f6f2;color:#173c32;max-width:850px;margin:45px auto;padding:24px}section{background:white;border-radius:14px;padding:28px;margin:22px 0}button,select,input{font:inherit;padding:12px;border:1px solid #9aafa4;border-radius:8px}button{background:#245c49;color:white;cursor:pointer}form{margin:16px 0}label{display:block;margin:10px 0}a{color:#245c49}small{color:#4d6258}</style><h1>LinkDesk · AI tự động</h1><p>Dùng gói ChatGPT tại máy, không cần AI API key và không cần nhập prompt cho từng yêu cầu.</p><section><h2>Tài khoản ChatGPT</h2><p>${esc(notice||'Đăng nhập và cấp quyền dùng gói ChatGPT cho LinkDesk một lần.')}</p>${form('/login','<button>Continue with ChatGPT</button>')}<p>${plan.list().length?'Các tài khoản đã lưu:':'Chưa kết nối tài khoản dùng gói ChatGPT.'}</p>${plan.list().map(a=>form('/account',`<input type="hidden" name="clientId" value="${esc(a.clientId)}"><button>${esc(a.label)}${a.active?' · đang chọn':''}</button><small> ${a.enabled?'Có quyền dùng gói ChatGPT':'Cần đăng nhập/cấp quyền'}</small>`)).join('')}${form('/reauth','<button>Đăng nhập lại tài khoản đang chọn</button>')}${form('/models','<button>Kiểm tra model</button>')}${form('/logout','<button>Ngắt tài khoản đang chọn</button>')}<a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Quản lý hạn mức trong ChatGPT</a></section><section><h2>Biên soạn tự động</h2><p>Dùng gói ChatGPT · ${config.enabled?'Đang bật':'Đang dừng'} · Còn ${config.remaining} yêu cầu.</p><p>${esc(worker.message)}</p>${form('/start',`<label for="model">Model của tài khoản</label><select id="model" name="model" required>${models.map(m=>`<option value="${esc(m.slug)}"${m.slug===config.model?' selected':''}>${esc(m.name)}</option>`).join('')}</select><label for="limit">Giới hạn yêu cầu cho phiên (1–50)</label><input id="limit" name="limit" type="number" min="1" max="50" value="10" required><p><button>Bắt đầu biên soạn tự động</button></p>`)}${form('/stop','<button>Dừng biên soạn</button>')}<p>Worker đọc hàng đợi mỗi 4 giây, chỉ gửi kết quả đã hoàn tất. LinkDesk gắn nguyên link affiliate. Worker tự dừng khi lỗi/quá hạn mức; không tự đăng Facebook.</p><small>Giữ broker và worker chạy. Có thể đóng trang này sau khi bắt đầu. Khởi động lại worker giữ số yêu cầu còn lại; không tự nạp thêm hạn mức.</small></section></html>`));
const signInPage=(res,url)=>res.type('html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><title>LinkDesk · Đăng nhập ChatGPT</title><h1>Đăng nhập để LinkDesk dùng gói ChatGPT</h1><p>Trang OpenAI sẽ cho bạn chọn tài khoản và quyền dùng gói ChatGPT. LinkDesk chỉ nhận phiên do bạn cấp quyền, không đọc cookie Chrome.</p><p><a href="${esc(url)}">Continue with ChatGPT → OpenAI</a></p><p><a href="/">Quay lại cấu hình LinkDesk</a></p></html>`);
app.post('/login',run(async(req,res)=>{await worker.pause();signInPage(res,plan.begin(origin+'/auth/callback'));}));
app.post('/reauth',run(async(req,res)=>{await worker.pause();if(!plan.account())throw new Error('Chọn hoặc thêm tài khoản trước.');signInPage(res,plan.begin(origin+'/auth/callback',plan.account().clientId));}));
app.get('/auth/callback',run(async(req,res)=>{const enabled=await plan.callback(req.query);models=[];notice=enabled?'Đã cấp quyền dùng gói ChatGPT. Bấm Kiểm tra model để chọn và chạy.':'Đã đăng nhập, chưa cấp quyền dùng gói ChatGPT. Đăng nhập lại để cấp quyền.';res.redirect(303,'/');}));
app.post('/account',run(async(req,res)=>{await worker.pause();await plan.select(req.body.clientId);models=[];notice='Đã chọn tài khoản. Kiểm tra model trước khi chạy.';res.redirect(303,'/');}));
app.post('/models',run(async(req,res)=>{models=await plan.models();notice=models.length?'Đã đọc model; cần một yêu cầu hoàn tất để xác minh AI hoạt động.':'Tài khoản chưa trả model khả dụng.';res.redirect(303,'/');}));
app.post('/start',run(async(req,res)=>{if(worker.busy)throw new Error('Đợi tác vụ đang xử lý dừng trước khi bắt đầu phiên mới.');const n=Number(req.body.limit);if(!Number.isInteger(n)||n<1||n>50)throw new Error('Giới hạn phiên từ 1 đến 50.');const current=await plan.models();if(!current.some(m=>m.slug===req.body.model))throw new Error('Chọn model của tài khoản đang dùng.');Object.assign(config,{enabled:true,model:req.body.model,remaining:n});await save(config);notice='Đã bật tự biên soạn. Không cần mở ChatGPT để nhập prompt.';res.redirect(303,'/');}));
app.post('/stop',run(async(req,res)=>{await worker.pause();notice='Đã dừng. Kết quả đến sau khi dừng sẽ không được gửi.';res.redirect(303,'/');}));
app.post('/logout',run(async(req,res)=>{await worker.pause();const revoked=await plan.signOut();models=[];notice=revoked?'Đã ngắt phiên và xóa token tại máy.':'Đã xóa token tại máy; chưa xác nhận thu hồi từ xa. Ngắt LinkDesk trong ChatGPT Settings nếu cần.';res.redirect(303,'/');}));
let server;
try{server=await new Promise((ok,no)=>{const s=app.listen(port,'127.0.0.1');s.once('listening',()=>ok(s));s.once('error',no);});}catch(e){await lock.close();await unlink(lockPath);throw e;}
const interval=setInterval(()=>void worker.tick(),4000);
const shutdown=async()=>{clearInterval(interval);worker.controller?.abort();await new Promise(done=>server.close(done));await lock.close();await unlink(lockPath);process.exit(0);};
process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
process.stdout.write(`LinkDesk AI tự động: ${origin}\nOAuth và token chỉ lưu trong thư mục riêng; không đọc cookie Chrome.\n`);
