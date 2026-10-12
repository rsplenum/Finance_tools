/**
 * `npm run usage` (UD1, D-TECH-37): each page's funnel from the interaction data in the Worker's D1, in a few lines.
 * Visits (page views), then the share that changed a field, saw a ready result (and the median time to it), opened More
 * options, tapped Make it viable, used its plan and downloaded; the downloads by format; the fields most often shown
 * wrong; and the last step before leaving. Flags: `--days 30` (default), `--local` (the `wrangler dev` database).
 * The database holds steps only, never what was typed (worker/migrations/0001_events.sql).
 */
import { spawnSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const days = Number(arg('--days', '30'));
if (!(days > 0 && days <= 400)) { console.error('--days: 1 to 400'); process.exit(2); }
const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 16);
const where = `at >= '${since}'`;

const SQL = [
  `WITH v AS (SELECT page, visit, MAX(width = 'phone') phone, MAX(kind = 'field') typed,
     MIN(CASE WHEN kind = 'result' AND name LIKE '%-ready' THEN ms END) ready, MAX(kind = 'more' AND name = 'more-options') more,
     MAX(kind = 'tap' AND name LIKE '%viable') viable, MAX(kind = 'tap' AND name LIKE '%plan-use') used, MAX(kind = 'download') dl
     FROM events WHERE ${where} GROUP BY page, visit)
   SELECT page, COUNT(*) visits, SUM(phone) phone, SUM(typed) typed, SUM(ready IS NOT NULL) ready, SUM(more) more,
     SUM(viable) viable, SUM(used) used, SUM(dl) dl, GROUP_CONCAT(ready) times FROM v GROUP BY page ORDER BY visits DESC`,
  `SELECT page, name, COUNT(*) n FROM events WHERE ${where} AND kind = 'download' GROUP BY page, name ORDER BY n DESC`,
  `SELECT page, name, COUNT(DISTINCT visit) n FROM events WHERE ${where} AND kind = 'error' GROUP BY page, name ORDER BY n DESC`,
  `SELECT page, name, COUNT(*) n FROM (SELECT page, visit, name, MAX(ms) FROM events WHERE ${where} AND kind = 'leave' GROUP BY page, visit)
   GROUP BY page, name ORDER BY n DESC`,
].map((q) => q.replace(/\s+/g, ' ')).join('; ');

const where_ = process.argv.includes('--local') ? '--local' : '--remote';
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'finance-tools', where_, '--json', '-c', 'worker/wrangler.jsonc', '--command', SQL], { encoding: 'utf8' });
const out = r.stdout.slice(r.stdout.indexOf('['));
let sets;
try { sets = JSON.parse(out).map((s) => s.results); } catch {
  console.error(`Could not read the database (${where_}). Is the Worker live with its D1 (docs/CLOUDFLARE.md §2)?`);
  console.error(`${r.stdout}${r.stderr}`.trim().split('\n').filter((l) => !/WARNING|proxy/i.test(l)).slice(-5).join('\n'));
  process.exit(1);
}
const [funnel, downloads, errors, leaving] = sets;
const pct = (n, of) => `${Math.round((100 * n) / of)}%`;
const median = (list) => { const s = list.sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : undefined; };
const top = (rows, page, k = 3) => rows.filter((x) => x.page === page).slice(0, k).map((x) => `${x.name} ${x.n}`).join(', ') || 'none';

console.log(`Usage, the last ${days} days (from ${since} UTC):`);
if (!funnel.length) console.log('  no visits recorded');
for (const p of funnel) {
  const secs = median(String(p.times ?? '').split(',').filter(Boolean).map(Number));
  console.log(`${p.page}: ${p.visits} visits (${pct(p.phone, p.visits)} phones); changed a field ${pct(p.typed, p.visits)}; result ready ${pct(p.ready, p.visits)}`
    + `${secs === undefined ? '' : ` in ${Math.round(secs / 1000)} s (median)`}; More options ${pct(p.more, p.visits)}; Make it viable ${pct(p.viable, p.visits)}`
    + `, plan used ${pct(p.used, p.visits)}; downloaded ${pct(p.dl, p.visits)}`);
  console.log(`  downloads: ${top(downloads, p.page, 4)}. Shown wrong: ${top(errors, p.page)}. Last step: ${top(leaving, p.page)}.`);
}
