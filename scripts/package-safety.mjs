import { lstat, readdir } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

// The release package is public. Do not rely on .gitignore: ignored files are
// still present in a developer's checkout and fs.cp() will copy them.
const PRIVATE_DIRECTORIES = new Set([
  '.git', '.linkdesk-data', 'node_modules', 'dist', 'coverage', '__pycache__', '.venv',
]);
const PRIVATE_FILES = new Set([
  'pairing.json', 'connection.json', 'owner-code.txt', 'cloudflare-token.txt',
  'credentials.json', 'tokens.json', 'oauth-tokens.json', 'secrets.json',
]);
const PRIVATE_EXTENSION = /\.(?:log|pem|p12|pfx|key|sqlite|sqlite3|db)$/i;
const PRIVATE_CONFIG = /(?:^|[-_.])(?:secrets?|credentials?|private[-_.]?key|access[-_.]?token|refresh[-_.]?token|cookies?)(?:[-_.]|$)/i;

function contains(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}

export function unsafePackageName(name, isDirectory) {
  const lower = name.toLowerCase();
  if (PRIVATE_DIRECTORIES.has(lower)) return true;
  if (lower === '.env' || lower.startsWith('.env.')) return true;
  if (PRIVATE_FILES.has(lower)) return true;
  if (!isDirectory && (PRIVATE_EXTENSION.test(name) ||
    (PRIVATE_CONFIG.test(name) && /\.(?:json|txt|ini|ya?ml|toml|conf|cfg)$/i.test(name)))) return true;
  return false;
}

/**
 * Fail closed before copying anything from the source checkout. Only metadata
 * is read: never open, hash, log or inspect the contents of private files.
 * This is a defense against accidental leaks, not a security boundary against
 * a hostile process modifying the checkout concurrently with packaging.
 */
export async function assertSafePackageInputs({ root = process.cwd(), target, entries }) {
  if (!Array.isArray(entries) || !entries.length || typeof target !== 'string')
    throw new Error('Invalid package inputs.');
  const base = resolve(root), output = resolve(target);

  async function scan(path, name) {
    const st = await lstat(path);
    if (st.isSymbolicLink()) throw new Error('Package input contains a symlink; packaging refused.');
    if (unsafePackageName(name, st.isDirectory()))
      throw new Error('Package input contains private or generated data; packaging refused.');
    if (st.isDirectory()) {
      for (const child of await readdir(path)) await scan(join(path, child), child);
    } else if (!st.isFile()) {
      throw new Error('Package input contains a special file; packaging refused.');
    }
  }

  for (const entry of entries) {
    if (typeof entry !== 'string' || !entry || entry === '.' || entry === '..' || isAbsolute(entry))
      throw new Error('Invalid package allowlist entry.');
    const source = resolve(base, entry);
    if (!contains(base, source) || source === base)
      throw new Error('Package allowlist entry escapes project root.');
    if (contains(source, output))
      throw new Error('Package output cannot be nested inside a source allowlist entry.');
    await scan(source, entry.split(/[\\/]/).at(-1));
  }
}
