import test from 'node:test';
import assert from 'node:assert/strict';
import { assessStatus, probeLocal, checkPresence, collectLocalPreflight } from '../scripts/local-preflight.mjs';

const response = status => new Response(null, { status });
const available = async () => ({ isFile: () => true });

test('protected Device API 401 is a healthy authentication boundary, not login success', () => {
  assert.deepEqual(assessStatus('device', 401), { state: 'ok', reason: 'DEVICE_AUTH_GUARD' });
});

test('Device API unauthenticated 200 is flagged, never labeled connected', () => {
  assert.deepEqual(assessStatus('device', 200), { state: 'warning', reason: 'DEVICE_UNPROTECTED' });
});

test('worker HTTP 200 only proves local UI responds, not AI authentication', () => {
  assert.deepEqual(assessStatus('worker', 200), { state: 'ok', reason: 'WORKER_UI_ONLY' });
});

test('local origin 403 is distinguishable from 401', () => {
  assert.deepEqual(assessStatus('device', 403), { state: 'warning', reason: 'LOCAL_HOST_ORIGIN_GUARD' });
});

test('probe uses fixed loopback URLs with no credentials, body or redirects', async () => {
  const requests = [];
  const fetcher = async (url, options) => { requests.push({ url, options }); return response(url.includes('8787') ? 401 : 200); };
  assert.equal((await probeLocal('device', { fetcher })).reason, 'DEVICE_AUTH_GUARD');
  assert.equal((await probeLocal('worker', { fetcher })).reason, 'WORKER_UI_ONLY');
  assert.deepEqual(requests.map(v => v.url), ['http://127.0.0.1:8787/health', 'http://127.0.0.1:8791/']);
  for (const r of requests) {
    assert.equal(r.options.method, 'GET');
    assert.equal(r.options.redirect, 'error');
    assert.equal(r.options.credentials, 'omit');
    assert.equal('headers' in r.options, false);
    assert.equal('body' in r.options, false);
  }
});

test('missing or refused local service becomes a diagnostic, never crashes', async () => {
  const result = await probeLocal('worker', { fetcher: async () => { throw new Error('secret-local-path'); } });
  assert.equal(result.reason, 'LOCAL_UNREACHABLE');
  assert.equal(JSON.stringify(result).includes('secret-local-path'), false);
});

test('hung local service times out without reading response', async () => {
  const fetcher = (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })));
  });
  const result = await probeLocal('worker', { fetcher, timeoutMs: 8 });
  assert.equal(result.reason, 'LOCAL_TIMEOUT');
});

test('presence check never opens the private pairing/config files', async () => {
  const calls = [];
  const r = await checkPresence('.linkdesk-data/pairing.json', {
    root: '/fake', inspect: async value => { calls.push(value); return { isFile: () => true }; },
  });
  assert.equal(r.state, 'present');
  assert.deepEqual(calls, ['/fake/.linkdesk-data/pairing.json']);
});

test('missing files and unknown files do not reveal or read credentials', async () => {
  const gone = await checkPresence('.linkdesk-data/connection.json', {
    inspect: async () => { throw new Error('sensitive file path'); },
  });
  assert.equal(gone.state, 'missing_or_inaccessible');
  await assert.rejects(checkPresence('.linkdesk-data/chatgpt/accounts.json'), /Unsupported presence/);
});

test('non-file symlink or directory is not treated as correctly configured', async () => {
  const r = await checkPresence('.linkdesk-data/pairing.json', {
    inspect: async () => ({ isFile: () => false }),
  });
  assert.equal(r.state, 'unexpected_type');
});

test('aggregate diagnostics are read-only and preserve independent service states', async () => {
  const result = await collectLocalPreflight({
    runtimeVersion: '22.16.0', inspect: available,
    fetcher: async url => response(url.includes('8787') ? 401 : 200),
  });
  assert.equal(result.node.reason, 'NODE_SUPPORTED');
  assert.equal(result.files.length, 4);
  assert.deepEqual(result.services.map(s => s.reason), ['DEVICE_AUTH_GUARD', 'WORKER_UI_ONLY']);
});

test('unsupported Node reports a warning without modifying state', async () => {
  const result = await collectLocalPreflight({
    runtimeVersion: '20.11.0', inspect: available,
    fetcher: async url => response(url.includes('8787') ? 401 : 200),
  });
  assert.equal(result.node.reason, 'REQUIRES_NODE_22');
});
