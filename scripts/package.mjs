import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
const target=resolve(process.env.LINKDESK_PACKAGE_DIR || 'dist/linkdesk');
await mkdir(target,{recursive:true});
const entries=['extension','server','scripts','tests','qa','docs','skills','.github','plugin.json','mcp.json','package.json','package-lock.json','preview.py','README.md','AGENTS.md','VALIDATION.md','PRODUCT.md','DIRECTION.md','DESIGN.md','.impeccable','.gitignore'];
for(const entry of entries)await cp(resolve(entry),join(target,entry),{recursive:true});
await writeFile(join(target,'RELEASE.json'),JSON.stringify({version:JSON.parse(await readFile('package.json','utf8')).version,packaged:new Date().toISOString(),excluded:['credentials','runtime tasks','node_modules','git history'],note:'Run npm ci before starting broker.'},null,2));
process.stdout.write(`Đã đóng gói mã nguồn theo allowlist: ${target}\n`);
