import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { TaskStore } from './store.mjs';
import { createMcp } from './mcp.mjs';
import { OwnerOAuth, safeEqual } from './oauth.mjs';
import { z } from 'zod';
import { claimInput, leaseActionInput } from './contracts.mjs';

export function createConsentHandler(provider,expectedOrigin) {
  return (req,res)=>{
    if(req.get('origin')!==expectedOrigin)return res.status(403).type('text/plain').send('Nguồn gửi không hợp lệ. Bắt đầu lại kết nối từ ChatGPT.');
    try{res.redirect(303,provider.consent(req.body?.nonce,req.body?.code));}
    catch(error){
      const messages={
        'Yêu cầu kết nối đã hết hạn.':'Phiên kết nối đã hết hạn hoặc đã dùng. Mở LinkDesk trong ChatGPT và bắt đầu lại kết nối để tạo phiên mới.',
        'Mã chủ sở hữu không đúng.':'Mã không đúng. Sao chép mã hiện tại trong owner-code.txt; không dùng nội dung pairing.json.',
        'Quá số lần nhập.':'Đã vượt giới hạn 5 lần nhập mã. Bắt đầu lại kết nối từ ChatGPT.',
      };
      res.status(400).type('text/plain').send(messages[error.message]||'Cầu nối gặp lỗi xử lý kết nối. Kiểm tra cầu nối trước khi thử lại.');
    }
  };
}

