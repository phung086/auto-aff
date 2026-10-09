import { lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ENDPOINTS = Object.freeze([
  { id: 'device', url: 'http://127.0.0.1:8787/health' },
  { id: 'worker', url: 'http://127.0.0.1:8791/' },
]);

export function assessStatus(id, status) {
  if (id === 'device' && status === 401) return { state: 'ok', reason: 'DEVICE_AUTH_GUARD' };
  if (id === 'device' && status === 200) return { state: 'warning', reason: 'DEVICE_UNPROTECTED' };
  if (id === 'worker' && status === 200) return { state: 'ok', reason: 'WORKER_UI_ONLY' };
  if (status === 403) return { state: 'warning', reason: 'LOCAL_HOST_ORIGIN_GUARD' };
  return { state: 'warning', reason: 'UNEXPECTED_HTTP_STATUS' };
}

export async function probeLocal(id, { fetcher = fetch, timeoutMs = 1200 } = {}) {
  const endpoint = ENDPOINTS.find(value => value.id === id);
  if (!endpoint) throw new Error('Unknown local endpoint.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // No tokens, cookies, redirects, public hosts or request body.
    const response = await fetcher(endpoint.url, {
      method: 'GET', redirect: 'error', credentials: 'omit', signal: controller.signal,
    });
    // Never read or log response content, even if the local service is unexpected.
    try { await response.body?.cancel?.(); } catch {}
    return { id, httpStatus: response.status, ...assessStatus(id, response.status) };
  } catch (error) {
    return { id, state: 'warning', reason: controller.signal.aborted ? 'LOCAL_TIMEOUT' : 'LOCAL_UNREACHABLE' };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkPresence(relative, { root = process.cwd(), inspect = lstat } = {}) {
  if (!['package.json', 'extension/manifest.json', '.linkdesk-data/pairing.json', '.linkdesk-data/connection.json'].includes(relative))
    throw new Error('Unsupported presence check.');
  try {
    const value = await inspect(join(resolve(root), relative));
    return { id: relative, state: value.isFile() ? 'present' : 'unexpected_type' };
  } catch {
    return { id: relative, state: 'missing_or_inaccessible' };
  }
}

export async function collectLocalPreflight({
  runtimeVersion = process.versions.node,
  root = process.cwd(), inspect = lstat, fetcher = fetch, timeoutMs = 1200,
} = {}) {
  const major = Number.parseInt(runtimeVersion, 10);
  const node = Number.isInteger(major) && major >= 22
    ? { id: 'node', state: 'ok', reason: 'NODE_SUPPORTED' }
    : { id: 'node', state: 'warning', reason: 'REQUIRES_NODE_22' };
  const files = await Promise.all([
    'package.json', 'extension/manifest.json', '.linkdesk-data/pairing.json',
    '.linkdesk-data/connection.json',
  ].map(relative => checkPresence(relative, { root, inspect })));
  const services = await Promise.all(ENDPOINTS.map(target => probeLocal(target.id, {
    fetcher, timeoutMs,
  })));
  return { node, files, services };
}
