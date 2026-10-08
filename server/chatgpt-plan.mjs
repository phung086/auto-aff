import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH='https://auth.openai.com', RESOURCE='https://api.openai.com/v1';
const scopes='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const random=()=>randomBytes(32).toString('base64url');
export async function protectDirectory(directory) {
  await mkdir(directory,{recursive:true,mode:0o700});
  if(process.platform==='win32') {
    const run=promisify(execFile);
    const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{windowsHide:true});
    const sid=stdout.trim();if(!/^S-1-\d+(?:-\d+)+$/.test(sid))throw new Error('Không xác định được quyền thư mục riêng.');
    await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],{windowsHide:true});
  }
}
async function atomic(path,value) {
  const temporary=path+'.tmp';
  await writeFile(temporary,JSON.stringify(value,null,2),{mode:0o600});
  await rename(temporary,path);
}
export class ChatGPTPlan {
  constructor(directory,{fetcher=fetch,verify=jwtVerify,jwks,now=()=>Date.now()}={}) {
    this.directory=directory;this.fetcher=fetcher;this.verify=verify;this.now=now;
    this.jwks=jwks||createRemoteJWKSet(new URL(AUTH+'/.well-known/jwks.json'));
    this.pending=null;this.data={hostId:'urn:uuid:'+randomUUID(),accounts:[],active:null};
  }
  async load() {
    await protectDirectory(this.directory);
    try{this.data=JSON.parse(await readFile(join(this.directory,'accounts.json'),'utf8'));}
    catch(e){if(e.code!=='ENOENT')throw new Error('Không đọc được tài khoản AI đã lưu.');await this.save();}
    if(!Array.isArray(this.data.accounts)||!this.data.hostId)throw new Error('Kho tài khoản AI không hợp lệ.');return this;
  }
  save(){return atomic(join(this.directory,'accounts.json'),this.data);}
  account(){return this.data.accounts.find(a=>a.clientId===this.data.active);}
  list(){return this.data.accounts.map(a=>({clientId:a.clientId,label:a.email||a.subject,active:a.clientId===this.data.active,enabled:!!a.accessToken&&a.scopes?.includes('chatgpt.tokens.use.direct')}));}
  begin(redirectUri,clientId) {
    const old=clientId?this.data.accounts.find(a=>a.clientId===clientId):undefined;
    if(clientId&&!old)throw new Error('Tài khoản không tồn tại.');
    const p={state:random(),nonce:random(),verifier:random(),redirectUri,clientId:old?.clientId,subject:old?.subject,expires:this.now()+10*60*1000};
    this.pending=p;
    const q=new URLSearchParams({client_id:p.clientId||'dynamic_agent_client',ext_agent_host_id:this.data.hostId,response_type:'code',redirect_uri:redirectUri,scope:scopes,resource:RESOURCE,state:p.state,nonce:p.nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(p.verifier).digest('base64url')});
    if(!old)q.set('agent_name_hint','LinkDesk');
    if(old?.idToken)q.set('id_token_hint',old.idToken);
    return AUTH+'/api/accounts/authorize?'+q;
  }
  async tokenRequest(fields) {
    const r=await this.fetcher(AUTH+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,resource:RESOURCE}),signal:AbortSignal.timeout(30000),redirect:'error'});
    if(!r.ok)throw new Error('OpenAI không chấp nhận phiên đăng nhập. Đăng nhập lại tại trang AI.');
    const t=await r.json();
    if(!t.access_token||t.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(t.expires_in)||t.expires_in<=0)throw new Error('Phản hồi đăng nhập không hợp lệ.');
    return t;
  }
  async callback(query) {
    const p=this.pending;
    if(!p||this.now()>=p.expires||typeof query.state!=='string'||query.state!==p.state)throw new Error('Phiên đăng nhập đã hết hạn hoặc không khớp. Bắt đầu lại.');
    this.pending=null;
    if(query.error)throw new Error('Chưa cấp quyền dùng gói ChatGPT.');
    const clientId=p.clientId||query.client_id;
    if(typeof query.code!=='string'||typeof clientId!=='string'||!clientId||clientId==='dynamic_agent_client'||(p.clientId&&query.client_id&&query.client_id!==p.clientId))throw new Error('Đăng ký tài khoản chưa hoàn tất.');
    const t=await this.tokenRequest({grant_type:'authorization_code',client_id:clientId,code:query.code,code_verifier:p.verifier,redirect_uri:p.redirectUri});
    if(!t.id_token)throw new Error('Thiếu danh tính đã xác thực.');
    const {payload}=await this.verify(t.id_token,this.jwks,{issuer:AUTH,audience:clientId,requiredClaims:['sub','exp','nonce']});
    if(payload.nonce!==p.nonce||!payload.sub||(p.subject&&payload.sub!==p.subject))throw new Error('Danh tính tài khoản không khớp.');
    const a={clientId,subject:payload.sub,email:payload.email||'',idToken:t.id_token,accessToken:t.access_token,refreshToken:t.refresh_token,scopes:String(t.scope||'').split(' '),expiresAt:this.now()+t.expires_in*1000};
    this.data.accounts=this.data.accounts.filter(v=>v.clientId!==clientId);this.data.accounts.push(a);this.data.active=clientId;await this.save();
    return a.scopes.includes('chatgpt.tokens.use.direct');
  }
  async select(clientId){if(!this.data.accounts.some(a=>a.clientId===clientId))throw new Error('Không tìm thấy tài khoản.');this.data.active=clientId;await this.save();}
  async access() {
    const a=this.account();if(!a?.accessToken||!a.scopes?.includes('chatgpt.tokens.use.direct'))throw new Error('Cần đăng nhập và cấp quyền dùng gói ChatGPT.');
    if(a.expiresAt>this.now()+60000)return a.accessToken;
    if(!this.refreshing)this.refreshing=(async()=>{
      if(!a.refreshToken)throw new Error('Phiên cần đăng nhập lại.');
      const t=await this.tokenRequest({grant_type:'refresh_token',client_id:a.clientId,refresh_token:a.refreshToken});
      if(!t.refresh_token)throw new Error('Thiếu phiên làm mới; cần đăng nhập lại.');
      Object.assign(a,{accessToken:t.access_token,refreshToken:t.refresh_token,expiresAt:this.now()+t.expires_in*1000,...(t.scope?{scopes:t.scope.split(' ')}:{})});await this.save();
      if(!a.scopes.includes('chatgpt.tokens.use.direct'))throw new Error('Quyền dùng gói ChatGPT đã bị thu hồi.');return a.accessToken;
    })().finally(()=>{this.refreshing=null;});
    return this.refreshing;
  }
  async models(){const token=await this.access();const r=await this.fetcher(RESOURCE+'/models',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw new Error('Chưa đọc được model cho tài khoản này.');const v=await r.json();return (v.models||[]).filter(m=>m.visibility==='list'&&typeof m.slug==='string').map(m=>({slug:m.slug,name:m.display_name||m.slug}));}
  async signOut() {
    if(this.refreshing)await this.refreshing.catch(()=>{});
    const a=this.account();if(!a)return true;let revoked=false;
    try{const d=await this.fetcher(AUTH+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(10000),redirect:'error'});const c=await d.json();const u=new URL(c.revocation_endpoint);if(u.origin!==AUTH)throw new Error('Endpoint không hợp lệ.');const r=await this.fetcher(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:a.refreshToken||a.accessToken,token_type_hint:a.refreshToken?'refresh_token':'access_token',client_id:a.clientId}),signal:AbortSignal.timeout(15000),redirect:'error'});revoked=r.status===200;}catch{}
    delete a.accessToken;delete a.refreshToken;delete a.idToken;await this.save();return revoked;
  }
}
export async function completedResponse(fetcher,token,body,signal) {
  const r=await fetcher(RESOURCE+'/responses',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...body,store:false,stream:true}),signal,redirect:'error'});
  if(!r.ok){const raw=await r.json().catch(()=>({}));const code=raw.error?.code;throw new Error(`OpenAI HTTP ${r.status}${/^[a-z_]+$/.test(code||'')?' · '+code:''}. Kiểm tra quyền và giới hạn tại ChatGPT Settings → Usage.`);}
  let buffer='',text='',completed=false,bytes=0;const decoder=new TextDecoder();
  const event=block=>{
    const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
    if(!data||data==='[DONE]')return;
    const e=JSON.parse(data);
    if(e.type==='response.output_text.delta')text+=e.delta||'';
    if(e.type==='response.failed'||e.type==='response.incomplete'||e.type==='error')throw new Error('OpenAI chưa hoàn tất kết quả. Không ghi bản thảo từ luồng lỗi.');
    if(e.type==='response.completed'){
      if(e.response?.status!=='completed')throw new Error('Kết quả AI chưa hoàn tất.');
      completed=true;
      const full=e.response?.output?.flatMap(i=>i.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');if(full)text=full;
    }
  };
  if(!r.body)throw new Error('Thiếu luồng AI.');
  for await(const chunk of r.body){bytes+=chunk.byteLength;if(bytes>2*1024*1024)throw new Error('Luồng AI vượt giới hạn.');buffer+=decoder.decode(chunk,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');let at;while((at=buffer.indexOf('\n\n'))>=0){event(buffer.slice(0,at));buffer=buffer.slice(at+2);}}
  buffer+=decoder.decode();if(buffer.trim())event(buffer);
  if(!completed||!text.trim())throw new Error('Luồng dừng trước response.completed. Chưa có kết quả.');return text;
}
