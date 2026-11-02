/**
 * How fast a page is usable on a slow phone (UXR1's method, D-TECH-77): the built site/dist served uncompressed,
 * Chromium at 360 × 780, 150 ms latency, 200 kB/s and 4× CPU; "usable" is the time until every client:load island has
 * hydrated (its `ssr` attribute gone), three runs. Prints each page's times and its first-load JS. A tool to run by
 * hand after `npm run build`, never a check: a timing varies with the machine.
 *   node scripts/speed.mjs [/estimate/ …]   ANSWER='#pl-sections' waits for that instead; FILES=1 lists the scripts;
 *   DIST=<another build's site/dist/> measures that build (main's, to compare).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = process.env.DIST ?? fileURLToPath(new URL('../site/dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(DIST, p));
  try { res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)); }
  catch { res.writeHead(404).end('not found'); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/dscr/', '/cma/', '/project-report/', '/estimate/'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
for (const path of pages) {
  const times = [];
  let files = [];
  for (let run = 0; run < 3; run++) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 200000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(BASE + path, { waitUntil: 'commit' });
    if (process.env.ANSWER) await page.waitForSelector(process.env.ANSWER, { timeout: 60000 });
    // A page with no client:load island (home) is usable once its HTML is in.
    else await page.waitForFunction(() => document.readyState !== 'loading' && !document.querySelector('astro-island[client="load"][ssr]'), null, { timeout: 60000, polling: 50 });
    times.push(await page.evaluate(() => performance.now()));
    if (run === 0) {
      await page.waitForTimeout(500);
      files = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).map((e) => [e.name.replace(/^.*\//, ''), e.decodedBodySize]));
    }
    await ctx.close();
  }
  const js = files.reduce((s, f) => s + f[1], 0);
  console.log(`${path} usable ${times.map((t) => (t / 1000).toFixed(2)).join(' / ')} s; first-load JS ${(js / 1000).toFixed(0)} kB in ${files.length} files`);
  if (process.env.FILES) for (const [name, n] of files) console.log(`    ${name} ${(n / 1000).toFixed(1)} kB`);
}
await browser.close();
server.close();
