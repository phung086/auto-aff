import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

const schema=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('quick')}).strict(),
  z.object({mode:z.literal('named'),publicOrigin:z.string(),tokenFile:z.string().min(1)}).strict(),
  z.object({mode:z.literal('external'),publicOrigin:z.string()}).strict(),
]);
export function stableOrigin(raw) {
  let url;try{url=new URL(raw);}catch{throw new Error('publicOrigin phải là HTTPS origin cố định.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||
    !url.hostname.includes('.')||url.hostname==='trycloudflare.com'||url.hostname.endsWith('.trycloudflare.com')||
    url.hostname.endsWith('.')||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||/^[\d.]+$/.test(url.hostname)||url.hostname.startsWith('['))
    throw new Error('publicOrigin phải là hostname HTTPS cố định, không phải URL tạm, IP hoặc đường dẫn /mcp.');
  return url.origin;
}
export async function loadConnectionConfig({directory=resolve(process.env.LINKDESK_DATA_DIR||'.linkdesk-data'),file=process.env.LINKDESK_CONNECTION_FILE}={}) {
  const path=file?resolve(file):resolve(directory,'connection.json');
  let raw;try{raw=JSON.parse(await readFile(path,'utf8'));}catch(error){
    if(error.code==='ENOENT'&&!file)return {mode:'quick'};
    throw new Error('Không đọc được connection.json. Sửa cấu hình; không tự đổi sang Quick Tunnel.');
  }
  const parsed=schema.safeParse(raw);
  if(!parsed.success)throw new Error('connection.json không hợp lệ: chọn quick, named hoặc external; kiểm tra các trường cấu hình.');
  const config=parsed.data;if(config.mode==='quick')return config;
  config.publicOrigin=stableOrigin(config.publicOrigin);
  if(config.mode==='named'){
    config.tokenFile=resolve(dirname(path),config.tokenFile);
    let token;try{token=(await readFile(config.tokenFile,'utf8')).trim();}catch{throw new Error('Không đọc được file token Cloudflare. Lưu token tại máy, không gửi vào chat.');}
    if(!token||/\s/.test(token))throw new Error('File token Cloudflare trống hoặc chứa nhiều dòng.');
  }
  return config;
}
export function tunnelArguments(config) {
  if(config.mode==='external')return null;
  if(config.mode==='named')return ['tunnel','--no-autoupdate','run','--token-file',config.tokenFile];
  return ['tunnel','--url','http://127.0.0.1:8790','--no-autoupdate'];
}