export async function createApps({store,deviceToken,ownerCode,publicOrigin}) {
  const device=express();device.disable('x-powered-by');device.use(express.json({limit:'64kb'}));
  device.use((req,res,next)=>{res.set('Cache-Control','no-store');if(!/^127\.0\.0\.1(?::\d+)?$/.test(req.get('host')||''))return res.sendStatus(403);if(!safeEqual(req.get('authorization'),`Bearer ${deviceToken}`))return res.sendStatus(401);next();});
  const attempt = fn => async(req,res,next)=>{try{res.json(await fn(req));}catch(e){next(e);}};
  device.get('/health',attempt(()=>({ok:true,version:'0.2.0',mcpUrl:publicOrigin?`${publicOrigin}/mcp`:null,chatgptVerified:false})));
  device.post('/tasks',attempt(req=>store.enqueue(req.body)));
  device.get('/tasks',attempt(req=>{const args=z.object({status:z.enum(['pending','completed','cancelled','expired']).default('pending'),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(20).default(10)}).parse(req.query);return {tasks:store.list(args.status,args.offset,args.limit)};}));
  device.get('/task-page',attempt(req=>{const args=z.object({status:z.enum(['pending','completed','cancelled','expired']).default('pending'),cursor:z.string().uuid().optional(),limit:z.coerce.number().int().min(1).max(20).default(10)}).strict().parse(req.query);return store.page(args.status,args.cursor,args.limit);}));
  device.post('/task-claims',attempt(req=>store.claimNext(claimInput.parse(req.body))));
  device.post('/tasks/:id/claim',attempt(req=>store.claim(req.params.id,claimInput.parse(req.body))));
  device.post('/tasks/:id/renew',attempt(req=>store.renew(req.params.id,leaseActionInput.parse(req.body))));
  device.post('/tasks/:id/release',attempt(req=>store.release(req.params.id,leaseActionInput.parse(req.body))));
  device.get('/summary',attempt(()=>store.summary()));
  device.post('/results',attempt(req=>store.submit(req.body)));
  device.get('/tasks/:id',attempt(req=>store.get(req.params.id)));
  device.post('/tasks/:id/cancel',attempt(req=>store.cancel(req.params.id)));
  device.use((err,req,res,next)=>res.status(400).json({error:err instanceof SyntaxError?'JSON không hợp lệ.':err.message}));
  if(!publicOrigin)return {device};
  const origin=new URL(publicOrigin);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PUBLIC_ORIGIN phải là HTTPS origin, không có đường dẫn.');
  const remote=express();remote.disable('x-powered-by');
  remote.use((req,res,next)=>{if(req.get('host')!==origin.host)return res.sendStatus(403);res.set('Cache-Control','no-store');next();});
  const provider=new OwnerOAuth(ownerCode,`${origin.origin}/mcp`);
  remote.use(mcpAuthRouter({provider,issuerUrl:origin,resourceServerUrl:new URL('/mcp',origin),scopesSupported:['compose'],resourceName:'LinkDesk Composer'}));
  remote.post('/consent',express.urlencoded({extended:false,limit:'4kb'}),createConsentHandler(provider,origin.origin));
  remote.post('/mcp',requireBearerAuth({verifier:provider,requiredScopes:['compose'],resourceMetadataUrl:`${origin.origin}/.well-known/oauth-protected-resource/mcp`}),express.json({limit:'64kb'}),async(req,res)=>{
    const server=createMcp(store),transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,allowedHosts:[origin.host],allowedOrigins:[origin.origin],enableDnsRebindingProtection:true});
    res.on('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{});});
    try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}catch{if(!res.headersSent)res.status(500).json({error:'Không xử lý được yêu cầu MCP.'});}
  });
  remote.all('/mcp',(req,res)=>res.sendStatus(405));
  return {device,remote,provider};
}
export async function start({directory=resolve(process.env.LINKDESK_DATA_DIR||'.linkdesk-data'),devicePort=8787,remotePort=8790,publicOrigin=process.env.LINKDESK_PUBLIC_ORIGIN||''}={}) {
  await mkdir(directory,{recursive:true});
  if(process.argv.includes('--stdio')){
    const config=JSON.parse(await readFile(join(directory,'pairing.json'),'utf8'));
    if(config.url!=='http://127.0.0.1:8787'||!/^[A-Za-z0-9_-]{43}$/.test(config.token))throw new Error('Ghép broker trước khi chạy stdio.');
    const request=async(path,body)=>{const res=await fetch(config.url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Khởi động broker local trước.');return data;};
    const proxy=createDeviceStoreProxy(request);
    await createMcp(proxy).connect(new StdioServerTransport());return;
  }
  const store=await new TaskStore(directory).load();
  const secret=()=>randomBytes(32).toString('base64url');let config;
  try{config=JSON.parse(await readFile(join(directory,'pairing.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;config={url:'http://127.0.0.1:8787',token:secret()};await writeFile(join(directory,'pairing.json'),JSON.stringify(config,null,2),{mode:0o600});}
  const ownerPath=join(directory,'owner-code.txt');let ownerCode,ownerExists=false;
  try{ownerCode=(await readFile(ownerPath,'utf8')).trim();ownerExists=true;}
  catch(error){if(error.code!=='ENOENT')throw error;ownerCode=secret();}
  if(!/^[A-Za-z0-9_-]{43}$/.test(ownerCode))throw new Error('owner-code.txt không hợp lệ. Khôi phục mã trước khi khởi động; không tự thay mã.');
  const apps=await createApps({store,deviceToken:config.token,ownerCode,publicOrigin});
  const servers=[];
  const close=()=>Promise.all(servers.map(server=>new Promise(done=>server.close(()=>done()))));
  const listen=(app,port)=>new Promise((done,fail)=>{const server=app.listen(port,'127.0.0.1');servers.push(server);server.once('listening',done);server.once('error',fail);});
  try{
    await listen(apps.device,devicePort);
    if(apps.remote)await listen(apps.remote,remotePort);
    // A failed second launch must never overwrite the running broker's owner code.
    if(!ownerExists)await writeFile(ownerPath,ownerCode,{mode:0o600,flag:'wx'});
  }catch(error){await close();throw error;}
  process.stderr.write(`LinkDesk 0.2.0 sẵn sàng. Ghép Chrome bằng ${join(directory,'pairing.json')}\n${publicOrigin?`MCP: ${publicOrigin}/mcp`:'Chưa có địa chỉ HTTPS cho ChatGPT. Xem docs/PLUGIN_SETUP.md.'}\nMã chủ sở hữu chỉ lưu trong ${join(directory,'owner-code.txt')}\n`);
  return {...apps,servers,close};
}
export function createDeviceStoreProxy(request) {
  return {
    list:async(status,offset,limit)=>(await request(`/tasks?status=${status}&offset=${offset}&limit=${limit}`)).tasks,
    page:(status,cursor,limit)=>request('/task-page?'+new URLSearchParams({status,limit:String(limit),...(cursor===undefined?{}:{cursor})})),
    get:id=>request(`/tasks/${id}`),submit:body=>request('/results',body),summary:()=>request('/summary'),
    claim:(id,body)=>request(`/tasks/${id}/claim`,body),
    renew:(id,body)=>request(`/tasks/${id}/renew`,body),release:(id,body)=>request(`/tasks/${id}/release`,body),
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)start().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
