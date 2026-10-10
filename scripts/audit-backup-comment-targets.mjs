/**
 * Offline, read-only diagnostic for duplicate group comment targets in a
 * LinkDesk schema-1 backup. Never returns user-provided IDs or URLs.
 * This is NOT a publishing gate; importState must still enforce its own rules.
 */
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com']);
const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

function getTarget(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || !FACEBOOK_HOSTS.has(url.hostname) || url.username || url.password || url.port) return null;
  const group = /^\/groups\/([a-zA-Z0-9._-]+)(?:\/|$)/.exec(url.pathname)?.[1];
  if (!group) return null;
  const rootPath = /^\/groups\/[a-zA-Z0-9._-]+\/?$/.test(url.pathname);
  const postMatch = /^\/groups\/[a-zA-Z0-9._-]+\/(?:posts|permalink)\/(\d+)\/?$/.exec(url.pathname);
  // A selector on an unrelated group subroute must not certify its identity.
  if (!rootPath && !postMatch) return null;
  const pathPost = postMatch?.[1];
  const queryPosts = url.searchParams.getAll('multi_permalinks');
  // Duplicated selectors are ambiguous, even when values happen to match.
  if (queryPosts.length !== new Set(queryPosts).size || queryPosts.length > 1) return null;
  const queryPost = queryPosts[0] ?? null;
  // A path ID and a different query ID describe an ambiguous post target.
  if (queryPost !== null && (!/^\d+$/.test(queryPost) || (pathPost && pathPost !== queryPost))) return null;
  const post = pathPost || queryPost;
  if (!post) return null;
  return { group, post };
}

export function auditBackupCommentTargets(backup) {
  if (!backup || backup.schema !== 1 || !Array.isArray(backup.jobs) ||
      !Array.isArray(backup.destinations) || backup.jobs.length > 1000 ||
      backup.destinations.length > 300) {
    throw new TypeError('Unsupported backup schema or collection limits.');
  }

  const destinations = new Map();
  const ambiguous = new Set();
  for (const dest of backup.destinations) {
    if (!dest || typeof dest.id !== 'string' || !dest.id) continue;
    if (destinations.has(dest.id)) ambiguous.add(dest.id);
    else destinations.set(dest.id, dest);
  }

  const seenIds = new Set();
  const seenTargets = new Set();
  const repeatedTargets = new Set();
  let commentJobs = 0;
  let duplicateJobIds = 0;
  let unverifiableComments = 0;
  let extraTargetJobs = 0;

  for (const job of backup.jobs) {
    if (!job || typeof job !== 'object') {
      unverifiableComments += 1;
      continue;
    }
    if (typeof job.id !== 'string' || !job.id || seenIds.has(job.id)) duplicateJobIds += 1;
    else seenIds.add(job.id);
    if (job.kind !== 'comment') continue;
    commentJobs += 1;

    const dest = destinations.get(job.destinationId);
    const target = getTarget(job.targetUrl);
    if (!dest || ambiguous.has(job.destinationId) || dest.kind !== 'group' ||
        typeof dest.groupId !== 'string' || !target || target.group !== dest.groupId) {
      unverifiableComments += 1;
      continue;
    }

    const key = JSON.stringify([target.group, target.post]);
    if (seenTargets.has(key)) {
      repeatedTargets.add(key);
      extraTargetJobs += 1;
    } else seenTargets.add(key);
  }

  const result = {
    checkedJobs: backup.jobs.length,
    commentJobs,
    duplicateTargets: repeatedTargets.size,
    extraTargetJobs,
    duplicateJobIds,
    unverifiableComments
  };
  return { ok: result.duplicateTargets === 0 && duplicateJobIds === 0 && unverifiableComments === 0, ...result };
}

async function main() {
  if (process.argv.length !== 3) throw new Error('usage');
  const path = process.argv[2];
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > MAX_BACKUP_BYTES) throw new Error('invalid backup file');
  const buffer = await readFile(path);
  if (buffer.length > MAX_BACKUP_BYTES) throw new Error('backup file too large');
  const result = auditBackupCommentTargets(JSON.parse(buffer.toString('utf8')));
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.ok ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    // Do not echo paths, backup content, parse errors or sensitive strings.
    process.stderr.write('Unable to audit backup safely.\n');
    process.exitCode = 1;
  });
}
