import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { loadConnectionConfig, tunnelArguments } from './connection-config.mjs';
import { start } from '../server/index.mjs';
const binary=process.env.LINKDESK_CLOUDFLARED || 'cloudflared';
let tunnel,broker,stopping=false,tunnelDone;
async function stop(){if(stopping)return;stopping=true;tunnel?.kill();await broker?.close();}
function launch(args){
  tunnel=spawn(binary,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});
  tunnelDone=new Promise(done=>{tunnel.once('exit',(code,signal)=>done({code,signal}));tunnel.once('error',()=>done({error:true}));});
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try {
  const config=await loadConnectionConfig();
  let origin=config.publicOrigin;
  const args=tunnelArguments(config);
  if(args){
    const probe=spawn(binary,['--version'],{stdio:'ignore',windowsHide:true});
    const [code]=await once(probe,'exit');if(code!==0)throw new Error('Không chạy được cloudflared.');
  }
  if(config.mode==='quick'){
    launch(args);
    let buffer='';origin=await new Promise((done,fail)=>{
      const timer=setTimeout(()=>fail(new Error('Tunnel chưa cấp địa chỉ sau 30 giây. Kiểm tra mạng.')),30000);
      const read=chunk=>{buffer=(buffer+chunk.toString()).slice(-12000);const match=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(match){clearTimeout(timer);done(match[0]);}};
      tunnel.stdout.on('data',read);tunnel.stderr.on('data',read);
      tunnel.once('error',()=>{clearTimeout(timer);fail(new Error('Không khởi động được tunnel.'));});
      tunnel.once('exit',()=>{clearTimeout(timer);fail(new Error('Tunnel dừng trước khi có địa chỉ.'));});
    });
  }
  if(stopping)throw new Error('Đã dừng kết nối.');
  // Await binding before connecting a named tunnel. Do not expose another broker after a bind error.
  broker=await start({publicOrigin:origin});
  if(config.mode==='named'){
    launch(args);
    // Do not echo configuration/token details from cloudflared into public logs.
    tunnel.stdout.resume();tunnel.stderr.resume();
  }
  process.stderr.write(`Địa chỉ MCP: ${origin}/mcp\nChế độ: ${config.mode}. ${config.mode==='quick'?'URL tạm dùng thử; restart đổi địa chỉ.':'URL cố định theo cấu hình; không đổi sang URL tạm. Chưa xác minh DNS/tunnel từ Internet.'}\n`);
  if(tunnel){
    const result=await tunnelDone;
    if(!stopping)throw new Error(result.error?'Không khởi động được tunnel.':`Tunnel dừng (exit ${result.code??'signal'}). Giữ nguyên URL; kiểm tra cấu hình.`);
  }else{
    // An external tunnel belongs to its service manager; this launcher owns only the broker.
    await new Promise(done=>{for(const server of broker.servers)server.once('close',done);});
  }
}catch(e){process.stderr.write(`Chưa khởi động kết nối: ${e.message}\nXem docs/STABLE_CONNECTION.md. Không tự đổi URL cố định sang URL tạm.\n`);process.exitCode=1;}
finally{await stop();}
