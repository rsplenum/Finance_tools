// Which web hosts this environment's network lets a session open (owner, 11-10-2026, D-TECH-35). Run it before any
// session reads a website: `npm run hosts -- kviconline.gov.in msme.gov.in`. One line per host, blocked first; give the
// owner the blocked ones to allow (the environment's Network access, Allowed domains) before the work starts.
import { execFile } from 'node:child_process';

const hosts = process.argv.slice(2);
if (!hosts.length) { console.log('usage: npm run hosts -- host1 host2 ...'); process.exit(1); }
const probe = (h) => new Promise((done) => execFile('curl', ['-sS', '-o', '/dev/null', '-m', '8', '-w', '%{http_code}', `https://${h}/`], (e, out, err) => {
  const said = `${out}${err}`;
  done([h, /CONNECT tunnel failed, response 403/.test(said) ? 'BLOCKED' : /^[1-5]\d\d$/.test(out.trim()) ? 'open' : `unclear (${err.trim().slice(0, 50)})`]);
}));
const rows = (await Promise.all(hosts.map(probe))).sort((a, b) => (a[1] === 'BLOCKED' ? 0 : 1) - (b[1] === 'BLOCKED' ? 0 : 1));
for (const [h, r] of rows) console.log(`${r.padEnd(8)} ${h}`);
const blocked = rows.filter((r) => r[1] === 'BLOCKED').map((r) => r[0]);
const unclear = rows.filter((r) => r[1].startsWith('unclear')).map((r) => r[0]);
if (blocked.length) console.log(`Ask the owner to allow: ${blocked.join(', ')}`);
// 502 or a reset is the site refusing this cloud's address (many Indian government sites do), not the allow list.
if (unclear.length) console.log(`Allowed but not answering from here (the site's side, not the allow list): ${unclear.join(', ')}`);
if (!blocked.length && !unclear.length) console.log('All open.');
