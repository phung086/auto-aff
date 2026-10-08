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

export async function createApps({store,deviceToken,ownerCode,publicOrigin}) {
  const device=express();device.disable('x-powered-by');device.use(express.json({limit:'64kb'}));
  device.use((req,res,next)=>{res.set('Cache-Control','no-store');if(!/^127\.0\.0\.1(?::\d+)?$/.test(req.get('host')||''))return res.sendStatus(403);if(!safeEqual(req.get('authorization'),`Bearer ${deviceToken}`))return res.sendStatus(401);next();});
  const attempt = fn => async(req,res,next)=>{try{res.json(await fn(req));}catch(e){next(e);}};
  device.get('/health',attempt(()=>({ok:true,version:'0.2.0',mcpUrl:publicOrigin?`${publicOrigin}/mcp`:null,chatgptVerified:false})));
  device.post('/tasks',attempt(req=>store.enqueue(req.body)));
  device.get('/tasks',attempt(req=>{const args=z.object({status:z.enum(['pending','completed','cancelled','expired']).default('pending'),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(20).default(10)}).parse(req.query);return {tasks:store.list(args.status,args.offset,args.limit)};}));
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
  remote.post('/consent',express.urlencoded({extended:false,limit:'4kb'}),(req,res)=>{try{if(req.get('origin')!==origin.origin)return res.sendStatus(403);res.redirect(provider.consent(req.body.nonce,req.body.code));}catch{res.status(400).send('Kết nối không thành công. Kiểm tra mã và bắt đầu lại trong ChatGPT.');}});
  remote.post('/mcp',requireBearerAuth({verifier:provider,requiredScopes:['compose'],resourceMetadataUrl:`${origin.origin}/.well-known/oauth-protected-resource/mcp`}),express.json({limit:'64kb'}),async(req,res)=>{
    const server=createMcp(store),transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,allowedHosts:[origin.host],allowedOrigins:[origin.origin],enableDnsRebindingProtection:true});
    res.on('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{});});
    try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}catch{if(!res.headersSent)res.status(500).json({error:'Không xử lý được yêu cầu MCP.'});}
  });
  remote.all('/mcp',(req,res)=>res.sendStatus(405));
  return {device,remote,provider};
}
export async function start() {
  const directory=resolve(process.env.LINKDESK_DATA_DIR||'.linkdesk-data');await mkdir(directory,{recursive:true});
  if(process.argv.includes('--stdio')){
    const config=JSON.parse(await readFile(join(directory,'pairing.json'),'utf8'));
    if(config.url!=='http://127.0.0.1:8787'||!/^[A-Za-z0-9_-]{43}$/.test(config.token))throw new Error('Ghép broker trước khi chạy stdio.');
    const request=async(path,body)=>{const res=await fetch(config.url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Khởi động broker local trước.');return data;};
    const proxy={list:async(status,offset,limit)=>(await request(`/tasks?status=${status}&offset=${offset}&limit=${limit}`)).tasks,get:id=>request(`/tasks/${id}`),submit:body=>request('/results',body),summary:()=>request('/summary')};
    await createMcp(proxy).connect(new StdioServerTransport());return;
  }
  const store=await new TaskStore(directory).load();
  const secret=()=>randomBytes(32).toString('base64url');let config;
  try{config=JSON.parse(await readFile(join(directory,'pairing.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;config={url:'http://127.0.0.1:8787',token:secret()};await writeFile(join(directory,'pairing.json'),JSON.stringify(config,null,2),{mode:0o600});}
  const ownerCode=secret();await writeFile(join(directory,'owner-code.txt'),ownerCode,{mode:0o600});
  const publicOrigin=process.env.LINKDESK_PUBLIC_ORIGIN||'';
  const apps=await createApps({store,deviceToken:config.token,ownerCode,publicOrigin});
  await new Promise((done,fail)=>{const s=apps.device.listen(8787,'127.0.0.1',done);s.on('error',fail);});
  if(apps.remote)await new Promise((done,fail)=>{const s=apps.remote.listen(8790,'127.0.0.1',done);s.on('error',fail);});
  process.stderr.write(`LinkDesk 0.2.0 sẵn sàng. Ghép Chrome bằng ${join(directory,'pairing.json')}\n${publicOrigin?`MCP: ${publicOrigin}/mcp`:'Chưa có địa chỉ HTTPS cho ChatGPT. Xem docs/PLUGIN_SETUP.md.'}\nMã chủ sở hữu chỉ lưu trong ${join(directory,'owner-code.txt')}\n`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)start().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
