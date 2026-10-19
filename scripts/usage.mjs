/**
 * `npm run usage` (UD1, D-TECH-37): each page's funnel from the interaction data in the Worker's D1, in a few lines.
 * Visits (page views), then the share that changed a field, saw a ready result (and the median time to it), opened More
 * options, tapped Make it viable, used its plan and downloaded; the downloads by format; the fields most often shown
 * wrong; and the last step before leaving. Flags: `--days 30` (default), `--local` (the `wrangler dev` database).
 * The database holds steps only, never what was typed (worker/migrations/0001_events.sql).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

// --local reads the `wrangler dev` database through wrangler; the live one goes straight to the D1 API, so a session
// whose token is a Network secret (the proxy adds the Bearer header, D-TECH-49) needs no wrangler login. Elsewhere
// CLOUDFLARE_API_TOKEN, if set, is sent through curl's stdin, never on its command line.
const local = process.argv.includes('--local');
let sets, why;
if (local) {
  const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'finance-tools', '--local', '--json', '-c', 'worker/wrangler.jsonc', '--command', SQL], { encoding: 'utf8' });
  try { sets = JSON.parse(r.stdout.slice(r.stdout.indexOf('['))).map((s) => s.results); } catch { why = `${r.stdout}${r.stderr}`; }
} else {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const db = readFileSync('worker/wrangler.jsonc', 'utf8').match(/"database_id":\s*"([0-9a-f-]{36})"/)?.[1];
  if (!account || !db) { console.error(account ? 'No database_id in worker/wrangler.jsonc.' : 'CLOUDFLARE_ACCOUNT_ID is not set (docs/CLOUDFLARE.md §2 step 6).'); process.exit(2); }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const r = spawnSync('curl', ['-sS', '-X', 'POST', '-H', 'Content-Type: application/json', ...(token ? ['-H', '@-'] : []),
    '--data-binary', JSON.stringify({ sql: SQL }), `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`],
  { encoding: 'utf8', input: token ? `Authorization: Bearer ${token}\n` : '' });
  try {
    const j = JSON.parse(r.stdout);
    if (j.success && j.result?.length === 4) sets = j.result.map((s) => s.results);
    else why = (j.errors ?? []).map((e) => `${e.code} ${e.message}`).join('; ');
  } catch { why = `${r.stdout}${r.stderr}`; }
}
if (!sets) {
  console.error(`Could not read the database (${local ? 'local' : 'live'}). Is the Worker live with its D1, and the token allowed (docs/CLOUDFLARE.md §2)?`);
  console.error(String(why).trim().split('\n').filter((l) => !/WARNING|proxy/i.test(l)).slice(-5).join('\n'));
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
