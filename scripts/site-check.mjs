/**
 * Site check (0 violations required). Serves site/dist the way Cloudflare Pages does and opens every built page in
 * Chromium at phone width (390 px), in light and in dark mode. Violations: horizontal scroll; an input under 16 px;
 * text below WCAG AA contrast (catches an element missing its dark: classes); a missing title, description or single
 * h1; a script error, console error or missing file; a light flash for a dark-mode visitor; the theme toggle not
 * cycling Auto → Light → Dark and remembering the choice; the DSCR amount field not reading back what was typed.
 * Run after `npm run build`. CHROMIUM_PATH overrides the browser Playwright would use.
 */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = fileURLToPath(new URL('../site/dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(DIST, p));
  try {
    if (!file.startsWith(DIST)) throw new Error('outside dist');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'] }).end('not found');
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Every built page, so a new page is checked without being listed here.
const pages = (await readdir(DIST, { recursive: true }))
  .filter((f) => f.endsWith('.html'))
  .map((f) => '/' + f.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1'))
  .sort();

const violations = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/** Opens a page at 390 px. `stored` is a saved theme choice; `blockScripts` loads the page without its script files. */
async function open(path, { scheme = 'light', stored, blockScripts = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  if (stored) await ctx.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('app-theme', v); sessionStorage.setItem('seeded', '1'); } }, stored);
  if (blockScripts) await ctx.route('**/*.js', (r) => r.abort());
  const page = await ctx.newPage();
  const v = (m) => violations.push(`${path} (${scheme}${stored ? `, saved ${stored}` : ''}${blockScripts ? ', no scripts' : ''}): ${m}`);
  page.on('pageerror', (e) => v(`script error: ${e.message}`));
  if (!blockScripts) {
    page.on('console', (m) => { if (m.type() === 'error') v(`console error: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) v(`missing file ${new URL(r.url()).pathname} (${r.status()})`); });
  }
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) v(`HTTP ${res?.status()}`);
  if (!blockScripts) await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 10000 })
    .catch(() => v('an interactive part did not start'));
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  return { page, ctx, v, isDark };
}

/** Runs in the page: layout, text and contrast facts. */
function audit() {
  const de = document.documentElement;
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  cv.canvas.width = cv.canvas.height = 1;
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return cv.getImageData(0, 0, 1, 1).data; };
  const lum = ([r, g, b]) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
    .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 128) return c; } return rgba('Canvas'); };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden'; };
  const lowContrast = [];
  for (const el of document.body.querySelectorAll('*')) {
    const hasText = el.matches('input, textarea, select') || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText || !shown(el)) continue;
    const s = getComputedStyle(el), a = lum(rgba(s.color)), b = lum(bgOf(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.id).trim().slice(0, 30)}" ${ratio.toFixed(1)}:1`);
  }
  return {
    wide: de.scrollWidth > de.clientWidth ? `${de.scrollWidth} px wide at ${de.clientWidth} px` : '',
    title: document.title.trim(),
    description: document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '',
    h1: document.querySelectorAll('h1').length,
    smallInputs: [...document.querySelectorAll('input, select, textarea')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id || el.tagName),
    lowContrast,
  };
}

for (const path of pages) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, v, isDark } = await open(path, { scheme });
    const f = await page.evaluate(audit);
    if (f.wide) v(`horizontal scroll: ${f.wide}`);
    if (!f.title) v('no <title>');
    if (!f.description) v('no description');
    if (f.h1 !== 1) v(`${f.h1} h1 headings (want 1)`);
    for (const id of f.smallInputs) v(`input under 16 px: ${id}`);
    for (const t of f.lowContrast) v(`low contrast: ${t}`);
    if ((await isDark()) !== (scheme === 'dark')) v('page does not follow the system theme');
    await ctx.close();
  }
}

// No flash: the theme is set before any script file loads (the inline boot script alone).
for (const [scheme, stored, want] of [['dark', undefined, true], ['light', 'dark', true], ['dark', 'light', false]]) {
  const { ctx, v, isDark } = await open('/', { scheme, stored, blockScripts: true });
  if ((await isDark()) !== want) v(`theme before scripts is ${want ? 'light' : 'dark'}, want ${want ? 'dark' : 'light'}`);
  await ctx.close();
}

// Theme toggle: Auto → Light → Dark → Auto, and the choice survives a reload.
{
  const { ctx, page, v, isDark } = await open('/', { scheme: 'light' });
  const btn = page.getByTestId('theme-toggle');
  const expectState = async (label, dark, step) => {
    const text = (await btn.locator('span').last().textContent())?.trim();
    if (text !== label || (await isDark()) !== dark) v(`toggle ${step}: shows "${text}", dark ${await isDark()}; want "${label}", dark ${dark}`);
  };
  await expectState('Auto', false, 'at start');
  await btn.click(); await expectState('Light', false, 'after 1 click');
  await btn.click(); await expectState('Dark', true, 'after 2 clicks');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await expectState('Dark', true, 'after reload');
  await btn.click(); await expectState('Auto', false, 'after 3 clicks');
  await ctx.close();
}

// DSCR page: the engine reads the amount back in the browser; long words must wrap, not widen the page.
{
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  const field = page.locator('#fld-loanAmount'), said = page.getByTestId('amount-read');
  for (const [typed, want] of [['70 L', 'Rs. 70,00,000 (Rupees Seventy Lakh Only)'], ['1.2 Cr', 'Rs. 1,20,00,000 (Rupees One Crore Twenty Lakh Only)'], ['seventy', 'Not understood']]) {
    await field.fill(typed);
    const got = (await said.textContent())?.trim() ?? '';
    if (!got.startsWith(want)) v(`typed "${typed}", read back "${got}", want "${want}"`);
  }
  await field.fill('9,99,99,99,99,99,999');
  const f = await page.evaluate(audit);
  if (f.wide) v(`horizontal scroll after a long amount: ${f.wide}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`site check: ${pages.length} pages at 390 px, light and dark: ${violations.length} violations`);
for (const x of violations) console.log(`  - ${x}`);
process.exit(violations.length ? 1 : 0);
