import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { start } from '../server/index.mjs';

async function directory(t){const dir=await mkdtemp(join(tmpdir(),'linkdesk-startup-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
async function occupy(t){const server=createServer();await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});t.after(()=>new Promise(done=>server.close(done)));return server.address().port;}

test('a failed second launch cannot create or overwrite the running broker owner code',async t=>{
  const dir=await directory(t),port=await occupy(t),ownerPath=join(dir,'owner-code.txt');
  await assert.rejects(start({directory:dir,devicePort:port,publicOrigin:''}),{code:'EADDRINUSE'});
  await assert.rejects(readFile(ownerPath),{code:'ENOENT'});
  const original='R'.repeat(43);await writeFile(ownerPath,original);
  await assert.rejects(start({directory:dir,devicePort:port,publicOrigin:''}),{code:'EADDRINUSE'});
  assert.equal(await readFile(ownerPath,'utf8'),original);
});

test('a remote port conflict closes the newly opened device server without creating an owner code',async t=>{
  const dir=await directory(t),remotePort=await occupy(t);
  const reserve=createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const devicePort=reserve.address().port;
  await new Promise(done=>reserve.close(done));
  await assert.rejects(start({directory:dir,devicePort,remotePort,publicOrigin:'https://linkdesk.example'}),{code:'EADDRINUSE'});
  await assert.rejects(readFile(join(dir,'owner-code.txt')),{code:'ENOENT'});
  const available=createServer();await new Promise((done,fail)=>{available.once('error',fail);available.listen(devicePort,'127.0.0.1',done);});
  await new Promise(done=>available.close(done));
});

test('successful restarts preserve the owner code and keep the file equal to the OAuth provider',async t=>{
  const dir=await directory(t),options={directory:dir,devicePort:0,remotePort:0,publicOrigin:'https://linkdesk.example'};
  const first=await start(options);
  const original=(await readFile(join(dir,'owner-code.txt'),'utf8')).trim();
  assert.match(original,/^[A-Za-z0-9_-]{43}$/);assert.equal(first.provider.ownerCode,original);
  await first.close();
  const restarted=await start(options);t.after(()=>restarted.close());
  assert.equal(restarted.provider.ownerCode,original);assert.equal(await readFile(join(dir,'owner-code.txt'),'utf8'),original);
});
