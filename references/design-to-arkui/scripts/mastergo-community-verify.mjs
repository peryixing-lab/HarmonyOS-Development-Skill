import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const community = fileURLToPath(new URL('../references/mastergo/community/', import.meta.url));

// Verify the vendored artifact before applying or executing any upstream build scripts.
export function verifyCommunityPatch(checkout, directory = community) {
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  const patch = join(directory, 'deveco-community.patch');
  const bytes = readFileSync(patch);
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.patchSha256) {
    throw new Error('Community patch SHA-256 mismatch; restore the bundled patch and manifest');
  }
  const files = [...bytes.toString('utf8').matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((entry) => {
    if (entry[1] !== entry[2] || entry[2].split('/').some((part) => part === '..' || part === '')) {
      throw new Error('Unexpected community patch path');
    }
    return entry[2];
  });
  if (!files.length || new Set(files).size !== files.length || JSON.stringify([...files].sort()) !== JSON.stringify([...manifest.files].sort())) {
    throw new Error('Community patch file inventory differs from its manifest');
  }
  if (checkout) {
    const git = (...args) => execFileSync('git', ['-C', resolve(checkout), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (git('rev-parse', 'HEAD') !== manifest.baseCommit) throw new Error('Community checkout must use the pinned base commit');
    if (git('status', '--porcelain')) throw new Error('Use a clean community checkout; preserve existing local changes');
    git('apply', '--check', patch);
  }
  return { repository: manifest.repository, baseCommit: manifest.baseCommit, patchSha256: manifest.patchSha256, patch, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node mastergo-community-verify.mjs [clean-community-checkout]');
    process.stdout.write(JSON.stringify(verifyCommunityPatch(process.argv[2])) + '\n');
  } catch (error) {
    process.stderr.write(`mastergo-community-verify: ${error.message}\n`);
    process.exitCode = 1;
  }
}
