import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadConnectionConfig,stableOrigin,tunnelArguments} from '../scripts/connection-config.mjs';
async function fixture(t){const directory=await mkdtemp(join(tmpdir(),'linkdesk-connection-'));t.after(()=>rm(directory,{recursive:true,force:true}));return directory;}
test('missing default config stays compatible but missing explicit config never falls back',async t=>{
  const directory=await fixture(t);assert.deepEqual(await loadConnectionConfig({directory}),{mode:'quick'});
  await assert.rejects(loadConnectionConfig({directory,file:join(directory,'missing.json')}),/không tự đổi/);
});
test('named config preserves origin and passes only token file path to cloudflared',async t=>{
  const directory=await fixture(t);await writeFile(join(directory,'cf-token.txt'),'PRIVATE_TOKEN_VALUE');
  await writeFile(join(directory,'connection.json'),JSON.stringify({mode:'named',publicOrigin:'https://mcp.example.com/',tokenFile:'cf-token.txt'}));
  const config=await loadConnectionConfig({directory});assert.equal(config.publicOrigin,'https://mcp.example.com');
  const args=tunnelArguments(config);assert.ok(args.includes(join(directory,'cf-token.txt')));
  assert.ok(!args.join(' ').includes('PRIVATE_TOKEN_VALUE'));assert.ok(!args.includes('--url'));
});
test('bad stable config and missing token fail without generating a temporary URL',async t=>{
  const directory=await fixture(t),file=join(directory,'connection.json');
  for(const value of ['https://a.trycloudflare.com','https://a.trycloudflare.com.','http://mcp.example.com','https://mcp.example.com/mcp','https://user:pass@mcp.example.com','https://mcp.example.com?token=secret','https://127.0.0.1','https://local.localhost','https://localhost.'])assert.throws(()=>stableOrigin(value));
  await writeFile(file,JSON.stringify({mode:'named',publicOrigin:'https://mcp.example.com',tokenFile:'missing.txt'}));
  await assert.rejects(loadConnectionConfig({directory}),/file token/);
  await writeFile(file,'{bad json');await assert.rejects(loadConnectionConfig({directory}),/không tự đổi/);
});
test('external mode leaves tunnel management to the installed service',async t=>{
  const directory=await fixture(t);await writeFile(join(directory,'connection.json'),JSON.stringify({mode:'external',publicOrigin:'https://mcp.example.com'}));
  assert.equal(tunnelArguments(await loadConnectionConfig({directory})),null);
});
