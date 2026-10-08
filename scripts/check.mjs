import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const walk=async dir=>{const all=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())all.push(...await walk(p));else all.push(p);}return all;};
for(const dir of ['extension','server','scripts','tests'])for(const file of await walk(dir))if(/\.(mjs|js)$/.test(file)){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
const pkg=JSON.parse(await readFile('package.json','utf8')),lock=JSON.parse(await readFile('package-lock.json','utf8')),manifest=JSON.parse(await readFile('extension/manifest.json','utf8')),plugin=JSON.parse(await readFile('plugin.json','utf8'));
if([lock.version,manifest.version,plugin.version].some(v=>v!==pkg.version))throw new Error('Version không đồng bộ. Chạy npm install --package-lock-only.');
if(plugin.extensions['com.openai'].interface.shortDescription.length>30)throw new Error('Subtitle plugin quá30 ký tự.');
for(const file of ['mcp.json','docs/plan.json','.impeccable/design.json'])JSON.parse(await readFile(file,'utf8'));
process.stdout.write('Syntax, JSON, versions và subtitle hợp lệ.\n');
