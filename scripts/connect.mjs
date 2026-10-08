import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
const binary=process.env.LINKDESK_CLOUDFLARED || 'cloudflared';
let tunnel,server;
const stop=()=>{tunnel?.kill();server?.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
try {
  const probe=spawn(binary,['--version'],{stdio:'ignore',windowsHide:true});
  const [code]=await once(probe,'exit');if(code!==0)throw new Error('Không chạy được cloudflared.');
  tunnel=spawn(binary,['tunnel','--url','http://127.0.0.1:8790','--no-autoupdate'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let buffer='';const origin=await new Promise((done,fail)=>{
    const timer=setTimeout(()=>fail(new Error('Tunnel chưa cấp địa chỉ sau30 giây. Kiểm tra mạng.')),30000);
    const read=chunk=>{buffer=(buffer+chunk.toString()).slice(-12000);const match=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(match){clearTimeout(timer);done(match[0]);}};
    tunnel.stdout.on('data',read);tunnel.stderr.on('data',read);tunnel.on('error',e=>{clearTimeout(timer);fail(e);});tunnel.once('exit',()=>{clearTimeout(timer);fail(new Error('Tunnel dừng trước khi có địa chỉ.'));});
  });
  server=spawn(process.execPath,[resolve('server/index.mjs')],{stdio:'inherit',windowsHide:true,env:{...process.env,LINKDESK_PUBLIC_ORIGIN:origin}});
  process.stderr.write(`Địa chỉ MCP cho ChatGPT: ${origin}/mcp\nQuick Tunnel dùng để thử nghiệm; dừng lệnh này sẽ ngắt kết nối.\n`);
  tunnel.once('exit',()=>server?.kill());
  const [serverCode]=await once(server,'exit');process.exitCode=serverCode||0;
}catch(e){process.stderr.write(`Chưa khởi động kết nối: ${e.message}\nCài cloudflared từ https://developers.cloudflare.com/tunnel/downloads/ hoặc đặt LINKDESK_CLOUDFLARED.\n`);process.exitCode=1;}
finally{stop();}
