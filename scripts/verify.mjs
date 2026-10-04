/**
 * Runs the checks every change needs (CLAUDE.md), in its order, and prints one line per check with
 * its exit code and the counts it reported, then the end of the output of any check that failed.
 * A session reads a few lines instead of six logs, and never runs a check again to learn its exit
 * code (D-TECH-26). Exits 1 when any check fails.
 */
import { spawnSync } from 'node:child_process';

const checks = [
  ['tests', 'npm test'],
  ['typecheck', 'npm run typecheck'],
  ['build', 'npm run build'],
  ['site check', 'npm run check:site'],
  ['simulation', 'npm run sim'],
  ['rules doc', 'npm run rules-doc'],
];

let failed = 0;
for (const [name, cmd] of checks) {
  const start = Date.now();
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  const counts = [...new Set(out.split('\n').filter((l) => /^\s*Tests\s|violation/i.test(l)).map((l) => l.trim().slice(0, 100)))].slice(-2);
  const secs = Math.round((Date.now() - start) / 1000);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${name} (exit ${r.status ?? r.signal}, ${secs} s)${counts.length ? `: ${counts.join(' | ')}` : ''}`);
  if (r.status !== 0) {
    failed++;
    console.log(out.trimEnd().split('\n').slice(-30).join('\n'));
  }
}
if (spawnSync('git status --porcelain docs/RULES.md', { shell: true, encoding: 'utf8' }).stdout.trim()) console.log('docs/RULES.md changed: commit it.');
process.exit(failed ? 1 : 0);
