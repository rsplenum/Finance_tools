/**
 * The design review's eyes (DT1, D-UX-58; the critic agent runs it). Drives a page through its states (docs/DESIGN.md,
 * "States") at 360 px and 1280 px, light and dark, and prints as text, for each state: what a phone shows before any
 * scroll from where the last step left it, the headings in order, and every measured defect (scripts/design-checks.mjs), each line once with the widths
 * and schemes it shows in. Screenshots only with --shots <dir> (full pages, PNG), since they cost the most to read.
 * --tokens prints each token pair's contrast, light and dark, measured in the browser (docs/DESIGN.md's table).
 *
 *   node scripts/design-review.mjs /dscr/ [--shots <dir>] [--only <state>]
 *   node scripts/design-review.mjs --tokens
 * Run after `npm run build`.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';
import { lostFocus, measure, openAt, STATES } from './design-checks.mjs';

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const shots = flag('--shots'), only = flag('--only'), tokens = args.includes('--tokens');
const path = args.find((a) => a.startsWith('/'));

/** Runs in the page: the text on screen where the last step left the user, and the headings in order. */
function firstScreen() {
  const h = innerHeight, seen = [];
  const walk = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(), el = n.parentElement;
    if (!t || !el.checkVisibility()) continue;
    const r = el.getBoundingClientRect();
    if (r.top < h && r.bottom > 0) seen.push(t);
  }
  const fields = [...document.querySelectorAll('main input:not([type=hidden]), main select, main textarea')].filter((el) => el.checkVisibility()).length;
  return {
    words: seen.join(' ').split(' ').length,
    text: seen.join(' | ').slice(0, 600),
    heads: [...document.querySelectorAll('h1, h2, h3')].filter((el) => el.checkVisibility()).map((el) => `${el.tagName.toLowerCase()} ${el.textContent.trim().slice(0, 50)}`),
    fields,
  };
}

// A review of a build older than the source measures the old page (UX1): say so first.
{
  const { stat, readdir } = await import('node:fs/promises');
  const src = new URL('../site/src/', import.meta.url);
  const built = (await stat(new URL('../site/dist/index.html', import.meta.url))).mtimeMs;
  let newest = 0;
  for (const f of await readdir(src, { recursive: true })) newest = Math.max(newest, (await stat(new URL(f, src))).mtimeMs);
  if (newest > built) console.log('WARNING: site/dist is older than site/src: run `npm run build` first, or this review measures the old pages.');
}
const { BASE, server } = await serveDist();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

if (tokens) {
  // Each pair a reader meets: text on its ground, a field's edge, the focus ring, the accent and the text on it.
  const pairs = [['ink', 'canvas'], ['ink-muted', 'canvas'], ['ink', 'surface'], ['ink-muted', 'surface'], ['link', 'canvas'], ['edge', 'canvas'],
    ['edge', 'field'], ['edge', 'surface'], ['focus', 'canvas'], ['focus', 'surface'], ['accent', 'canvas'], ['on-accent', 'accent'], ['good', 'canvas'], ['warn', 'canvas'],
    ['bad', 'canvas'], ['good', 'good-tint'], ['warn', 'warn-tint'], ['bad', 'bad-tint'], ['line', 'canvas']];
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await openAt(browser, `${BASE}/`, { scheme });
    const rows = await page.evaluate((pairs) => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      cv.canvas.width = cv.canvas.height = 1;
      const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
      const lum = ([r, g, b]) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, j) => s + x * [0.2126, 0.7152, 0.0722][j], 0);
      const css = (t) => getComputedStyle(document.documentElement).getPropertyValue(`--${t}`).trim();
      const probe = document.body.appendChild(document.createElement('i'));
      const col = (t) => { probe.style.color = `var(--${t})`; return rgba(getComputedStyle(probe).color); };
      const out = pairs.map(([a, b]) => { const [x, y] = [lum(col(a)), lum(col(b))]; return `${a} on ${b}: ${((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)}:1 (${css(a)} on ${css(b)})`; });
      probe.remove();
      return out;
    }, pairs);
    console.log(`${scheme}:\n  ${rows.join('\n  ')}`);
    await ctx.close();
  }
} else {
  const states = STATES[path];
  if (!states) throw new Error(`no states for ${path}: add them to STATES in scripts/design-checks.mjs`);
  if (shots) await mkdir(shots, { recursive: true });
  for (const [state, bring] of Object.entries(states)) {
    if (only && state !== only) continue;
    const found = new Map();
    let first = '';
    for (const width of ['phone', 'desktop']) {
      for (const scheme of ['light', 'dark']) {
        const { ctx, page } = await openAt(browser, BASE + path, { width, scheme });
        const errors = [];
        page.on('pageerror', (e) => errors.push(`script error: ${e.message}`));
        await bring(page);
        if (width === 'phone' && scheme === 'light') {
          const f = await page.evaluate(firstScreen);
          first = `  on screen after the last step at 360 px (${f.words} words, ${f.fields} fields shown on the page): ${f.text}\n  headings: ${f.heads.join(' / ')}`;
        }
        // Keys are traversed light and dark at each width: the ring's contrast differs, the order does not.
        for (const l of [...errors, ...await lostFocus(page, state), ...await measure(page, { phone: width === 'phone' })]) found.set(l, [...(found.get(l) ?? []), `${width === 'phone' ? 360 : 1280} ${scheme}`]);
        if (shots) await page.screenshot({ path: `${shots}/${path.replace(/\W+/g, '') || 'home'}-${state}-${width === 'phone' ? 360 : 1280}-${scheme}.png`, fullPage: true });
        await ctx.close();
      }
    }
    console.log(`\n## ${state}\n${first}`);
    if (!found.size) console.log('  measured: no defects');
    for (const [l, where] of found) console.log(`  - ${l} [${where.length === 4 ? 'all' : where.join(', ')}]`);
  }
}
await browser.close();
server.close();
