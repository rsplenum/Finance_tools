/**
 * The pages a change touches, for `npm run verify -- --quick` (CHK1, D-TECH-63): the site check then opens only those.
 * Cautious: a file is one page's only when it sits in that page's own place; anything shared (Base, the engine, the
 * data, the checks themselves, a file this table does not know) means every page. A tool's folder is home's too, since
 * home imports each tool's model and case. Files the built site and the site check never read touch no page.
 * The full check stays the default before a PR and in CI.
 */
import { spawnSync } from 'node:child_process';

const POLICIES = ['/privacy/', '/terms/', '/not-advice/', '/refunds/', '/contact/'];
const OWN = [
  [/^site\/src\/home\//, ['/']],
  [/^site\/src\/dscr\//, ['/dscr/', '/']],
  [/^site\/src\/estimate\//, ['/estimate/', '/']],
  [/^site\/src\/report\//, ['/project-report/', '/']],
  [/^site\/src\/cma\//, ['/cma/', '/']],
  [/^site\/src\/(Policy\.astro|policy\.ts)$/, POLICIES],
];
// Never read by the build or the site check. docs/TRADEMARKS.md and tests/fixtures/ are (the brand notice, U1, REP2).
const NONE = [
  /^docs\/(?!TRADEMARKS\.md$)/, /^tests\/(?!fixtures\/)/, /^\.claude\//, /^portable\//, /^\.github\//, /^[^/]+\.md$/,
  /^worker\/(?!src\/event-shape\.ts$)/,
  /^scripts\/(verify|doc-sizes|review-dates|rules-doc|hosts|usage|design-review)\.mjs$/,
];

/** The pages among `all` that `files` touch; `all` itself when any file is shared or unknown. */
export function pagesFor(files, all) {
  const out = new Set();
  for (const f of files) {
    if (NONE.some((r) => r.test(f))) continue;
    const page = f.match(/^site\/src\/pages\/([^/]+)\.astro$/)?.[1];
    const own = page ? [page === 'index' ? '/' : page === '404' ? '/404.html' : `/${page}/`] : OWN.find(([r]) => r.test(f))?.[1];
    if (!own) return all;
    for (const p of own) out.add(p);
  }
  return all.filter((p) => out.has(p));
}

/** The files this branch changes against origin/main, committed or not; null when that base is not here. CHANGED_FILES
 * (comma-separated) stands in for them, to try the mapping. */
export function changedFiles() {
  if (process.env.CHANGED_FILES) return process.env.CHANGED_FILES.split(',');
  const git = (args) => spawnSync('git', args, { encoding: 'utf8' });
  const base = git(['merge-base', 'HEAD', 'origin/main']);
  if (base.status !== 0) return null;
  const lists = [['diff', '--name-only', base.stdout.trim()], ['ls-files', '--others', '--exclude-standard']].map((a) => git(a).stdout);
  return [...new Set(lists.join('\n').split('\n').filter(Boolean))];
}
