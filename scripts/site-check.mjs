/**
 * Site check (0 violations required): what must hold for any page that does the job (CHECKS1, D-TECH-113). Serves
 * site/dist the way Cloudflare Pages does and opens every built page in Chromium at 390 px, light and dark: no sideways
 * scroll, no input under 16 px, a title, a description and one h1, no script error or missing file, no light flash for a
 * dark-mode visitor. Then each tool's golden cases go in through its fields, found by their labels (`field=`,
 * scripts/field.mjs), and the figures come out: a line holds the figures and the verdict word, never the sentence
 * (`expectFigures`). The three files are downloaded and read back (scripts/read-doc.mjs); the notices, the privacy
 * lines, Undo and reload hold; and no default path asks more fields than Rahul listed (`asked`, and every page's count
 * as it loads in scripts/load-baseline.json: CLAUDE.md rule 17).
 * Then the design checks (scripts/design-checks.mjs: axe, contrast, focus, target sizes, Tab reach, 320 px, reduced
 * motion) and what a page must never do (scripts/forbidden-checks.mjs). The look is no part of this check: `npm run look`
 * (scripts/look-report.mjs) prints it and never fails.
 * Run after `npm run build`. CHROMIUM_PATH overrides the browser Playwright would use. `--quick` (D-TECH-63) opens only
 * the pages this branch's change touches (scripts/site-pages.mjs), and the motion checks only when home is one.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { docxLines, docxPart, formulaParts, pdfPages, workbook } from './read-doc.mjs';
import { DIST, serveDist } from './serve-dist.mjs';
import { designChecks, FIXED_AT } from './design-checks.mjs';
import { questionsCheck } from './load-measure.mjs';
import { forbiddenChecks } from './forbidden-checks.mjs';
import './field.mjs';
import { changedFiles, pagesFor } from './site-pages.mjs';
import { stepped } from './stepped.mjs';

const { BASE, server } = await serveDist();

// Every built page, so a new page is checked without being listed here; with --quick, those the change touches.
const built = (await readdir(DIST, { recursive: true }))
  .filter((f) => f.endsWith('.html'))
  .map((f) => '/' + f.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1'))
  .sort();
const changed = process.argv.includes('--quick') ? changedFiles() : null;
const pages = changed ? pagesFor(changed, built) : built;
const quick = pages.length < built.length;
const touched = (path) => pages.includes(path);
if (!pages.length) {
  console.log('site check: --quick, no page touched: 0 violations');
  server.close();
  process.exit(0);
}

const violations = [];

// D-BIZ-03: the brand notice, word for word as rule 4 of docs/TRADEMARKS.md gives it, read below on the planning estimate
// and in its six downloads; and, by rule 1, no logo or product image: site/public and the built site hold no image but the favicon.
const TM = await readFile(fileURLToPath(new URL('../docs/TRADEMARKS.md', import.meta.url)), 'utf8');
const NOTICE = TM.slice(TM.indexOf('4. This notice')).split('\n').find((l) => l.trim().startsWith('> '))?.trim().slice(2) ?? '(rule 4 not found)';
const SHORT = NOTICE.split(/(?<=\.) /).slice(0, 2).join(' '); // its first two sentences: the bill names brands but shows none of our prices (D-BIZ-05)
for (const [dir, label] of [[fileURLToPath(new URL('../site/public/', import.meta.url)), 'site/public'], [DIST, 'the built site']]) {
  const images = (await readdir(dir, { recursive: true })).filter((f) => /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)$/i.test(f) && f !== 'favicon.svg');
  if (images.length) violations.push(`${label} holds an image besides the favicon (docs/TRADEMARKS.md, rule 1: no logos or product photos): ${images.join(', ')}`);
}
// D-BIZ-07: every page's footer links the five policy pages; each policy page carries the draft mark while LEGAL_DRAFT
// holds, and no page a draft mark or a gap once it does not; the owner's email and grievance officer show on the Contact
// page only, and no page a PAN or a GSTIN (the owner's word, 18-10-2026). Read from site.ts and the built HTML.
const SITE_TS = await readFile(fileURLToPath(new URL('../site/src/site.ts', import.meta.url)), 'utf8');
const policyHrefs = [...(SITE_TS.match(/export const POLICIES = \[([\s\S]*?)\] as const/)?.[1] ?? '').matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
const legalDraft = /export const LEGAL_DRAFT = true;/.test(SITE_TS);
const own = (name) => SITE_TS.match(new RegExp(`export const ${name} = '([^']+)'`))?.[1];
const contactOnly = [['the contact email', own('CONTACT_EMAIL')], ['the grievance officer’s name', own('GRIEVANCE_OFFICER')]];
if (policyHrefs.length !== 5 || contactOnly.some(([, v]) => !v)) violations.push('D-BIZ-07: site.ts no longer gives the five POLICIES, CONTACT_EMAIL and GRIEVANCE_OFFICER as the site check reads them');
for (const f of (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html'))) {
  const path = '/' + f.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1');
  const html = await readFile(join(DIST, f), 'utf8');
  const nav = html.match(/<nav[^>]*data-policies[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const unlinked = policyHrefs.filter((h) => !nav.includes(`href="${h}"`));
  if (unlinked.length) violations.push(`${path}: the footer does not link ${unlinked.join(', ')} (D-BIZ-07)`);
  if (legalDraft && policyHrefs.includes(path) && !html.includes('data-draft')) violations.push(`${path}: a policy page without its draft mark while LEGAL_DRAFT holds (D-BIZ-07)`);
  if (!legalDraft && /data-(draft|gap)\b/.test(html)) violations.push(`${path}: a draft mark or a gap left with LEGAL_DRAFT false (D-BIZ-07)`);
  for (const [what, v] of contactOnly) if (v && path !== '/contact/' && html.includes(v)) violations.push(`${path}: shows ${what}, which the owner allowed on the Contact page only (D-BIZ-07)`);
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  if (/[A-Z]{5}\d{4}[A-Z]/.test(text)) violations.push(`${path}: shows a PAN or a GSTIN, which stay off the site until payments (D-BIZ-07)`);
}
// MAP1: sitemap.xml lists every built page but 404 and nothing else, at the address in astro.config.mjs; robots.txt
// points to it and blocks nothing (a blocked crawler never reads the noindex header); the /site-map/ page links every
// built page but 404 and itself, and every page's footer links it. Read from the built files.
{
  const CONFIG = await readFile(fileURLToPath(new URL('../site/astro.config.mjs', import.meta.url)), 'utf8');
  const site = CONFIG.match(/site: '([^']+)'/)?.[1]?.replace(/\/$/, '');
  const xml = await readFile(join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
  const robots = await readFile(join(DIST, 'robots.txt'), 'utf8').catch(() => '');
  const want = built.filter((p) => p !== '/404.html');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!site) violations.push('MAP1: astro.config.mjs gives no `site` for the site map');
  else if (!xml) violations.push('MAP1: the build wrote no sitemap.xml');
  else {
    const paths = locs.map((l) => (l.startsWith(site + '/') ? l.slice(site.length) : `(another address) ${l}`));
    for (const p of want.filter((p) => !paths.includes(p))) violations.push(`MAP1: ${p} is missing from sitemap.xml`);
    for (const p of paths.filter((p) => !want.includes(p))) violations.push(`MAP1: sitemap.xml lists ${p}, which is not a built page`);
  }
  if (!robots.includes(`Sitemap: ${site}/sitemap.xml`)) violations.push('MAP1: robots.txt does not point to the sitemap');
  if (/^Disallow:\s*\S/m.test(robots)) violations.push('MAP1: robots.txt blocks a path, so crawlers would never read its noindex header');
  const mapHtml = await readFile(join(DIST, 'site-map', 'index.html'), 'utf8').catch(() => '');
  const mapMain = mapHtml.match(/<main[\s\S]*?<\/main>/)?.[0] ?? '';
  if (!mapHtml) violations.push('MAP1: no /site-map/ page was built');
  else for (const p of want.filter((p) => p !== '/site-map/' && !mapMain.includes(`href="${p}"`))) violations.push(`MAP1: the /site-map/ page does not link ${p}`);
  for (const f of (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html'))) {
    const html = await readFile(join(DIST, f), 'utf8');
    const foot = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    if (!/<a href="\/site-map\/"[^>]*data-site-map/.test(foot)) violations.push(`/${f}: the footer does not link the site map (MAP1)`);
  }
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/** Opens a page at 390 px. `stored` is a saved theme choice; `blockScripts` loads the page without its script files. */
async function open(path, { scheme = 'light', stored, blockScripts = false, at = FIXED_AT, events, userAgent } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, userAgent });
  // Interaction data (UD1): `events` collects each batch the page sends, as the live Worker would get it.
  if (events) {
    await ctx.addInitScript(() => { window.__EVENTS__ = '/api/e'; });
    await ctx.route('**/api/e', (r) => { events.push(r.request().postData() ?? ''); return r.fulfill({ status: 204 }); });
  }
  if (stored) await ctx.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('app-theme', v); sessionStorage.setItem('seeded', '1'); } }, stored);
  if (blockScripts) await ctx.route('**/*.js', (r) => r.abort());
  const page = await ctx.newPage();
  // A fixed day, so the front door's "this month" (October 2026) and the documents' dates never depend on when this runs.
  await page.clock.setFixedTime(new Date(at));
  const v = (m) => violations.push(`${path} (${scheme}${stored ? `, saved ${stored}` : ''}${blockScripts ? ', no scripts' : ''}): ${m}`);
  page.on('pageerror', (e) => v(`script error: ${e.message}`));
  if (!blockScripts) {
    page.on('console', (m) => { if (m.type() === 'error') v(`console error: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) v(`missing file ${new URL(r.url()).pathname} (${r.status()})`); });
  }
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) v(`HTTP ${res?.status()}`);
  // An island behind a closed line wakes when it is opened (client:visible, the typed quotation, UXR7).
  if (!blockScripts) await page.waitForFunction(() => ![...document.querySelectorAll('astro-island[ssr]')].some((i) => !i.closest('details:not([open])')), null, { timeout: 10000 })
    .catch(() => v('an interactive part did not start'));
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  return { page: /^\/(project-report|dscr)\//.test(path) ? stepped(page) : page, ctx, v, isDark };
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
for (const [scheme, stored, want] of touched('/') ? [['dark', undefined, true], ['light', 'dark', true], ['dark', 'light', false]] : []) {
  const { ctx, v, isDark } = await open('/', { scheme, stored, blockScripts: true });
  if ((await isDark()) !== want) v(`theme before scripts is ${want ? 'light' : 'dark'}, want ${want ? 'dark' : 'light'}`);
  await ctx.close();
}

// Theme toggle: Auto → Light → Dark → Auto, and the choice survives a reload.
if (touched('/')) {
  const { ctx, page, v, isDark } = await open('/', { scheme: 'light' });
  const btn = page.getByTestId('theme-toggle');
  const expectState = async (label, dark, step) => {
    if ((await isDark()) !== dark) v(`the theme toggle ${step}: dark is ${!dark}, want ${label}`);
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

// DSCR calculator. Expected figures: fictional case A (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts.
const YEARS_A = ['2026-27', '2027-28', '2028-29', '2029-30'];

/**
 * Reads a test id's (or a locator's) text once it settles on `want`, a text or a pattern (or after 3 s); a violation when it differs.
 * It reads `textContent`, which joins paragraphs with no space ("…wardrobeWhat it is:"): a pattern puts none before a label that
 * starts one (T1, `docs/archive/LESSONS.md`).
 */
async function expectText(page, v, what, want, step) {
  const at = typeof what === 'string' ? page.getByTestId(what).first() : what, name = typeof what === 'string' ? what : String(what);
  const read = () => at.textContent({ timeout: 3000 }).then((t) => (t ?? '').replace(/\s+/g, ' ').trim(), () => '(missing)');
  const fits = (t) => (want instanceof RegExp ? want.test(t) : t === want);
  let got = await read();
  for (let i = 0; !fits(got) && i < 30; i++) { await page.waitForTimeout(100); got = await read(); }
  if (!fits(got)) await v(`${step}: ${name} says "${got}", want "${want}"`);
}
/**
 * The figures a result shows, whatever the words around them (D-TECH-111: a check holds on figures, not sentences).
 * A figure is a number with its commas, decimals, year range, % or lakh/crore; the verdict words meets, misses and short
 * count too. `want` lists them in order, a space between; `…` stands for any run of them. No `…` means these and no others.
 */
const TOKEN = /(?<![\d,])(?<!\d\.)[-−]?\d+(?:,\d+)*(?:\.\d+)?(?:-\d\d\b)?(?:%|\s?(?:lakh|crore)\b)?|\b(?:meets|misses|short)\b/gi;
const figures = (t) => (t.replace(/\s+/g, ' ').match(TOKEN) ?? []).map((x) => x.replace(/\s+/g, '').toLowerCase());
async function expectFigures(page, v, what, want, step) {
  const at = typeof what === 'string' ? page.getByTestId(what).first() : what, name = typeof what === 'string' ? what : String(what);
  const fit = new RegExp('^' + want.split(' ').filter(Boolean).map((t) => (t === '…' ? '(?:\\S+ )*' : t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ')).join('') + '$');
  // Two parts set side by side on the page run together in its text ("2026-27Meets"): read with them apart, then as written.
  const line = (t) => figures(t).map((x) => x + ' ').join('');
  const read = () => at.textContent({ timeout: 3000 }).then((t) => [line((t ?? '').replace(/([a-z\d])([A-Z])|([A-Z])([A-Z][a-z])/g, '$1$3 $2$4')), line(t ?? '')], () => null);
  const ok = (g) => g !== null && g.some((x) => fit.test(x));
  let got = await read();
  for (let i = 0; !ok(got) && i < 30; i++) { await page.waitForTimeout(100); got = await read(); }
  if (!ok(got)) await v(`${step}: ${name} shows the figures "${got === null ? '(missing)' : got[0].trim()}", want "${want}"`);
}
/**
 * Rule 17's count, the same way on every tool: the fields asked inside `scope` and outside More options, the document's
 * facts, the benchmarks and the statement reader; a typed box, a pick or a tick once, a choice once whatever its options.
 * Only Rahul raises a ceiling.
 */
const asked = (page, scope = 'main') => page.locator(scope).first().evaluate((root) => {
  const els = [...root.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter((e) => !e.closest('#more-options, #download, #benchmarks, #read'));
  return new Set(els.map((e) => (e.type === 'radio' ? `radio:${e.name || e.closest('fieldset')?.textContent}` : e))).size;
});
async function ceiling(page, v, max, what, scope) {
  const n = await asked(page, scope);
  if (n > max) v(`${what} asks ${n} fields, over Rahul's ${max} (CLAUDE.md rule 17)`);
}
/** The same for what a field holds. */
async function expectValue(page, v, sel, want, step) {
  let got = await page.inputValue(sel);
  for (let i = 0; got !== want && i < 30; i++) { await page.waitForTimeout(100); got = await page.inputValue(sel); }
  if (got !== want) v(`${step}: ${sel} holds "${got}", want "${want}"`);
}
/** Q1: each download, timed from the tap to the file on a slow phone (the CPU four times slower, as a low-cost Android);
 * past SLOW_MS it fails. Returns the file's name and bytes. */
const SLOW_MS = 1500;
const timings = [];
const saver = (page, v) => async (id) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  const [file] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.getByTestId(id).click()]);
  const ms = Date.now() - t0;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
  timings.push([id, ms]);
  if (ms > SLOW_MS) v(`${id} took ${ms} ms on a slow phone, over ${SLOW_MS} (Q1)`);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
};
// A CMA year's boxes are hidden on a phone until its year is picked (UXR6): the year's button first.
const leave = async (page, sel, value) => {
  const year = /, (\d{4}-\d\d)$/.exec(sel)?.[1], y = /^#fld-cma-(a1|a2|a3|est|proj)-/.exec(sel)?.[1];
  const pick = y ? page.getByTestId(`cma-year-${y}`) : page.locator('[role="group"][aria-label="The year shown"] button:visible', { hasText: year ?? 'none' }).first();
  if ((year || y) && !(await page.locator(sel).isVisible()) && await pick.count()) await pick.click();
  await page.fill(sel, value); await page.press(sel, 'Tab');
};
/** The detailed form sits under the closed "More options" (P1f): the flows below open it first. */
const openMore = async (page) => {
  const more = page.locator('#more-options');
  if (!(await more.evaluate((d) => d.open))) await more.locator(':scope > summary').click();
};
/** A closed line opened by a tap on its summary, unless it is open already. */
const openFold = async (page, id) => {
  const d = page.locator(`#${id}`);
  if (!(await d.evaluate((x) => x.open))) await d.locator(':scope > summary').click();
};
/** The DSCR (NEW1b) opens on what DSCR is and Start; See an example opens the report on a marked example. */
const toReport = async (page) => {
  await page.locator('[data-testid="intro"], [data-testid="report"]').first().waitFor();
  if (await page.getByTestId('intro').count()) await page.getByTestId('see-example').click();
  await page.getByTestId('report').waitFor();
};
/** Its detailed checks start from Professional mode's form emptied (the stated assumptions kept, as the old page opened),
 * with the working and the paper open to read. Professional mode is the switch on top of the report (NEW1c). */
const fromBlank = async (page) => {
  await toReport(page);
  await page.getByTestId('mode-pro').click();
  for (const id of ['working', 'paper']) await openFold(page, id);
  await page.getByTestId('dscr-clear').click();
};
/** One answer on its own screen: a choice is answered by its tap; a figure is typed and Next (Done) tapped; '' is None. */
const answer = async (page, id, value) => {
  await page.locator(`[data-testid="ask"][data-step="${id}"]`).waitFor();
  if (id === 'borrower') return page.getByTestId(`ask-choice-${value}`).click();
  if (value === '' && await page.getByTestId('ask-none').count()) return page.getByTestId('ask-none').click();
  await page.getByTestId('ask-field').fill(value);
  await page.getByTestId('ask-next').click();
};
/** A fact in the report's sentence tapped, answered on its own screen, and back on the report. */
const typeFact = async (page, id, value) => {
  await toReport(page);
  await page.locator(`[data-fact="${id}"]`).click();
  await answer(page, id, value);
  await page.getByTestId('report').waitFor();
};
/** The eight questions from Start, in the order asked, each answered from `facts` (a fact not given is None). Returns the
 * steps seen and the most fields any one of them showed. */
const answerAll = async (page, facts) => {
  if (await page.getByTestId('start').count()) await page.getByTestId('start').click();
  const seen = [];
  let most = 0;
  for (let i = 0; i < 12 && await page.locator('[data-testid="ask"]').count(); i++) {
    const step = await page.getByTestId('ask').getAttribute('data-step');
    seen.push(step);
    most = Math.max(most, await asked(page, '[data-testid="ask"]'));
    await answer(page, step, facts[step] ?? '');
    await page.waitForFunction((s) => document.querySelector('[data-testid="ask"]')?.getAttribute('data-step') !== s, step);
  }
  await page.getByTestId('report').waitFor();
  return { seen, most };
};
/** A closed line on the planning estimate opened by a tap, as a user would (V1): a section, the other things to check, what the estimate assumes. */
const tap = async (page, id) => {
  const d = page.getByTestId(id);
  // Sources, reasons and assumptions sit in one closed "How this is worked out" (WORDS1, D-UX-344): open it to reach one.
  await d.evaluate((x) => { const how = x.closest('[data-testid="how"]'); if (how && how !== x) how.open = true; });
  if (!(await d.evaluate((x) => x.open))) await d.locator(':scope > summary').click();
};

/** Case A from the loan terms, typed the way a user would, with a None or one figure for every year where that is the answer. */
async function enterCaseA(page) {
  await page.check('#fld-source-plan');
  await page.check('#fld-method-common');
  await leave(page, '#fld-loanAmount', '12 L');
  await leave(page, '#fld-ratePct', '12');
  await leave(page, '#fld-disbursed', '2026-04');
  await leave(page, '#fld-moratoriumMonths', '6');
  await page.check('#fld-repayment-quarterly');
  await leave(page, '#fld-instalments', '12');
  // Case A comes as a CA's projection, a figure for each year, so those two lines are given each year.
  await page.check('#fld-pbdit-years');
  await page.check('#fld-depreciation-years');
  const pbdit = ['5,00,000', '7,50,000', '8,00,000', '8,00,000'], depreciation = ['150000', '1.3 L', '1,10,000', '1 L'];
  for (const [i, fy] of YEARS_A.entries()) {
    await leave(page, `#fld-pbdit-${fy}`, pbdit[i]);
    await leave(page, `#fld-depreciation-${fy}`, depreciation[i]);
  }
  await page.check('#fld-nonCash-none');
  await page.check('#fld-interestOther-same');
  await leave(page, '#fld-interestOther-2026-27', '50000');
  await page.check('#fld-otherLoansInterest-none');
  await page.check('#fld-taxPct-same');
  await leave(page, '#fld-taxPct-2026-27', '25%');
}

async function layout(page, v, step) {
  // Colours are read at rest: a fade under way (a step coming in, 0.3 s, NEW1e) is not what a reader reads.
  await page.waitForFunction(() => !document.getAnimations().some((a) => a instanceof CSSTransition && a.playState === 'running'), null, { timeout: 3000 }).catch(() => {});
  const f = await page.evaluate(audit);
  if (f.wide) v(`${step}: horizontal scroll: ${f.wide}`);
  for (const id of f.smallInputs) v(`${step}: input under 16 px: ${id}`);
  for (const t of f.lowContrast) v(`${step}: low contrast: ${t}`);
}

if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  // The page opens with the assumptions answered (D-UX-08): the start questions chosen, the loan asked at once, the target
  // filled in, and the preview listing what it assumes.
  if (!(await page.isChecked('#fld-source-plan')) || !(await page.isChecked('#fld-method-common'))) v('the start questions are not answered from the assumptions');
  await page.locator('#fld-loanAmount').waitFor({ timeout: 3000 }).catch(() => v('the loan is not asked at once'));
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'the assumed target');
  // The target listed among the assumptions, with its two levels.
  await expectFigures(page, v, 'assumed-target', '1.50 1.25', 'the assumptions listed');

  // The loan amount field, kept from P0: read back in figures and words while typing; long words wrap.
  const field = page.locator('#fld-loanAmount');
  for (const [typed, want] of [['70 L', '₹70,00,000 (Rupees Seventy Lakh Only)'], ['1.2 Cr', '₹1,20,00,000 (Rupees One Crore Twenty Lakh Only)'], ['seventy', 'Not understood. Type 70 L, 1.2 Cr or 70,00,000.']]) {
    await field.fill(typed);
    await expectText(page, v, 'amount-read', want, `typed "${typed}"`);
  }
  await field.fill('9,99,99,99,99,99,999');
  await layout(page, v, 'a long amount');

  // One answer for how the loan is repaid (an EMI is monthly), listed once while it is missing.
  await page.locator('#fld-repayment-emi').waitFor({ timeout: 3000 }).catch(() => v('how the loan is repaid is not asked'));
  if (await page.locator('#fld-frequency-quarterly, #fld-style-emi').count()) v('how the loan is repaid is asked as two questions');
  // The front door takes the loan as repaid by EMI (P1f): cleared, it is listed once as needed.
  if (!(await page.isChecked('#fld-repayment-emi'))) v('the front door does not take the loan as repaid by EMI');
  const repaid = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (repaid.some((n) => /repaid|How often|Instalment type/.test(n))) v(`how the loan is repaid is asked though the front door answers it: ${JSON.stringify(repaid)}`);

  await enterCaseA(page);
  await expectFigures(page, v, 'loan-dates', '2026 2029 2026-27 2029-30', 'case A');
  await expectFigures(page, v, 'loan-level', '1,00,000', 'case A');
  await expectValue(page, v, '#fld-depreciation-2027-28', '1,30,000', '1.3 L read back once the field is left');
  // With the assumed target removed: the figures show, and the preview stays provisional and says what is still needed.
  await leave(page, '#fld-targetAverage', '');
  await leave(page, '#fld-targetMinimum', '');
  await expectFigures(page, v, 'dscr-status', '1', 'case A without a target');
  const needs = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (needs.join('|') !== 'A target DSCR for the average, the lowest year, or both') v(`case A without a target: still needed ${JSON.stringify(needs)}`);
  await expectFigures(page, v, 'dscr-average', '1.45', 'case A');
  await expectFigures(page, v, 'dscr-lowest', '1.16', 'case A');
  await expectFigures(page, v, 'dscr-lowest-year', '2027-28', 'case A');
  // The DSCR statement, as a CA lays it out: profit before tax and tax, cash available (A), debt service (B), DSCR.
  for (const [fy, dscr, cash, service] of [['2026-27', '1.20', '4,10,250', '3,41,000'], ['2027-28', '1.16', '5,83,000', '5,02,000'],
    ['2028-29', '1.33', '6,03,500', '4,54,000'], ['2029-30', '2.82', '5,89,750', '2,09,000']]) {
    await expectText(page, v, `dscr-${fy}`, dscr, `case A, DSCR for ${fy}`);
    await expectText(page, v, `available-${fy}`, cash, `case A, cash available in ${fy}`);
    await expectText(page, v, `service-${fy}`, service, `case A, debt service in ${fy}`);
  }
  await expectFigures(page, v, 'pbt-2026-27', '1,59,000', 'case A, profit before tax in 2026-27');
  await expectFigures(page, v, 'tax-2026-27', '39,750', 'case A, tax in 2026-27');
  // The Total column, by hand: cash available 21,86,500 and debt service 15,06,000 over the four years; DSCR 1.45, the average.
  await expectFigures(page, v, 'available-total', '21,86,500', 'case A, total cash available');
  await expectFigures(page, v, 'service-total', '15,06,000', 'case A, total debt service');
  await expectFigures(page, v, 'dscr-total', '1.45', 'case A, the Total column\'s DSCR');
  // The repayment schedule: the year's totals, and each month once the year is opened.
  const year1 = await page.getByTestId('schedule-2026-27').locator('summary span.text-right').allTextContents();
  if (year1.join('|') !== '1,41,000|2,00,000|10,00,000') v(`schedule 2026-27 shows ${JSON.stringify(year1)}, want interest 1,41,000, principal 2,00,000, balance 10,00,000`);
  await page.getByTestId('schedule-2026-27').locator('summary').click();
  const dec = await page.getByTestId('month-2026-12').locator('td').allTextContents();
  if (dec.join('|') !== '12,00,000|12,000|1,00,000|1,12,000|11,00,000') v(`schedule December 2026 shows ${JSON.stringify(dec)}`);

  // The common examples as the target: what limits the result, and the loan that meets it.
  await page.getByTestId('use-examples').click();
  // Six assumptions still hold: the method, the target, and the new asset, working-capital interest, loans already running
  // and other non-cash charges as answered by the assumptions (tax, profit and depreciation were typed).
  await expectFigures(page, v, 'dscr-status', '7', 'case A with the examples');
  await expectFigures(page, v, 'dscr-verdict', 'misses 2 2 2027-28 1.16 1.25 1.45 1.50', 'case A with the examples');
  await expectFigures(page, v, 'dscr-largest', '11,11,295 12,00,000 2027-28', 'case A with the examples');
  await expectFigures(page, v, 'use-amount', '11,11,295', 'case A with the examples');
  await expectFigures(page, v, 'dscr-fewest', '14 2029-30', 'case A with the examples');
  // The reading on the first screen: the loan it carries (11,11,295, about ₹11.11 lakh) beside the one asked, then the banker's terms.
  await expectFigures(page, v, 'reading', '11.11lakh 12lakh …', 'case A with the examples');

  // Tables become cards on phones and stay tables on wider screens, without a sideways scroll either way.
  await layout(page, v, 'case A filled, a schedule year open, 390 px');
  const statement = page.getByTestId('dscr-statement'), card = page.getByTestId('card-2027-28');
  if (await statement.isVisible() || !(await card.isVisible())) v('390 px: the statement is shown as a table, not as cards');
  await expectFigures(page, v, card.locator('[data-line="dscr"]'), '1.16', 'the 2027-28 card on a phone');
  await expectFigures(page, v, page.getByTestId('card-total').locator('[data-line="available"]'), '21,86,500', 'the Total card on a phone');
  await page.setViewportSize({ width: 1024, height: 900 });
  if (!(await statement.isVisible()) || await card.isVisible()) v('1024 px: the statement is shown as cards');
  await layout(page, v, 'case A filled, 1024 px');
  await page.setViewportSize({ width: 390, height: 844 });

  // Taking the offer enters the amount once, before the next paint (no frame still showing 12 L), and the preview
  // meets the target. Read one task after the click: after the page has re-rendered, before any frame.
  const filled = await page.evaluate(() => new Promise((ok) => {
    const use = document.querySelector('[data-testid="use-amount"]');
    if (!use) return ok('(no Use button)');
    use.click();
    setTimeout(() => ok(document.querySelector('#fld-loanAmount').value));
  }));
  if (filled !== '11,11,295') v(`"Use ₹11,11,295" shows "${filled}" in the loan amount until the next paint`);
  await expectFigures(page, v, 'amount-read', '11,11,295', 'after taking the largest loan');
  await expectFigures(page, v, 'dscr-verdict', 'meets 2027-28 1.25 1.25 1.56 1.50', 'after taking the largest loan');
  if (await page.getByTestId('use-amount').count()) v('the largest loan is still offered after it was taken');

  // A figure that is not understood is flagged and listed as still needed, never taken as zero.
  await leave(page, '#fld-pbdit-2028-29', 'lots');
  await page.waitForSelector('#fld-pbdit-2028-29[aria-invalid="true"]', { timeout: 3000 }).catch(() => v('"lots" in a figure is not flagged'));
  await expectFigures(page, v, 'dscr-status', '1', 'a figure not understood');
  const missing = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (missing.join('|') !== 'Profit before interest, depreciation and tax for 2028-29') v(`a figure not understood: still needed ${JSON.stringify(missing)}`);
  // The answer's outline stays, each figure a "—" until every figure is understood (UX8, D-UX-106).
  if (/\d/.test((await page.getByTestId('dscr-average').textContent()) ?? '')) v('figures shown while a figure is not understood');

  // Who the borrower is sets the tax for every year in one tap.
  await page.check('#fld-borrowerType-company');
  await expectFigures(page, v, 'tax-by', '25.168%', "the company's tax");
  if (await page.locator('#fld-taxPct-2026-27').count()) v('a tax rate is still asked after saying who the borrower is');
  // Empty the form in one tap: the assumptions and nothing typed, as the old page opened, with an undo (UXR5b, S16).
  await page.getByTestId('dscr-clear').click();
  await expectValue(page, v, '#fld-loanAmount', '', 'Clear all empties the loan');
  if (!(await page.isChecked('#fld-source-plan'))) v('Clear all did not go back to the assumptions');
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'Clear all restores the assumed target');
  await page.getByTestId('dscr-clear-undo').click();
  if (!(await page.isChecked('#fld-borrowerType-company'))) v('Undo did not bring back what Clear all took (S16)');
  await ctx.close();
}

// The same filled page in dark mode.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'dark' });
  await fromBlank(page);
  await enterCaseA(page);
  await page.getByTestId('use-examples').click();
  await expectFigures(page, v, 'dscr-average', '1.45', 'case A, dark');
  await layout(page, v, 'case A filled, dark, 390 px');
  await page.setViewportSize({ width: 1024, height: 900 });
  await layout(page, v, 'case A filled, dark, 1024 px');
  await ctx.close();
}

// A loan drawn in October: 2026-27 has interest only. The figures start in the loan's first year, as assumed and listed,
// and the question offers the later year.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  await page.check('#fld-source-plan');
  await page.check('#fld-method-common');
  await leave(page, '#fld-loanAmount', '12 L');
  await leave(page, '#fld-ratePct', '12');
  await leave(page, '#fld-disbursed', '2026-10');
  await page.check('#fld-repayment-quarterly');
  await leave(page, '#fld-moratoriumMonths', '6');
  await leave(page, '#fld-instalments', '12');
  await page.check('#fld-pbdit-years');
  await page.check('#fld-depreciation-years');
  const later = ['2027-28', '2028-29', '2029-30'], pbdit = ['7,50,000', '8,00,000', '8,00,000'], dep = ['1,30,000', '1,10,000', '1,00,000'];
  for (const [i, fy] of later.entries()) {
    await leave(page, `#fld-pbdit-${fy}`, pbdit[i]);
    await leave(page, `#fld-depreciation-${fy}`, dep[i]);
  }
  await page.check('#fld-nonCash-none');
  await page.check('#fld-interestOther-same');
  await leave(page, '#fld-interestOther-2026-27', '50000');
  await page.check('#fld-otherLoansInterest-none');
  await leave(page, '#fld-taxPct-2026-27', '25%');
  await page.getByTestId('use-examples').click();
  // 6 months of interest at 1% of 12,00,000 = 72,000 in 2026-27. The figures start there as assumed, so its profit and
  // depreciation are asked (only the later years were typed).
  await expectFigures(page, v, 'dscr-status', '2', 'a first year with interest only');
  if (!(await page.isChecked('#fld-start-2026-27'))) v("the figures do not start in the loan's first year as assumed");
  await expectText(page, v, 'assumed-start', /^The first year counted ?The year the loan is paid out ?\S.*\. ?(Change: The first year counted)?$/, 'the start assumption listed, with its reason');
  await expectFigures(page, v, page.getByTestId('start-question').locator('p').first(), '2026-27 72,000', 'the question about the first year');
  await page.check('#fld-start-2027-28');
  await expectFigures(page, v, 'dscr-status', '7', 'figures starting in 2027-28');
  if (await page.getByTestId('assumed-start').count()) v('the start assumption is still listed after choosing 2027-28');
  await expectFigures(page, v, 'dscr-before-start', '2026-27 72,000', 'figures starting in 2027-28');
  await expectValue(page, v, '#fld-pbdit-2027-28', '7,50,000', 'each figure stays under its year');
  if (await page.locator('#fld-pbdit-2026-27').count()) v('2026-27 is still asked after the figures start in 2027-28');
  await layout(page, v, 'figures starting in 2027-28');
  await page.check('#fld-start-2026-27');
  await expectFigures(page, v, 'dscr-status', '2', 'figures starting in 2026-27');
  await ctx.close();
}

// A few answers instead of every year: profit grows from one figure and one rate; the rest are one figure or None.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  await page.check('#fld-source-plan');
  await page.check('#fld-method-common');
  await leave(page, '#fld-loanAmount', '50 L');
  await leave(page, '#fld-ratePct', '10');
  await leave(page, '#fld-disbursed', '2027-04');
  await page.check('#fld-repayment-emi');
  await leave(page, '#fld-moratoriumMonths', '0');
  await leave(page, '#fld-instalments', '60');
  if (await page.getByTestId('start-question').count()) v('the first year of figures is asked though the loan has an instalment in its first year');
  // The profit line starts as "grows each year": the first year's figure and a rate.
  await leave(page, '#fld-pbdit-2027-28', '18 L');
  await leave(page, '#fld-pbdit-rate', '10');
  await expectFigures(page, v, 'readback-pbdit', '18,00,000 2027-28 26,35,380 2031-32', 'profit growing 10% a year');
  await page.check('#fld-depreciation-same');
  await leave(page, '#fld-depreciation-2027-28', '4 L');
  await page.check('#fld-nonCash-none');
  await page.check('#fld-interestOther-same');
  await leave(page, '#fld-interestOther-2027-28', '1 L');
  await page.check('#fld-otherLoansInterest-none');
  await page.check('#fld-borrowerType-company');
  await page.getByTestId('use-examples').click();
  // Eight assumptions hold: all but the tax rate (a company's tax is worked out); this year's depreciation typed once is
  // "as this year, every year".
  await expectFigures(page, v, 'dscr-status', '9', 'a few answers');
  // Four fields for a five-year loan (profit and its rate, depreciation, working-capital interest; the tax from who the
  for (const [fy, want] of [['2027-28', '18,00,000'], ['2028-29', '19,80,000'], ['2031-32', '26,35,380']])
    await expectText(page, v, `pbdit-${fy}`, want, `profit worked out for ${fy}`);
  await layout(page, v, 'a few answers, 390 px');
  await ctx.close();
}

// The owner's quick path: the loan and this year's figures, everything else as assumed and listed (fictional case A′,
// worked by hand in tests/dscr-page.test.ts).
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  await leave(page, '#fld-loanAmount', '12 L');
  await leave(page, '#fld-ratePct', '12');
  await leave(page, '#fld-disbursed', '2026-04');
  await leave(page, '#fld-moratoriumMonths', '6');
  await page.check('#fld-repayment-quarterly');
  await leave(page, '#fld-instalments', '12');
  await leave(page, '#fld-pbdit-2026-27', '5 L');
  await leave(page, '#fld-pbdit-rate', '10');
  await page.check('#fld-depreciation-same');
  await leave(page, '#fld-depreciation-2026-27', '1.5 L');
  await page.check('#fld-interestOther-same');
  await leave(page, '#fld-interestOther-2026-27', '50,000');
  await expectFigures(page, v, 'dscr-status', '10', 'the quick path');
  await expectFigures(page, v, 'dscr-average', '1.16', 'the quick path');
  await expectFigures(page, v, 'dscr-lowest', '0.84', 'the quick path');
  await expectFigures(page, v, 'assumed-tax', '31.2%', 'the quick path');
  await layout(page, v, 'the quick path, 390 px');

  // The statement to download, at 390 px. Without the borrower's name and the lender it is provisional, and says so.
  await expectFigures(page, v, 'doc-status', '2', 'the download before its facts');
  const own = await page.getByTestId('doc-needs').locator('li').allTextContents();
  if (own.join('|') !== "The borrower's name|The lender") v(`the download asks for ${JSON.stringify(own)}`);
  const save = saver(page, v);
  let pdf = await save('download-pdf');
  if (pdf.name !== 'DSCR statement (provisional).pdf') v(`the provisional PDF is named "${pdf.name}"`);
  let pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pages.every((t) => t.startsWith('DSCR statement Provisional\n'))) v('the provisional PDF is not marked provisional on every page');
  if (!pages[0].includes("• The borrower's name\n• The lender")) v('the provisional PDF does not list what is still needed');
  let word = await save('download-docx');
  if (word.name !== 'DSCR statement (provisional).docx') v(`the provisional Word copy is named "${word.name}"`);
  const mark = await docxPart(word.bytes, 'word/header1.xml').catch((e) => `(not read: ${e.message})`);
  if (mark !== 'DSCR statement\tProvisional') v(`the provisional Word copy's header says ${JSON.stringify(mark)}`);
  // A name the PDF cannot print is flagged, and asked for in English letters.
  await leave(page, '#fld-borrower', 'श्री गणेश');
  await expectText(page, v, 'fld-borrower-said', 'The document is in English: type this in English letters.', 'a name in Devanagari');
  await expectText(page, v, page.getByTestId('doc-needs').locator('li').first(), "The borrower's name, in English letters", 'a name in Devanagari');
  await leave(page, '#fld-borrower', 'Asha Traders');
  await leave(page, '#fld-lender', 'Example Bank, Pune branch');
  // The address, the purpose and a GSTIN sit under one closed line (D2); a GSTIN without its shape is flagged.
  if (await page.locator('#doc-more').getAttribute('open') !== null) v('the address, purpose and GSTIN line is open by default');
  await page.locator('#doc-more summary').click();
  await leave(page, '#fld-gstin', '27ABCDE1234');
  await expectFigures(page, v, 'fld-gstin-said', '15', 'a short GSTIN');
  // Its need links to its box, opening the closed line on the way (UXR7, as on the CMA and the report).
  await page.locator('#doc-more summary').click();
  await page.getByTestId('doc-needs').getByRole('link', { name: /^The GSTIN/ }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-gstin', null, { timeout: 3000 }).catch(() => v('the statement\'s "The GSTIN" does not open its line and land on its box'));
  await leave(page, '#fld-gstin', '');
  await expectText(page, v, 'doc-status', 'All questions answered', 'the download with its facts');
  if (await page.getByTestId('doc-needs').count()) v('the download still lists needs once its facts are in');
  pdf = await save('download-pdf');
  if (pdf.name !== 'DSCR statement - Asha Traders.pdf') v(`the PDF is named "${pdf.name}"`);
  pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  // Page 1 at a glance (D-DOC-18): the borrower, the lender, the average and the lowest year, the status. Page 2: the
  // whole working and the signature (P1g).
  const first = pages[0].split('\n'), second = (pages[1] ?? '').split('\n');
  for (const want of ['Asha Traders', 'Average DSCR Lowest year', '1.16 0.84', 'Status Complete'])
    if (!first.includes(want)) v(`the PDF's first page has no line "${want}"`);
  for (const want of ['1. The statement', 'For Asha Traders', 'Profit before tax 1,59,000 2,48,000 3,51,000 4,56,500 12,14,500',
    'Cash available (A) 4,00,392 4,22,624 4,45,488 4,73,072 17,41,576', 'DSCR (A ÷ B) 1.17 0.84 0.98 2.26 1.16'])
    if (!second.includes(want)) v(`the PDF's second page has no line "${want}"`);
  if (!first.some((l) => l.startsWith('Lender Example Bank, Pune branch Prepared on '))) v("the PDF's first page does not name the lender");
  if (pages.length < 3 || pages.join('\n').includes('Provisional')) v(`the PDF has ${pages.length} pages, or still says provisional`);
  if (!pages.join('\n').includes('Annex 1. The basis') || !pages.join('\n').includes('Annex 2. Repayment schedule')) v('the PDF does not hold its two annexes');
  // What stays on the page only (D-DOC-03, and the owner on 02-10-2026): the assumptions, the verdict, the largest loan,
  // the fewest instalments, the lender's target, how far the method was checked, and the rules for building the figures.
  // The status went onto page 1 with D-DOC-18.
  const ONLY_ON_THE_PAGE = ['Assumed until changed', 'Misses', 'largest loan your business', 'The shortest repayment', 'target', 'checked', 'How the figures are built'];
  for (const not of ONLY_ON_THE_PAGE) if (pages.join('\n').includes(not)) v(`the PDF says "${not}"`);
  const xlsx = await save('download-xlsx');
  if (xlsx.name !== 'DSCR statement - Asha Traders.xlsx') v(`the Excel copy is named "${xlsx.name}"`);
  const book = await workbook(xlsx.bytes).catch((e) => v(`the Excel copy is not read: ${e.message}`)) ?? [];
  // The PDF's parts as sheets, the engine's figures as numbers, and not one formula (D-DOC-21).
  const cash = book.flatMap((x) => x.data).find((r) => r[0] === 'Cash available (A)' && r.some((c) => typeof c === 'number'))?.filter((c) => typeof c === 'number') ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'At a glance|DSCR statement|Basis|Repayment schedule' || JSON.stringify(cash) !== JSON.stringify([400392, 422624, 445488, 473072, 1741576]))
    v(`the Excel copy holds sheets ${JSON.stringify(book.map((x) => x.sheet))} and cash available ${JSON.stringify(cash)}`);
  const withFormulas = await formulaParts(xlsx.bytes);
  if (withFormulas.length) v(`the Excel copy holds formulas in ${withFormulas.join(', ')}`);
  const cells = book.flatMap((x) => x.data.flat()).filter((c) => typeof c === 'string').join('\n');
  for (const not of ONLY_ON_THE_PAGE) if (cells.includes(not)) v(`the Excel copy says "${not}"`);
  word = await save('download-docx');
  if (word.name !== 'DSCR statement - Asha Traders.docx') v(`the Word copy is named "${word.name}"`);
  const { lines: said, messages } = await docxLines(word.bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (messages.length) v(`the Word copy is not read cleanly: ${JSON.stringify(messages).slice(0, 200)}`);
  for (const want of ['Asha Traders', 'Cash available (A) | 4,00,392 | 4,22,624 | 4,45,488 | 4,73,072 | 17,41,576', 'DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26 | 1.16', 'Annex 1. The basis', 'Annex 2. Repayment schedule'])
    if (!said.includes(want)) v(`the Word copy has no line "${want}"`);
  for (const not of ONLY_ON_THE_PAGE) if (said.join('\n').includes(not)) v(`the Word copy says "${not}"`);
  if (await docxPart(word.bytes, 'word/header1.xml') !== 'DSCR statement · Asha Traders') v("the Word copy's header does not name the borrower");
  await layout(page, v, 'the download, 390 px');
  await ctx.close();
}

// Who the borrower is, loans already running and the new asset (P1e), on the quick path (fictional case A′, worked by
// hand in tests/dscr-page.test.ts). A proprietor pays no tax on these profits; then EMIs of 20,000 a month running on and
// 15,000 a month to June 2027 (4,20,000, 2,85,000, 2,40,000, 2,40,000 a year) and the new asset's 3,60,000 a year from
// October 2026 (1,80,000 in 2026-27). Cash 6,30,000 against 7,61,000 in 2026-27: 0.83; average 33,80,500 / 26,91,000 = 1.26.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  await leave(page, '#fld-loanAmount', '12 L');
  await leave(page, '#fld-ratePct', '12');
  await leave(page, '#fld-disbursed', '2026-04');
  await leave(page, '#fld-moratoriumMonths', '6');
  await page.check('#fld-repayment-quarterly');
  await leave(page, '#fld-instalments', '12');
  await leave(page, '#fld-pbdit-2026-27', '5 L');
  await leave(page, '#fld-pbdit-rate', '10');
  await page.check('#fld-depreciation-same');
  await leave(page, '#fld-depreciation-2026-27', '1.5 L');
  await page.check('#fld-interestOther-same');
  await leave(page, '#fld-interestOther-2026-27', '50,000');
  await page.check('#fld-borrowerType-proprietor');
  await expectFigures(page, v, 'tax-by', '5% 30% 4% 12,00,000', "a proprietor's tax");
  await expectFigures(page, v, 'tax-2026-27', '0', "a proprietor's tax");
  await expectFigures(page, v, 'dscr-average', '1.41', "a proprietor's tax");
  await expectText(page, v, 'assumed-proprietorTax', /^Tax for a proprietor ?The new tax regime’s slab rates, the business the only income ?\S.*\. ?(Change.*)?$/, "a proprietor's tax, with its reason");
  await page.check('#fld-otherLoansInterest-emi');
  await expectText(page, v, 'emis-ask', 'All EMIs a month, business and personal (home, car, personal loans).', "a proprietor's EMIs");
  await leave(page, '#fld-emi-1', '20000');
  await page.getByTestId('add-loan').click();
  await leave(page, '#fld-emi-2', '15,000');
  await leave(page, '#fld-emiLast-2', '2027-06');
  await expectFigures(page, v, 'readback-existingEmis', '4,20,000 2026-27 2,85,000 2027-28 2,40,000 2028-29 2,40,000 2029-30', 'EMIs a month');
  await expectFigures(page, v, 'emis-2027-28', '2,85,000', 'EMIs a month in the statement');
  await expectFigures(page, v, 'service-2026-27', '7,61,000', 'EMIs a month in the statement');
  await page.check('#fld-assetIncome-from');
  await leave(page, '#fld-assetIncome-yearly', '3.6 L');
  await leave(page, '#fld-assetIncome-start', '2026-10');
  await expectFigures(page, v, 'asset-2026-27', '1,80,000', 'the new asset from October 2026');
  await expectFigures(page, v, 'dscr-2026-27', '0.83', 'the new asset from October 2026');
  await expectFigures(page, v, 'dscr-average', '1.26', 'the new asset from October 2026');
  for (const id of ['assumed-asset', 'assumed-otherLoans', 'assumed-tax']) if (await page.getByTestId(id).count()) v(`${id} is still listed after it was answered`);
  await layout(page, v, 'borrower, EMIs and the new asset, 390 px');
  await ctx.close();
}

// Own yearly figures (tests/dscr.test.ts, "which years count"): the loan amount is not asked, and the year with no
// instalment is not counted.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await fromBlank(page);
  await page.check('#fld-source-own');
  await page.check('#fld-method-common');
  await page.locator('#fld-firstYear').waitFor({ state: 'attached', timeout: 3000 }).catch(() => v('own figures: the years are not asked'));
  if (await page.locator('#fld-loanAmount').count()) v('own figures: the loan amount is asked though it does not change the answer');
  await leave(page, '#fld-firstYear', '2026-27');
  await leave(page, '#fld-yearCount', '3');
  await expectFigures(page, v, 'years-read', '2026-27 2028-29', 'own figures');
  const fys = ['2026-27', '2027-28', '2028-29'];
  const own = { pat: ['60000', '80000', '100000'], depreciation: ['40000', '40000', '40000'], interestTL: ['50000', '40000', '20000'], principalTL: ['0', '100000', '100000'] };
  for (const [k, xs] of Object.entries(own)) for (const [i, fy] of fys.entries()) await leave(page, `#fld-${k}-${fy}`, xs[i]);
  await expectValue(page, v, '#fld-principalTL-2026-27', '0', 'a typed 0 stays');
  // Own figures take none of the assumptions about the figures; the method and the target still hold.
  await expectFigures(page, v, 'dscr-status', '1', 'own figures before None');
  await page.check('#fld-nonCash-none');
  await leave(page, '#fld-targetAverage', '1.5');
  await expectFigures(page, v, 'dscr-status', '2', 'own figures');
  await expectFigures(page, v, 'dscr-average', '1.23', 'own figures');
  await expectFigures(page, v, 'dscr-lowest', '1.14', 'own figures');
  await expectFigures(page, v, 'dscr-not-counted', '2026-27', 'own figures');
  await expectFigures(page, v, 'dscr-verdict', 'misses 2 2 2027-28 1.14 1.25 1.23 1.50', 'own figures');
  await layout(page, v, 'own figures filled');
  await ctx.close();
}

// The DSCR (NEW1b, Rahul's review of 12-11-2026) on a 375 × 667 phone in November 2026, the month of
// tests/dscr-worked.test.ts. It opens on what DSCR is and Start, with no field; See an example opens the report, marked,
// every fold closed, the paper's files marked Example. Then the questions, one a screen with one field each (D-UX-10: at
// most 8 questions, and at most 8 facts in the report's sentence). A textbook EMI: ₹10,00,000 at 12% for one year is
// ₹88,848.79 a month; 12 of them less the loan is ₹66,185 of interest. The loan drawn in November: 2026-27 holds
// five of its twelve months.
const NOV = '2026-11-02T10:00:00+05:30';
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', at: NOV });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByTestId('intro').waitFor();
  const first = await page.evaluate(() => {
    const foot = (id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().bottom ?? 9999;
    const fields = [...document.querySelectorAll('main input, main select, main textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return { lead: foot('intro-lead'), start: foot('start'), fields: fields.length };
  });
  for (const k of ['lead', 'start']) if (first[k] > 667) v(`375 × 667: the ${k} is not on the first screen (its foot at ${Math.round(first[k])} px)`);
  if (first.fields) v(`375 × 667: ${first.fields} fields show on opening`);
  await expectText(page, v, 'intro-lead', /^Banks check it with the DSCR: .* Most look for 1\.50 or more\.$/, 'what DSCR is, in a few words');
  await layout(page, v, 'the start, 375 px');
  await page.getByTestId('see-example').click();
  for (const id of ['working', 'paper']) if (await page.locator(`#${id}`).evaluate((d) => d.open)) v(`${id} is open on the example`);
  // Two ways in (NEW1c, Rahul): the example opens in Simple mode, every field out of sight.
  if (await page.locator('#more-options').count()) v('the example opens with every field shown, not in Simple mode');
  const top = await page.evaluate(() => ({ reading: document.querySelector('[data-testid="reading"]')?.getBoundingClientRect().bottom ?? 9999, mains: document.querySelectorAll('[data-testid="next"]').length }));
  if (top.reading > 667) v(`375 × 667: the example's reading is not on the first screen (its foot at ${Math.round(top.reading)} px)`);
  if (top.mains !== 1) v(`${top.mains} main buttons on the report, not one`);
  await expectText(page, v, 'mark', /^Example /, 'the example marked');
  // The largest loan the example carries, solved directly in tests/dscr-worked.test.ts.
  await expectFigures(page, v, 'reading', '14.39lakh 12lakh …', 'the example');
  if (await page.getByTestId('next').getAttribute('data-next') !== 'ask') v('the example: the next step is not "Answer the 8 questions"');
  if (!(await page.getByTestId('levels').isVisible())) v('the example: no DSCR by year');
  await openFold(page, 'paper');
  for (const id of ['download-pdf', 'download-xlsx', 'download-docx', 'print']) if (await page.getByTestId(id).count() !== 1) v(`the paper: no ${id}`);
  const save = saver(page, v);
  const pdf = await save('download-pdf');
  if (pdf.name !== 'DSCR statement (example).pdf') v(`the example's PDF is named "${pdf.name}"`);
  const pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pages.every((t) => t.startsWith('DSCR statement Example\n'))) v(`the example's PDF is not marked Example on every page: ${JSON.stringify(pages[0].slice(0, 60))}`);
  const xlsx = await save('download-xlsx');
  if (xlsx.name !== 'DSCR statement (example).xlsx') v(`the example's Excel copy is named "${xlsx.name}"`);
  // The questions, from the report's next step: one field a screen, the box and Next in view above a phone's keyboard.
  await page.getByTestId('next').click();
  await page.getByTestId('ask').waitFor();
  if (!(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')?.startsWith('ask-choice-')))) v('the first question does not take the focus');
  await answer(page, 'borrower', 'firm');
  await page.locator('[data-testid="ask"][data-step="profit"]').waitFor();
  const box = await page.evaluate(() => ({ box: document.querySelector('[data-testid="ask-field"]')?.getBoundingClientRect().bottom ?? 9999, next: document.querySelector('[data-testid="ask-next"]')?.getBoundingClientRect().bottom ?? 9999 }));
  if (box.box > 260 || box.next > 340) v(`375 × 667: the box ends ${Math.round(box.box)} px and Next ${Math.round(box.next)} px down, into where a phone's keyboard opens`);
  await page.getByTestId('ask-field').fill('lots');
  await page.getByTestId('ask-next').click();
  await page.waitForSelector('[data-testid="ask-field"][aria-invalid="true"]', { timeout: 3000 }).catch(() => v('"lots" for the profit is not flagged'));
  if ((await page.getByTestId('ask').getAttribute('data-step')) !== 'profit') v('a figure not understood moved on');
  await page.getByTestId('ask-field').fill('5 L');
  await expectText(page, v, 'ask-said', 'Reads as ₹5 lakh', 'the profit read back');
  if (!(await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'ask-field'))) v('the box loses the focus');
  await page.getByTestId('ask-next').click();
  const walk = await answerAll(page, { growth: '10', amount: '10 L', rate: '12', years: '1' });
  const steps = ['borrower', 'profit', ...walk.seen];
  if (steps.join(' ') !== 'borrower profit growth amount rate years emis depreciation') v(`the questions asked: ${steps.join(', ')}`);
  if (steps.length > 8) v(`${steps.length} questions, over Rahul's 8 (CLAUDE.md rule 17)`);
  if (walk.most > 1) v(`a question shows ${walk.most} fields, not one`);
  const facts = await page.locator('#front-door [data-fact]').count();
  if (facts > 8) v(`the report's sentence has ${facts} facts, over Rahul's 8 (CLAUDE.md rule 17)`);
  await ceiling(page, v, 0, 'the report', '[data-testid="report"]');
  if (await page.getByTestId('mark').count()) v('every question answered: the example mark still shows');
  if (await page.getByTestId('next').getAttribute('data-next') !== 'paper') v('every question answered: the next step is not the paper');
  await expectFigures(page, v, 'dscr-instalment', '88,848.79', 'the textbook EMI');
  await expectFigures(page, v, 'dscr-total-interest', '66,185', 'the textbook EMI');
  await openFold(page, 'working');
  await expectFigures(page, v, 'part-2026-27', '5 12', 'the first part-year');
  // Each year against the target is the chart's; the working does not say it again (Rahul, NEW1c: "First time is fine").
  if (await page.getByTestId('dscr-marks').count()) v('the years are marked against the target twice, in the chart and in the working');
  if (await page.locator('#more-options').count()) v('Professional mode opened by itself');
  // Simple mode says what it filled in, under the answer, each with its reason and a way to its field.
  if (!(await page.getByTestId('filled').isVisible())) v('Simple mode does not say what it filled in');
  await expectFigures(page, v, 'assumed-target', '1.50 1.25', 'the target among the assumptions');
  await expectFigures(page, v, 'assumed-loanStart', '…', 'the loan taken as drawn this month');
  await layout(page, v, 'the questions answered, 375 px');
  // D1 (D-UX-47): the lenders' lines in the working, their inputs only in Professional mode; the questions still 8.
  if (!(await page.getByTestId('lender-ask').isVisible())) v('D1: no line asking for sales beside the DSCR');
  const avg = await page.getByTestId('dscr-average').textContent();
  await page.getByTestId('lender-ask').locator('a').click();
  await leave(page, '#fld-lender-sales', '50 L');
  if (!/^Sales price 5% lower: average \d\.\d{2,4}, lowest /.test((await page.getByTestId('lender-price').textContent()) ?? '')) v('D1: no line for the sales price 5% lower');
  if (!(await page.getByTestId('lender-costs').count())) v('D1: no line for costs 10% higher');
  if ((await page.getByTestId('dscr-average').textContent()) !== avg) v('D1: the sales changed the borrower\'s DSCR');
  await layout(page, v, 'the lenders\' tests open, 375 px');
  // Undo and Start over on top of the report (Rahul: "no option to undo or reset … it's not where it should be").
  if (!(await page.getByTestId('report-undo').isVisible())) v('a change in Professional mode gives no Undo on top of the report');
  if (!(await page.getByTestId('clear').isVisible())) v('no Start over on top of the report');
  await page.setViewportSize({ width: 1280, height: 900 });
  await layout(page, v, 'the questions answered, 1280 px');
  await ctx.close();
}

// When it falls short (D-UX-346): the home page's case S, worked by hand in tests/dscr-worked.test.ts and
// tests/dscr-plan.test.ts, drawn in October 2026 as there (a firm, ₹4,50,000 this year with no growth; ₹12,00,000 at 12% over 5 years; the targets
// 1.50 and 1.25), in the dark. The reading gives the loan it carries beside the one asked; the ways that work stand under
// it with no tap, each as was → becomes; repaying over longer is 7 years 7 months, 91 EMIs of ₹20,145.98
// (P·r ÷ (1 − (1 + r)^−n)). Used, it meets; Undo, beside it and on top of the report, puts the loan back.
const CASE_S = { borrower: 'firm', profit: '4.5 L', growth: '0', amount: '12 L', rate: '12', years: '5' };
// The professional way in (NEW1c, Rahul, 12-11-2026): the same 8 questions, then every field filled in from the answers,
// to change, with the answer kept in sight on a phone; Simple puts the fields away again. The fields sit under
// #more-options, so the report still asks nothing (rule 17).
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByTestId('start-pro').click();
  await answerAll(page, CASE_S);
  if (await page.getByTestId('report').getAttribute('data-mode') !== 'pro') v('Professional: the questions do not end on every field');
  await expectValue(page, v, '#fld-loanAmount', '12,00,000', 'Professional: the loan answered, in its field');
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'Professional: the target filled in');
  await ceiling(page, v, 0, 'the report in Professional mode', '[data-testid="report"]');
  if (!(await page.getByTestId('pro-strip').isVisible())) v('Professional, 375 px: the DSCR is not kept in sight above the fields');
  await layout(page, v, 'Professional mode, 375 px');
  // The fields as guided steps (NEW1e, Rahul: "grouped in to sensible and reasonable tabs and guided", never a scroll
  // across): five named steps on a rail, one shown at a time; Next names the next step, moves the rail and takes the focus
  // to it; the bar at the foot keeps the DSCR in sight; a Change link to a box in another step opens that step at the box.
  const steps = page.getByTestId('steps'), now = () => steps.getAttribute('data-step-now');
  if (await page.locator('[data-step-panel]:not([hidden])').count() !== 1) v('Professional: not one step shown at a time');
  if (await page.locator('[data-steps] button').count() !== 5) v('Professional: not five steps for a projection');
  if ((await page.getByTestId('next-how').innerText()).replace(/\s*→\s*$/, '').trim() !== 'Next: Loan') v('Professional: Next does not name the next step');
  await page.getByTestId('next-how').click();
  if (await now() !== 'loan' || await page.getByTestId('step-loan').getAttribute('aria-current') !== 'step') v('Professional: Next does not move the steps to the loan');
  await page.waitForFunction(() => document.activeElement?.matches('[data-step-panel="loan"] [data-step-title]'), null, { timeout: 2000 }).catch(() => v('Professional: Next does not take the focus to the step'));
  const inSight = (sel) => page.locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  if (!(await inSight('[data-testid="pro-strip"]'))) v('Professional, 375 px: the DSCR is not in sight in the bar at the foot');
  await page.getByTestId('why-all').locator(':scope > summary').click();
  await page.getByTestId('assumed-target').locator('summary').click();
  await page.getByTestId('assumed-target').getByRole('link').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="steps"]')?.getAttribute('data-step-now') === 'target' && document.activeElement?.closest('[data-step-panel="target"]'), null, { timeout: 4000 })
    .catch(async () => v(`Professional: a Change link does not open its step at its box (at ${await now()})`));
  if (!(await inSight('*:focus'))) v('Professional: the box a Change link opens is out of sight');
  await layout(page, v, 'Professional mode, 375 px, at the target step');
  await page.getByTestId('mode-simple').click();
  if (await page.locator('#more-options').count()) v('Simple mode still shows every field');
  if (!(await page.getByTestId('filled').isVisible())) v('Simple mode does not say what it filled in');
  await ctx.close();
}

if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'dark' });
  await page.setViewportSize({ width: 375, height: 667 });
  await layout(page, v, 'the start, dark, 375 px');
  await page.getByTestId('start').click();
  await layout(page, v, 'a question, dark, 375 px');
  await answerAll(page, CASE_S);
  await expectFigures(page, v, 'reading', '9.56lakh 12lakh …', 'case S');
  for (const id of ['longer', 'own', 'mix']) if (!(await page.getByTestId(`option-${id}`).isVisible())) v(`case S: no option ${id} under the reading`);
  await expectFigures(page, v, 'option-longer', '5 7 7 12,00,000 … 20,145.98 …', 'case S, repay over longer');
  await layout(page, v, 'case S, the ways that work, dark, 375 px');
  await page.getByTestId('use-longer').click();
  await expectText(page, v, 'used', /^Used: Repay over longer\./, 'case S, repay over longer used');
  if (await page.getByTestId('next').getAttribute('data-next') !== 'paper') v('case S: once it works the next step is not the paper');
  await expectFigures(page, v, 'dscr-instalment', '20,145.98', 'case S, repay over longer used');
  await openFold(page, 'working');
  await expectFigures(page, v, 'dscr-verdict', '… meets …', 'case S, repay over longer used');
  await page.getByTestId('undo').click();
  await expectFigures(page, v, 'reading', '9.56lakh 12lakh …', 'case S, undone');
  if (!(await page.getByTestId('option-longer').isVisible())) v('case S: Undo does not bring back the ways that work');
  // One answer changed from the report's sentence, then undone from the top of the report.
  await typeFact(page, 'amount', '9 L');
  await expectFigures(page, v, 'reading', '… 9lakh …', 'case S, the loan changed to 9 lakh');
  await page.getByTestId('report-undo').click();
  await expectFigures(page, v, 'reading', '9.56lakh 12lakh …', 'case S, the change undone');
  await ctx.close();
}

// Kept on the device (docs/WORKED-PAGE.md §4): an answer is saved under one versioned key and nothing else; a reload
// comes back to the next question, or to the report once the questions are answered, and a visit with home's case keeps
// them; an old shape is brought forward or dropped, never half-read; Start over removes them, with an undo.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', at: NOV });
  if (await page.getByTestId('kept-line').count() !== 1) v('the line on what is kept shows not once');
  const keys = () => page.evaluate(() => ({ l: Object.keys(localStorage), s: Object.keys(sessionStorage).filter((k) => k !== 'seeded'), dscr: localStorage.getItem('worked:dscr') }));
  await page.getByTestId('see-example').click();
  if ((await keys()).dscr) v('the example is saved before anything is answered');
  await page.getByTestId('back-start').click();
  await page.getByTestId('start').click();
  await answer(page, 'borrower', 'firm');
  await answer(page, 'profit', '4.5 L');
  await page.locator('[data-testid="ask"][data-step="growth"]').waitFor();
  let held = await keys();
  const kept = JSON.parse(held.dscr ?? 'null');
  if (kept?.v !== 1 || !kept?.c?.mine?.includes('profit')) v(`an answer is kept as ${String(held.dscr).slice(0, 80)}`);
  if (held.l.some((k) => !['app-theme', 'worked:dscr'].includes(k)) || held.s.length) v(`the device holds ${[...held.l, ...held.s].join(', ')}`);
  if ((held.dscr ?? '').length > 20000 || /data:|blob:|%PDF/.test(held.dscr ?? '')) v('the kept answers hold more than what was typed');
  await page.reload({ waitUntil: 'networkidle' });
  if ((await page.getByTestId('ask').getAttribute('data-step').catch(() => null)) !== 'growth') v('a reload does not come back to the next question');
  await answerAll(page, CASE_S);
  const reading = await page.getByTestId('reading').textContent();
  await page.reload({ waitUntil: 'networkidle' });
  await expectText(page, v, 'reading', (reading ?? '').replace(/\s+/g, ' ').trim(), 'a reload');
  await page.goto(`${BASE}/dscr/?case=home`, { waitUntil: 'networkidle' });
  await page.goto(`${BASE}/dscr/`, { waitUntil: 'networkidle' });
  await expectText(page, v, 'reading', (reading ?? '').replace(/\s+/g, ' ').trim(), 'a visit with home\'s case');
  // An odd kept shape is dropped and the start shown.
  await page.evaluate(() => localStorage.setItem('worked:dscr', '{"v":99,"c":{"s":7}}'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('intro').waitFor({ timeout: 3000 }).catch(() => v('an unknown kept shape does not open on the start'));
  await answerAll(page, { ...CASE_S, amount: '15 L' });
  await page.getByTestId('clear').click();
  await page.getByTestId('intro').waitFor({ timeout: 3000 }).catch(() => v('Start over does not go back to the start'));
  held = await keys();
  if (held.dscr) v('Start over left the kept answers behind');
  await page.getByTestId('clear-undo').click();
  await expectFigures(page, v, page.locator('[data-fact="amount"]'), '15lakh', 'Undo after Start over');
  await ctx.close();
}

// The planning estimate (E1, E3, A3, A8, V1): six questions and no other field, then the answer first; a line for every
// section, ten on for a renovation and ten for interiors with Furniture and Soft furnishings (D-UX-19); a slider and what
// it changed, the strip, Compare, the rooms (a size and a level of one's own) and the item drawer; the downloads read
// back. A 2BHK of 1,000 sq ft in Pune at Basic, worked by hand in tests/architect.test.ts and tests/library.test.ts: the
// living room's floor is 303.03 sq ft of tiles at ₹111.65 = ₹33,833.
for (const scheme of touched('/estimate/') ? ['light', 'dark'] : []) {
  const { ctx, page, v } = await open('/estimate/', { scheme });
  if (await page.locator('#typed-path').evaluate((d) => d.open)) v('the typed quotation is open on load');
  await ceiling(page, v, 7, 'the estimate', '#six-questions');   // six questions; the size is a box and its unit
  await page.check('field=Repair or renovate…');
  await page.check('#fld-home-flat');
  await page.selectOption('field=Which city?', 'pune');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('field=2 BHK');
  // The questions fold into one line as the sixth is answered, so the last is clicked rather than checked.
  await page.click('field=Basic…');
  await expectFigures(page, v, 'pl-summary', '1,000 2', 'the answers folded');
  // The headline as precise as the estimate, the exact total beside it for the bill and the documents (UX8, D-UX-106).
  const head = ((await page.getByTestId('pl-total').textContent()) ?? '').trim();
  if (!/^₹[\d,]+\.\d (lakh|crore)$/.test(head)) v(`the estimate's headline reads "${head}"`);
  const exact = /₹\d[\d,]*\d/.exec((await page.getByTestId('pl-exact').textContent()) ?? '')?.[0] ?? '';
  if (!exact) v('the exact total is not beside the headline');
  await expectText(page, v, 'pl-sticky-total', head, 'the total in the bar at the bottom');
  // L1: the level's range by its choices, as a bar under the total with its words.
  await expectText(page, v, 'pl-range', /^At Basic: the cheapest choice in each item to the dearest; \d+ of the \d+ items offer one\.$/, 'the level\'s range under the total');
  const strip = (await page.getByTestId('pl-strip-1').textContent()) ?? '';
  if (!strip.includes(exact) || (await page.getByTestId('pl-strip-1').getAttribute('aria-pressed')) !== 'true')
    v('the strip does not mark Basic at the total');
  await tap(page, 'pl-card-flooring');
  if (await page.getByTestId('pl-brand-notice-flooring').count()) v('the brand notice shows with the floors\' items, though none names a brand until a drawer opens (D-BIZ-05)');
  const living = page.getByTestId('pl-line-living:floor:floor-skirting');
  await expectFigures(page, v, living.locator('p').nth(1), '303.03 111.65 33,833', 'the living room floor, by hand');
  await page.getByTestId('pl-open-living:floor:floor-skirting').click();
  await expectText(page, v, 'pl-brand-notice-flooring', NOTICE, 'the brand notice once the floor\'s drawer shows its brands, word for word (D-BIZ-03, D-BIZ-05)');
  // L1: the choices at the line's level first, under its name; each other level one tap away, closed.
  await expectFigures(page, v, page.getByTestId('pl-choices-1').locator('p').first(), '5', 'the choices at the line\'s level first');
  await layout(page, v, `the estimate with the drawer open, 390 px, ${scheme}`);
  if (scheme === 'dark') { await ctx.close(); continue; }
  await expectText(page, v, page.getByTestId('pl-assumed').locator(':scope > summary'), /^What the estimate assumes \(\d+\)$/, 'the assumptions behind one line with their count');
  await tap(page, 'pl-assumed');
  await expectText(page, v, 'pl-assumed-0', /^Rooms: Living and dining/, 'the assumptions');
  await expectText(page, v, 'pl-rates', /^A planning estimate: rates as reported on \d\d-\d\d-\d{4} for Pune; \d+ of \d+ lines verified at their pages$/, 'the rates as reported, in one line by the total');

  // The downloads, at the package as answered.
  await expectFigures(page, v, 'pl-doc-status', '2', 'the planning estimate before its facts');
  await page.getByTestId('pl-doc-needs').getByRole('link', { name: 'The property’s address' }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-pl-property', null, { timeout: 3000 }).catch(() => v('the planning estimate\'s "The property’s address" does not land on its box'));
  await leave(page, 'field=Owner’s name', 'Asha Rao');
  await leave(page, '#fld-pl-property', 'Flat 4, Example Towers, Pune');
  await expectText(page, v, 'pl-doc-status', 'All questions answered', 'the planning estimate with its facts');
  const save = saver(page, v);
  const pdf = await save('pl-download-pdf');
  if (pdf.name !== 'Planning estimate - Asha Rao.pdf') v(`the planning estimate PDF is named "${pdf.name}"`);
  const pdfText = (await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]));
  const figure = exact.replace('₹', '');
  if (!pdfText[0].includes('Estimate of cost of renovation') || !pdfText[0].split('\n').includes(`Total estimated cost ${figure}`)
    || !pdfText.some((x) => x.includes('Annex 1. Detailed estimate')) || !pdfText.some((x) => x.includes('Annex 2. What the estimate assumes')) || !pdfText.join('\n').includes('303.03'))
    v('the planning estimate PDF does not read back its title, total, annexes and the living room floor');
  const book = await workbook((await save('pl-download-xlsx')).bytes).catch((e) => v(`the planning estimate's Excel copy is not read: ${e.message}`)) ?? [];
  const floor = book[1]?.data.find((r) => typeof r[0] === 'string' && r[0].includes('Living and dining: Double-charge vitrified tiles'))?.filter((c) => c !== null);
  if (book.map((x) => x.sheet).join('|') !== 'Estimate|Detailed estimate|Assumptions' || JSON.stringify(floor?.slice(1)) !== JSON.stringify(['Basic', 303.03, 'sq ft', 111.65, 33833.3]))
    v(`the planning estimate's Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))} and the floor ${JSON.stringify(floor)}`);
  const word = await docxLines((await save('pl-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (word.messages.length || !word.lines.includes(`Total estimated cost | ${figure}`) || !word.lines.some((l) => l.endsWith('| Basic | 303.03 | sq ft | 111.65 | 33,833')))
    v(`the planning estimate's Word copy reads back ${JSON.stringify(word.lines.slice(0, 4))} ${JSON.stringify(word.messages).slice(0, 120)}`);
  // E4a: the bill of quantities, its floor tiles one line whose quantity is the detailed estimate's lines of that tile added up.
  const billPdf = await save('pl-bill-pdf');
  const billText = (await pdfPages(billPdf.bytes).catch((e) => [`(not read: ${e.message})`])).join('\n').replace(/\s+/g, ' ');
  if (billPdf.name !== 'Bill of quantities - Asha Rao.pdf' || !billText.includes('Make offered') || !billText.includes('say whether your rates include GST') || billText.includes('111.65') || billText.includes(figure))
    v(`the bill of quantities PDF, "${billPdf.name}", does not read back its columns and top line, or shows a rate or the total`);
  const billBook = await workbook((await save('pl-bill-xlsx')).bytes).catch((e) => v(`the bill's Excel copy is not read: ${e.message}`)) ?? [];
  const tiles = billBook[0]?.data.filter((r) => typeof r[1] === 'string' && r[1].startsWith('Double-charge vitrified tiles') && String(r[2]).startsWith('Living and dining')) ?? [];
  const added = Math.round((book[1]?.data ?? []).filter((r) => typeof r[0] === 'string' && r[0].includes(': Double-charge vitrified tiles')).reduce((t, r) => t + Math.round(r[2] * 100), 0)) / 100;
  if (billBook.map((x) => x.sheet).join('|') !== 'Bill of quantities' || tiles.length !== 1 || tiles[0][3] !== added || tiles[0][5] !== null)
    v(`the bill's Excel copy holds ${JSON.stringify(billBook.map((x) => x.sheet))}, its floor tiles ${JSON.stringify(tiles)} (want one line of ${added}, the rate blank)`);
  const billWord = await docxLines((await save('pl-bill-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (billWord.messages.length || !billWord.lines.some((l) => l.startsWith('No. | Item and specification | Where | Quantity | Unit | Rate | Amount | Make offered')))
    v(`the bill's Word copy reads back ${JSON.stringify(billWord.lines.slice(0, 4))} ${JSON.stringify(billWord.messages).slice(0, 120)}`);
  // D-BIZ-03: the brand notice, word for word, in each download that names a brand.
  const noticed = {
    'the planning estimate PDF': pdfText.join('\n').replace(/\s+/g, ' ').includes(NOTICE), "the planning estimate's Excel copy": book.some((x) => x.data.some((r) => r.includes(NOTICE))),
    "the planning estimate's Word copy": word.lines.includes(NOTICE), 'the bill PDF': billText.includes(SHORT) && !billText.includes(NOTICE),
    "the bill's Excel copy": billBook.some((x) => x.data.some((r) => r.includes(SHORT))) && !billBook.some((x) => x.data.some((r) => r.includes(NOTICE))), "the bill's Word copy": billWord.lines.includes(SHORT) && !billWord.lines.includes(NOTICE),
  };
  for (const [what, ok] of Object.entries(noticed)) if (!ok) v(`${what} does not hold the brand notice of docs/TRADEMARKS.md, rule 4, word for word`);
  // E4b: the bill taken into the typed path, a card for each of its lines, every one left out until a rate is typed. The
  // floor tiles' band at Basic in Pune, worked again in python from the library's files: the lowest low end is vinyl
  // sheet's ₹50.35 and the highest high end Kota stone's ₹164.78 a sq ft; ₹210 is (210 − 164.78) ÷ 164.78 = 27%
  // above it, past the 20% allowed. "Door" fits more than one family, so it is not matched until the main door is picked;
  // its band at Basic, laminated, ₹5,830.85–32,323.42 each.
  await page.locator('#typed-path > summary').click();
  await page.waitForSelector('#typed-path astro-island:not([ssr])', { state: 'attached' }); // client:visible (UXR7)
  await page.getByTestId('from-bill').click();
  const billLines = billBook[0]?.data.filter((r) => typeof r[0] === 'string' && /^\d+\.\d+$/.test(r[0])).length ?? 0;
  const checks = await page.locator('[data-testid^="item-"][data-testid$="-check"]').allTextContents();
  if (!billLines || checks.length !== billLines || checks.some((x) => x !== 'Left out of the quotation: no rate.'))
    v(`the bill taken in shows ${checks.length} lines (want ${billLines}), ${checks.filter((x) => x !== 'Left out of the quotation: no rate.').length} not left out`);
  const tileCard = await page.locator('[id$="-description"]').evaluateAll((els) => els.findIndex((e) => e.value.startsWith('Double-charge vitrified tiles, 600 × 600 mm (')) + 1);
  await leave(page, `#fld-item-${tileCard}-rate`, '210');
  await expectFigures(page, v, `item-${tileCard}-check`, '27% 50.35 164.78', 'the floor tiles\' rate against the band');
  await expectFigures(page, v, page.getByTestId('quote-flagged').locator('li'), '… 600 … 600 …', 'the rate to check, listed');
  await expectText(page, v, 'quote-gst', 'Each rate is taken as the price you pay. Where a quotation adds GST on top, add it to each rate before you type it.', 'the one line on GST');
  await expectFigures(page, v, 'quote-rule', '… 20% …', 'the 20% on the page');
  await leave(page, `#fld-item-${tileCard}-rate`, '150');
  await expectFigures(page, v, `item-${tileCard}-check`, '50.35 164.78', 'the floor tiles\' rate within the band');
  await page.getByTestId('add-item').click();
  const door = billLines + 1;
  await leave(page, `#fld-item-${door}-description`, 'Door');
  await expectText(page, v, `item-${door}-check`, 'Not matched to the library: pick what it is to compare its rate.', 'a line typed by hand that fits more than one family');
  await page.selectOption(`#fld-item-${door}-pick`, 'main-door');
  await page.selectOption(`#fld-item-${door}-unit`, 'nos');
  await leave(page, `#fld-item-${door}-rate`, '30,000');
  await expectFigures(page, v, `item-${door}-check`, '5,830.85 32,323.42', 'the door picked and compared');
  await expectFigures(page, v, 'pl-summary', '1,000 2', 'the six answers after the bill is taken in');
  await layout(page, v, 'the quotation against the library, 390 px');

  // An item of one's own makes the section Mixed; a brand chip names it; the slider moves the whole section again.
  await page.getByTestId('pl-choices-1').locator('label', { hasText: 'Kota stone' }).click();
  await expectFigures(page, v, 'pl-level-flooring', '1', 'an item of one\'s own');
  const slider = page.locator('#fld-slider-flooring');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expectText(page, v, 'pl-level-flooring', 'Luxury', 'the slider moved three stops');
  await expectText(page, v, page.getByTestId('pl-over-flooring'), /^₹[\d,]+ more than Basic$/, 'the change from the package');
  await expectText(page, v, 'pl-what-changed', /^Flooring to Luxury: ₹[\d,]+ more · /, 'what the slider changed, in the bar at the bottom');
  await page.getByTestId('pl-strip-3').click();
  await expectText(page, v, 'pl-level-flooring', 'Premium', 'the strip switches the package and every slider with it');
  if ((await page.getByTestId('pl-strip-3').getAttribute('aria-pressed')) !== 'true') v('the strip does not mark the package chosen on it');
  await expectText(page, v, 'pl-what-changed', /^Every section to Premium: ₹[\d,]+ more/, 'what the new package changed');
  // UX4 (review finding 3): a new package can be undone from the bar, and the level already chosen does nothing.
  await page.getByTestId('pl-strip-3').click();
  if (!(await page.getByTestId('pl-level-undo').isVisible())) v('tapping the level already chosen took away the Undo of the last package');
  await page.getByTestId('pl-level-undo').click();
  await expectText(page, v, 'pl-level-flooring', 'Luxury', 'Undo puts back the package and the slider as they were');
  if ((await page.getByTestId('pl-strip-1').getAttribute('aria-pressed')) !== 'true') v('Undo does not put back the package on the strip');
  if (await page.getByTestId('pl-level-undo').count()) v('Undo stays after the package is put back');
  await page.getByTestId('pl-strip-3').click();
  // Compare (A8): closed under the strip; each section on and the total at the five levels, the package's level marked.
  if (await page.getByTestId('pl-compare').evaluate((d) => d.open)) v('Compare is open on load');
  await page.getByTestId('pl-compare').locator('summary').click();
  const compared = await page.locator('[data-testid^="pl-compare-"] td').count(), marked = await page.locator('[data-testid="pl-compare-total"] td[aria-label$="your level"]').count();
  if (compared < 40 || marked !== 1 || !((await page.locator('[data-testid="pl-compare-total"] td').nth(2).getAttribute('aria-label')) ?? '').startsWith('Total, Premium: ₹'))
    v(`Compare shows ${compared} amounts with ${marked} total marked`);
  await layout(page, v, 'Compare open, 390 px');
  // The rooms (A8): closed until opened; a size of one's own in feet, and a bathroom at its own level (A4).
  if (await page.getByTestId('pl-rooms').evaluate((d) => d.open)) v('the rooms are open on load');
  await page.getByTestId('pl-rooms').locator(':scope > summary').click();
  // R1: the bar of shares and four size buttons on each room. A word moves the room's share along its range, the other
  // rooms share what is left, and What changed names the knock-on; the arrow keys move along the buttons.
  await expectFigures(page, v, 'pl-share-living', '… 28% …', 'the living room\'s share of the carpet area');
  await expectFigures(page, v, 'pl-share-walls', '… 5% …', 'the inside walls\' share');
  if (!(await page.isChecked('field=Living and dining, size > Medium'))) v('the living room is not Medium on load');
  await page.locator('label[for="fld-roomword-living-spacious"]').click();
  await expectFigures(page, v, 'pl-what-changed', '… 3.2% …', 'what the word changed, and its knock-on');
  await expectFigures(page, v, 'pl-room-size-living', '… 302 …', 'the living room made Spacious');
  await expectFigures(page, v, 'pl-share-living', '… 30% …', 'the bar after the word');
  await page.focus('field=Kitchen, size > Medium');
  await page.keyboard.press('ArrowRight');
  await expectText(page, v, 'pl-what-changed', /^Kitchen to Above medium: the other rooms [\d.]+% smaller · /, 'a word moved by the arrow keys');
  if (!(await page.isChecked('field=Kitchen, size > Above medium'))) v('the arrow key did not check Above medium');
  // A size typed and a level of its own sit behind one line under each room's buttons, closed until one is set.
  if (await page.getByTestId('pl-room-more-living').evaluate((d) => d.open)) v('a room\'s own size and level are open with nothing set');
  await page.getByTestId('pl-room-more-living').locator('summary').click();
  await leave(page, 'field=Living and dining, Length, ft', '16');
  await expectText(page, v, 'pl-room-bad-living', 'One side is missing. Type both sides. Until then the planned size is used.', 'one side of a room typed');
  await leave(page, 'field=Living and dining, Breadth, ft', '20');
  await expectFigures(page, v, 'pl-room-size-living', '20 16 320', 'the living room at its own size');
  await expectFigures(page, v, 'pl-what-changed', '… 16 … 20 …', 'what the size changed');
  if (await page.locator('[name="fld-roomword-living"]:checked').count()) v('a size typed leaves a size word checked');
  await expectText(page, v, 'pl-rooms-note', /^With your sizes the rooms and the passage come to [\d,]+ sq ft/, 'the rooms against the carpet area');
  await page.getByTestId('pl-room-more-bath-1').locator('summary').click();
  await page.selectOption('field=Bathroom 1 (attached), Level', '4');
  await expectFigures(page, v, 'pl-level-bathrooms', '1', 'a bathroom at its own level');
  await expectFigures(page, v, 'pl-what-changed', '… 1 …', 'what the room\'s level changed');
  await layout(page, v, 'the rooms open, 390 px');
  // A word on a room of one's own size puts the size aside: the planned size at that word, the others sharing what is left.
  await page.locator('label[for="fld-roomword-living-medium"]').click();
  await expectFigures(page, v, 'pl-what-changed', '… 3.3% …', 'a word in place of a typed size');
  await expectText(page, v, 'pl-room-size-living', /· 2\d\d sq ft$/, 'the living room planned again');
  // R2: rooms by buttons. A bathroom attached to the second bedroom, one added and taken out again (the other rooms
  // sharing what is left), the balcony taken out and put back, a bedroom added and taken out: back to the plan's 2 BHK.
  await page.locator('label[for="fld-attached-bedroom-2"]').click();
  await expectFigures(page, v, 'pl-what-changed', '… 2 … 2 …', 'a bathroom attached to a bedroom');
  await expectFigures(page, v, page.getByTestId('pl-room-bath-2').locator('h3'), '2 2', 'the bathroom named for its bedroom');
  await page.getByTestId('pl-room-add-bath').click();
  await expectText(page, v, 'pl-what-changed', /^A bathroom added: the other rooms [\d.]+% smaller · ₹[\d,]+ (more|less)/, 'a bathroom added, the others sharing what is left');
  await page.getByTestId('pl-room-out-bath-3').click();
  await expectFigures(page, v, 'pl-what-changed', '… 3 …', 'a bathroom taken out');
  await page.locator('label[for="fld-attached-bedroom-2"]').click();
  await expectFigures(page, v, 'pl-what-changed', '… 2 …', 'the bathroom made common again');
  await page.getByTestId('pl-room-out-balcony').click();
  await expectText(page, v, 'pl-what-changed', /^The balcony taken out: ₹[\d,]+ less/, 'the balcony taken out');
  await page.getByTestId('pl-room-add-balcony').click();
  await expectText(page, v, 'pl-what-changed', /^The balcony put back: ₹[\d,]+ more/, 'the balcony put back');
  await page.getByTestId('pl-room-add-bedroom').click();
  await expectFigures(page, v, 'pl-what-changed', '… 3 …', 'a bedroom added');
  await expectFigures(page, v, 'pl-summary', '… 3 …', 'the bedrooms answer follows the rooms');
  await page.getByTestId('pl-room-out-bedroom-3').click();
  await expectFigures(page, v, 'pl-what-changed', '… 3 … 2 …', 'a bedroom taken out');
  await layout(page, v, 'the rooms by buttons, 390 px');
  // One part on its own (D-UX-276): a chip under the four kinds, the same question; the kitchen's eight sections with
  // six on, its one room, its cost a sq ft of its own floor; painting's two sections; still six questions.
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('field=Kitchen');
  await ceiling(page, v, 7, 'the estimate with one part chosen', '#six-questions');
  if (await page.isChecked('field=Repair or renovate…')) v('with a part chosen, Repair or renovate stays chosen');
  await page.getByTestId('pl-sheet-done').click();
  await expectFigures(page, v, 'pl-summary', '… 1,000 … 2 …', 'the kitchen alone');
  await expectText(page, v, page.getByTestId('pl-per-sqft').locator('..'), /a sq ft of the kitchen’s floor$/, 'the kitchen\'s cost a sq ft');
  await expectText(page, v, page.getByTestId('pl-rooms').locator(':scope > summary'), 'The kitchen: size it, give it its own level', 'the kitchen\'s one room');
  await layout(page, v, 'the kitchen alone, 390 px');
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('field=Painting');
  await page.getByTestId('pl-sheet-done').click();
  await expectText(page, v, 'pl-summary', /^Just painting · /, 'painting alone');
  // Interiors: ten sections on, with Appliances, Smart home, Furniture and Soft furnishings, the movable items apart (D-UX-19).
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('field=Interiors…');
  await page.getByTestId('pl-sheet-done').click();
  const onI = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  const movable = await Promise.all(['appliances', 'smart', 'furniture', 'furnishings'].map((x) => page.isChecked(`#fld-on-${x}`)));
  if (onI !== 10 || movable.includes(false)) v(`interiors show ${onI} sections on, Appliances, Smart home, Furniture and Soft furnishings ${movable.join('/')}`);
  await expectText(page, v, 'pl-split', /^Fixed works ₹[\d,]+ · Movable items ₹[\d,]+ · Equipment ₹[\d,]+$/, 'the movable items apart');
  await layout(page, v, 'the estimate as interiors, 390 px');
  // A new house (A3, D-UX-23): the second question asks the floors and the area is the built-up area, still six
  // questions; eighteen sections with thirteen on (E5: Outside works and Water), the structure the same at every level;
  // the PDF titled for construction, with its stages.
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('field=Build a new house…');
  await ceiling(page, v, 7, 'the estimate for a new house', '#six-questions');
  if ((await page.locator('#fld-floors-2').count()) !== 1 || (await page.locator('#fld-home-flat').count())) v('a new house does not ask its floors in place of flat or house');
  await page.check('#fld-floors-2');
  await leave(page, '#fld-carpet', '2,000');
  await page.check('field=3 BHK');
  await page.getByTestId('pl-sheet-done').click();
  await expectFigures(page, v, 'pl-summary', '… 1 … 2,000 … 3 …', 'a new house, folded');
  if (!((await page.getByTestId('pl-card-structure').textContent()) ?? '').includes('The same at every level')) v('the structure is not the same at every level');
  if (!((await page.locator('#pl-result').textContent()) ?? '').includes('a sq ft of built-up area')) v('a new house\'s cost a sq ft is not of the built-up area');
  const pdfB = await pdfPages((await save('pl-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pdfB[0].includes('Estimate of cost of construction') || !pdfB[0].includes('Built-up area 2,000 sq ft')) v(`a new house's PDF reads "${pdfB[0].slice(0, 160)}"`);
  if (!pdfB.join(' ').includes('Stages of construction')) v('a new house\'s PDF has no stages');
  // E5: the stages for a construction loan, closed under the strip, adding up to the total; the plot changed in the
  // assumptions, and the sewer in place of the septic tank, each read in What changed.
  if (await page.getByTestId('pl-stages').evaluate((d) => d.open)) v('the stages are open on load');
  await page.getByTestId('pl-stages').locator('summary').click();
  const cells = async (id) => (await page.getByTestId(id).locator('th, td').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const slab2 = await cells('pl-stage-slab-2'), last = await cells('pl-stage-outside');
  if (!slab2[0].startsWith('First floor roof slab') || !/^[\d,]+$/.test(slab2[1]) || !/^\d+\.\d%$/.test(slab2[2]) || !/^\d+\.\d%$/.test(slab2[3])) v(`the second slab's stage reads ${slab2.join(' | ')}`);
  if (!last[0].startsWith('Outside works and water') || last[3] !== '100.0%') v(`the last stage reads ${last.join(' | ')} (want the outside works and water, 100.0% by then)`);
  await tap(page, 'pl-assumed');
  await page.getByTestId('pl-plot-change').click();
  await leave(page, 'field=Plot length, ft', '40');
  await leave(page, 'field=Plot width, ft', '30');
  await expectFigures(page, v, 'pl-what-changed', '… 40 … 30 …', 'what the plot changed');
  await expectFigures(page, v, page.locator('[data-testid^="pl-assumed-"]', { hasText: 'The plot:' }), '… 40 … 30 … 1,200 …', 'the plot of your own');
  await page.check('field=The city\'s sewer reaches my plot');
  // The septic tank's 84,680 out (tests/architect.test.ts); Pune's own sewer charge is still to be found, so it is said.
  await expectFigures(page, v, 'pl-what-changed', '… 84,680 …', 'what the sewer changed');
  await layout(page, v, 'the estimate as a new house, 390 px');
  // E5b: a floor added on the house: the second question asks the floors being added, still six questions; seventeen
  // sections with twelve on (no outside works); the PDF titled for an extension, its stages from the old terrace taken
  // up to the overhead tank; no plot and no sewer to change.
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('field=Add a floor or rooms…');
  await ceiling(page, v, 7, 'the estimate for an extension', '#six-questions');
  if ((await page.locator('#fld-floors-1').count()) !== 1 || (await page.locator('#fld-floors-3').count())) v('an extension does not offer one floor and no third');
  await page.check('#fld-floors-1');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('field=2 BHK');
  await page.getByTestId('pl-sheet-done').click();
  await expectFigures(page, v, 'pl-summary', '… 1,000 … 2 …', 'an extension, folded');
  const pdfX = await pdfPages((await save('pl-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pdfX[0].includes('Estimate of cost of an extension') || !pdfX.join(' ').includes('Stages of construction')) v(`an extension's PDF reads "${pdfX[0].slice(0, 160)}"`);
  const stagesX = await page.locator('[data-testid^="pl-stage-"]').count(), firstX = await cells('pl-stage-terrace'), lastX = await cells('pl-stage-water');
  if (stagesX !== 5 || !firstX[0]?.startsWith('Old terrace taken up') || !lastX[0]?.startsWith('Overhead tank') || lastX[3] !== '100.0%') v(`an extension shows ${stagesX} stages (want 5), the first ${firstX.join(' | ')}, the last ${lastX.join(' | ')}`);
  if (await page.locator('field=The city\'s sewer reaches my plot').count() || await page.getByTestId('pl-plot-change').count()) v('an extension offers the sewer or the plot');
  await layout(page, v, 'the estimate as an extension, 390 px');
  await ctx.close();
}

// V1 (D-UX-32), T1 (D-UX-34): with the answer only the flags that can change the decision show, and no field but the
// document's own facts; a line's and a section's Why? says whether its sources are as reported or verified.
if (touched('/estimate/')) {
  const cases = [
    ['a 2 BHK flat\'s interiors', async (page) => {
      await page.check('field=Interiors…'); await page.check('#fld-home-flat');
      await page.selectOption('field=Which city?', 'pune'); await leave(page, '#fld-carpet', '1,000');
      await page.check('field=2 BHK'); await page.click('field=Standard…');
    }, 1, { cards: ['wardrobes', 'walls'], line: 'pl-why-bedroom-1:wardrobe:wardrobe', section: ['pl-why-section-walls', 'Save here'] }],
    ['a new G+1 house at Luxury', async (page) => {
      await page.check('field=Build a new house…'); await page.check('#fld-floors-2');
      await page.selectOption('field=Which city?', 'pune'); await leave(page, '#fld-carpet', '2,000');
      await page.check('field=3 BHK'); await page.click('field=Luxury…');
    }, 0, { cards: ['structure'], line: 'pl-why-flat:steel:struct:steel', own: true, section: ['pl-why-section-structure', 'Spend here'] }],
  ];
  for (const [label, answer, flags, why] of cases) {
    const { ctx, page, v } = await open('/estimate/', { scheme: 'light' });
    await answer(page);
    await expectText(page, v, 'pl-total', /^₹[\d,]+\.\d+ (lakh|crore)$/, label);
    await expectText(page, v, 'pl-range', /^At (Standard|Luxury)( as a package)?: the cheapest choice in each item to the dearest; /, `${label}: the level's range`);
    const shown = await page.locator('[data-testid="pl-flags"] li').count();
    if (shown !== flags) v(`${label}: ${shown} flags with the answer (want ${flags})`);
    const fields = await page.locator('main').evaluate((m) => [...m.querySelectorAll('input, select, textarea')].filter((e) => e.checkVisibility() && !e.closest('#pl-download')).length);
    if (fields) v(`${label}: ${fields} fields shown with the answer besides the document's facts`);
    for (const c of why.cards) await tap(page, `pl-card-${c}`);
    const reported = `Sources: .+${why.own ? '; and our own rule' : ''}\\. (Needs review: as reported, not yet confirmed at its page|Verified at (its page|their pages))\\.$`;
    for (const id of [why.line, why.section[0]]) {
      await tap(page, id).catch(() => {});
      await expectText(page, v, id, new RegExp(reported), `${label}: T1's Why?`);
    }
    await layout(page, v, `${label}: T1's Why? open, 390 px`);
    await ctx.close();
  }
}

// The construction estimate typed from a quotation (P2), the second path, by hand: excavation 45 cum × 350 = 15,750 and
// RCC 28 cum × 9,500 = 2,66,000; works 2,81,750; GST at 18% 50,715; no contingency; total 3,32,465; per sq ft 3,32,465 ÷
// 1,200 = 277.05.
if (touched('/estimate/')) {
  const { ctx, page, v } = await open('/estimate/', { scheme: 'light' });
  await page.locator('#typed-path > summary').click();
  await page.waitForSelector('#typed-path astro-island:not([ssr])', { state: 'attached' }); // client:visible (UXR7)
  await page.check('field=New construction');
  await leave(page, '#fld-area', '1,200');
  await page.selectOption('#fld-item-1-head', 'earthwork');
  await expectValue(page, v, '#fld-item-1-unit', 'cum', "the head's usual unit");
  await leave(page, '#fld-item-1-description', 'Excavation for foundations');
  await leave(page, '#fld-item-1-quantity', '45');
  await leave(page, '#fld-item-1-rate', '350');
  await page.getByTestId('add-item').click();
  await page.selectOption('#fld-item-2-head', 'rcc');
  await leave(page, '#fld-item-2-description', 'RCC M20 in footings, columns, beams and slabs');
  await leave(page, '#fld-item-2-quantity', '28');
  await leave(page, '#fld-item-2-rate', '9,500');
  await leave(page, 'field=Where the rates come from', 'Contractor’s quotation of 25-09-2026');
  await page.check('field=Add GST to the rates');
  await leave(page, 'field=GST rate (%)', '18');
  await expectFigures(page, v, 'est-status', '1', 'the estimate before contingency');
  await page.check('field=None');
  await expectText(page, v, 'est-status', 'All questions answered', 'the estimate');
  for (const [id, want] of [['est-works', '2,81,750'], ['est-gst', '50,715'], ['est-total', '3,32,465'], ['est-per-sqft', '₹277'], ['item-2-amount', '₹2,66,000']])
    await expectText(page, v, id, want, 'the estimate');
  await layout(page, v, 'the estimate filled, 390 px');
  await expectFigures(page, v, 'est-doc-status', '2', 'the estimate before its facts');
  await page.getByTestId('est-doc-needs').getByRole('link', { name: "The borrower's name" }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-est-borrower', null, { timeout: 3000 }).catch(() => v('the estimate\'s "The borrower\'s name" does not land on its box'));
  await leave(page, 'field=Borrower’s name', 'Asha Traders');
  await leave(page, '#fld-est-property', 'Plot 12, Example Nagar, Pune');
  await expectText(page, v, 'est-doc-status', 'All questions answered', 'the estimate with its facts');
  const save = saver(page, v);
  const pdf = await save('est-download-pdf');
  if (pdf.name !== 'Estimate - Asha Traders.pdf') v(`the estimate PDF is named "${pdf.name}"`);
  const pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pages[0].split('\n').includes('Total estimated cost 3,32,465') || !pages[1]?.includes('Annex 1. Detailed estimate')) v('the estimate PDF does not read back its total and its annex');
  const book = await workbook((await save('est-download-xlsx')).bytes).catch((e) => v(`the estimate's Excel copy is not read: ${e.message}`)) ?? [];
  const total = book[0]?.data.find((r) => r[0] === 'Total estimated cost')?.filter((c) => c !== null);
  if (book.map((x) => x.sheet).join('|') !== 'Estimate|Detailed estimate' || JSON.stringify(total) !== JSON.stringify(['Total estimated cost', 332465]))
    v(`the estimate's Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))} and a total of ${JSON.stringify(total)}`);
  const { lines, messages } = await docxLines((await save('est-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (messages.length || !lines.includes('Total estimated cost | 3,32,465') || !lines.includes('2.1 RCC M20 in footings, columns, beams and slabs | 28 | cum | 9,500 | 2,66,000'))
    v(`the estimate's Word copy reads back ${JSON.stringify(lines.slice(0, 6))} ${JSON.stringify(messages).slice(0, 120)}`);
  await layout(page, v, 'the estimate download, 390 px');
  await ctx.close();
}

// The project report (P3), fictional case R worked by hand in tests/report.test.ts: a firm; building 10 L, plant 20 L,
// furniture 2 L, preliminary 1 L; a term loan of 25 L at 10% from April 2026, 60 monthly instalments of equal principal;
// sales 1.2 Cr growing 10%, variable costs 65%, fixed costs 18 L growing 5%; a cash credit of 5 L at 11%. The project
// costs 37,86,301; in 2026-27 the profit after tax is 11,54,407 and the balance sheet totals 55,81,804 on both sides.
// Its sales are typed in expert mode (R3, D-UX-49); the default path asks one line per product instead (D-UX-109).
// The default path's fields, a choice counted once (the mode sits under More options; expert mode asks every figure).
const REP_DEFAULT = 22;
// Check and confirm (OR8, D-UX-208): the report's tables and downloads wait for it; a change since asks again, so a flow
// confirms before it reads them (already confirmed, it goes on).
const confirmReport = async (page, v, why) => {
  const yes = page.getByTestId('rep-confirm');
  if (await yes.count()) await yes.click();
  else if (!(await page.getByTestId('rep-confirmed').count())) return v(`the report has no check to confirm (${why})`);
  await page.getByTestId('rep-confirmed').waitFor({ timeout: 5000 }).catch(() => v(`the report's check did not fold once confirmed (${why})`));
};
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  if (!(await page.isChecked('field=Simple…'))) v('the project report opens in expert mode');
  await ceiling(page, v, REP_DEFAULT, 'the project report');
  if (!(await page.locator('#more-options >> field=Simple…').count())) v('S12: the choice of how much to ask is not under More options');
  await page.check('field=Partnership firm or LLP');
  await openMore(page); await page.check('field=Expert…');
  await page.check('field=Sales I type, with their growth');
  for (const [id, value] of [['field=Building and civil works', '10 L'], ['field=Plant and machinery', '20 L'], ['field=Furniture and fixtures', '2 L'], ['field=Preliminary and pre-operative expenses', '1 L'],
    ['field=Term loan you will ask for', '25 L'], ['field=Interest rate (% a year)', '10'], ['field=Month the loan is first drawn', '2026-04'], ['#fld-tl-moratorium', '0'], ['field=Number of instalments', '60'], ['field=Months from the loan to the first sales (0 if at once)', '0'],
    ['field=Sales in a full first year', '1.2 Cr'], ['field=Sales: growth a year (%)', '10'], ['field=Materials and other variable costs (% of sales)', '65'], ['field=Fixed costs in a full first year', '18 L'], ['field=Fixed costs: growth a year (%)', '5'], ['field=Working-capital limit you will ask for', '5 L'], ['field=Its interest rate (% a year)', '11']])
    await leave(page, id, value);
  await expectFigures(page, v, 'rep-status', '1', 'the report before the repayment');
  await page.check('field=Equal principal every month');
  await expectFigures(page, v, 'rep-status', '3', 'the report, before its facts (UXR3, S4)');
  // The first page's questions stand among the others (the owner, 26-10-2026: three left that could not be seen): the
  // status names them, and "answer it" lands on the first, before the check as after it.
  await expectText(page, v, 'rep-doc-left', 'The business’s nameWhat the business doesThe business’s address', 'the questions left, named');
  await expectText(page, v, 'rep-status-go', 'answer it', 'the status link before the check');
  await page.getByTestId('rep-status-go').click();
  if (await page.evaluate(() => document.activeElement?.id) !== 'fld-rep-name') v('"answer it" does not land on the business\'s name (the owner, 26-10-2026)');
  await expectFigures(page, v, 'rep-key-0', '37,86,301', 'the cost of the project');
  // Before the check (OR8, the owner's O13): what was collected and the benchmarks, the owner's line; no table, no download.
  if (await page.getByTestId('rep-pl').count() || await page.getByTestId('rep-download-pdf').count()) v('the report shows its tables or downloads before its check (OR8)');
  await expectText(page, v, 'rep-doc-wait', 'A PDF, an Excel copy and a Word copy, once you have checked your figures. Go to Check', 'the download before the check');
  await expectFigures(page, v, 'rep-confirm-cost', '… 37,86,301 …', 'the check: the cost of the project');
  await expectFigures(page, v, 'rep-confirm-sales', '… 1,20,00,000 … 10% …', 'the check: the sales as typed');
  await expectText(page, v, 'rep-confirm-document', /Business’s nameNot given yet/, 'the check: the first page, not given yet');
  await expectFigures(page, v, 'rep-confirm-benchmarks', '… 1.50 …', 'the check: the benchmarks, a table');
  await confirmReport(page, v, 'case R');
  await expectText(page, v, 'rep-status-go', 'answer it', 'the status link after the check');
  const cells = async (table, label) => (await page.getByTestId(table).locator('tr', { has: page.locator('th', { hasText: label }) }).first().locator('td').allTextContents());
  for (const [table, label, want] of [['rep-pl', 'Profit after tax', '11,54,407'], ['rep-bs', 'Total liabilities', '55,81,804'], ['rep-bs', 'Total assets', '55,81,804'], ['rep-dscr', 'DSCR (A ÷ B)', '2.51']]) {
    if (table !== 'rep-dscr') await page.getByTestId(table).evaluate((t) => t.closest('details').open = true);
    const got = await cells(table, label);
    if (got[0] !== want) v(`the report's ${table} "${label}" shows ${JSON.stringify(got.slice(0, 2))}, want ${want} first`);
  }
  // The lender's levels and Make it viable (D-UX-50 to D-UX-52): case R meets every level that can be read, so the button
  // asks how far sales can fall (tests/viable.test.ts by hand); the security cover meets on the project's own assets, read once (UX5b).
  if (await page.getByTestId('rep-misses').count()) v('case R is said to miss a lender\'s level');
  await expectFigures(page, v, 'rep-check-dscrLowest', '… 2.51 … 2026-27 … meets … 1.25 …', 'the lowest DSCR against its level, on its key figure');
  if (await page.getByTestId('rep-checks').getByText('DSCR in the lowest year').count() > await page.locator('#benchmarks').getByText('DSCR in the lowest year').count()) v('the lowest DSCR is shown twice: on its key figure and as a bar (review finding 9)');
  // Every benchmark box holds its default (OR4, O10); a changed one is tinted, tagged, and says its default with a reset.
  await page.locator('#benchmarks').evaluate((d) => d.open = true);
  await expectValue(page, v, 'field=DSCR in the lowest year', '1.25', 'the lowest DSCR\'s benchmark box filled with its default');
  await leave(page, 'field=DSCR in the lowest year', '1.5');
  if (await page.locator('#fld-bm-dscrLowest[data-changed="own"]').count() !== 1) v('a changed benchmark box is not marked changed (OR4)');
  await expectFigures(page, v, 'fld-bm-dscrLowest-default', '1.25', 'a changed benchmark says its default');
  await page.getByTestId('fld-bm-dscrLowest-reset').click();
  await expectValue(page, v, 'field=DSCR in the lowest year', '1.25', 'Reset puts the default back');
  if (await page.locator('#fld-bm-dscrLowest[data-changed]').count() || await page.getByTestId('rep-benchmarks-reset').count()) v('a reset benchmark still reads as changed (OR4)');
  await page.locator('#benchmarks').evaluate((d) => d.open = false);
  await expectFigures(page, v, 'rep-check-securityCover', '… meets …', 'the security cover before the collateral, on the own assets');
  if (await page.getByTestId('rep-collateral-note').count()) v('the security cover met on the own assets still asks for the collateral (UX5b)');
  await page.getByTestId('rep-viable').click();
  // If the answer is missing, say what is there (the intermittent miss on CI, UX6: a reset after paint undid the tap).
  const there = async () => (await Promise.all(['rep-viable', 'rep-viable-box', 'rep-plan'].map(async (id) => `${id} ${await page.getByTestId(id).count()}`))).join(', ');
  await expectText(page, (m) => there().then((t) => v(`${m} (${t})`)), 'rep-text-sales', /^To ₹82,20,000 in 2026-27/, 'how far sales can fall');
  await expectFigures(page, v, 'rep-move-sales', '31.5%', 'how far sales can fall, its figure');
  // Make it work (OR11d, D-UX-249) on case R at 70 lakh (tests/work.test.ts by hand): sales of 82,11,000 keep the loan,
  // with a plant that sells 1,41,43,206 running full, asked inside the card; or 9,35,000 borrowed (fix.ts). "Use this"
  // writes the way, marked, its question left open and the report provisional; Undo puts the figures back. Below, the
  // sliders open on the figures as typed (D-UX-182 retired).
  await leave(page, 'field=Sales in a full first year', '70 L');
  await expectText(page, v, 'rep-cause-earns', /^Earns too little for this loan/, 'Make it work: the cause');
  await expectText(page, v, 'rep-work-one-h', 'Or change one thing', 'Make it work: the ways that pass alone (FIX1)');
  await expectFigures(page, v, 'rep-work-text-sales-0', '82,11,000 70,00,000', 'Make it work: more sales');
  await expectFigures(page, v, 'rep-work-chips-sales-0', 'meets 4', 'Make it work: the way meets every level missed');
  await expectFigures(page, v, 'rep-work-ask-sales-0', '1,41,43,206', 'the plant asked inside its card');
  await expectFigures(page, v, 'rep-work-text-fix-0', '9,35,000 25,00,000', 'Make it work: a smaller loan, by fix.ts');
  if (await page.getByTestId('rep-work-not').count() || await page.getByTestId('rep-work-change-not').count()) v('the ways that do not reach are still listed (FIX1, D-UX-352)');
  if (await page.locator('[data-testid^="rep-short-"]').count()) v('a key figure still says its shortfall in rupees (D-UX-237)');
  if (await page.getByTestId('rep-checks').getByText('Interest cover').count() > await page.locator('#benchmarks').getByText('Interest cover').count()) v('a ratio under a cause is listed again below it (D-UX-237)');
  await page.getByTestId('rep-work-use-sales-0').click();
  await expectFigures(page, v, 'rep-used', '… 70,00,000 … 82,11,000 …', 'the way used, its question left');
  // The figures changed since the check: it asks again; the tables stay, the downloads wait (OR8).
  await expectText(page, v, 'rep-confirm-lapsed', 'Your figures changed since you checked them: check them again.', 'the check after a way is used');
  if (!(await page.getByTestId('rep-pl').count()) || await page.getByTestId('rep-download-pdf').count()) v('after a change the tables went, or the downloads stayed (OR8)');
  await expectFigures(page, v, page.locator('#fld-sales-hint'), '… 70,00,000 …', 'a field the way changed, marked');
  if (await page.getByTestId('rep-misses').count()) v('the way used still misses a level');
  await expectText(page, v, 'rep-needs', /The plant: what it can sell in a year, running full \(₹\)/, 'the question left keeps the report provisional (D-UX-252 (1))');
  await leave(page, '#fld-pending', '1.5 Cr');
  if (await page.getByTestId('rep-pending').count()) v('the plant\'s question answered is still asked');
  await page.getByTestId('rep-undo').click();
  if ([await page.inputValue('field=Term loan you will ask for'), await page.inputValue('field=Sales in a full first year')].join() !== '25,00,000,70,00,000') v('Undo did not put the figures back');
  // What the business can carry (CAP1): the figure beside the loan asked first; a change that closes the gap, used and undone.
  await expectFigures(page, v, 'rep-carry-line', '… 25,00,000 …', 'CAP1: the figure beside the loan asked');
  await expectFigures(page, v, 'rep-answer-bar', '… 25,00,000 …', 'CAP1: the bar leads with what the business carries');
  const closer = page.locator('[data-testid^="rep-carry-use-"]').first();
  if (!(await closer.count())) v('CAP1: no change that closes the gap is offered');
  else {
    await closer.click();
    await expectText(page, v, 'rep-answer-bar', /^Carries the ₹[\d,]+ asked · /, 'CAP1: a closer used carries the loan');
    await page.getByTestId('rep-undo').click();
    await expectFigures(page, v, 'rep-answer-bar', '… 25,00,000 …', 'CAP1: the closer undone');
  }
  await expectFigures(page, v, 'rep-work-ask-sales-0', '1,41,43,206', 'the plant\'s sales, answered, read on the card');
  await page.getByTestId('rep-levers').click();
  if (await page.getByTestId('rep-plan-steps').count()) v('the sliders open with a step said before one is moved (OR11d, FIX1)');
  await expectFigures(page, v, 'rep-plan-line', '… misses … 4 …', 'the sliders\' verdict as typed');
  await page.focus('#rep-slider-sales');
  await page.keyboard.press('ArrowRight');
  // A step is a tenth of a per cent: 70,00,000 × 1.001 = 70,07,000.
  await expectFigures(page, v, 'rep-move-sales', '0.1%', 'the sales slider a step on');
  await expectFigures(page, v, 'rep-plan-steps', '70,07,000 70,00,000 0.1%', 'a slider moved');
  await expectFigures(page, v, 'rep-check-dscrLowest', '… misses …', 'the key figures above as typed');
  if (await page.inputValue('field=Sales in a full first year') !== '70,00,000') v('a slider changed a typed figure');
  await leave(page, 'field=The most the promoters can bring in all, if known', '12 L');
  await expectFigures(page, v, 'rep-plan-promoters', '… 12,00,000 …', 'the promoters within their most');
  await expectFigures(page, v, 'rep-move-sales', '0.1%', 'the slider kept when the promoters\' most is typed');
  await page.getByTestId('rep-plan-use').click();
  await expectFigures(page, v, 'rep-used', '… 70,00,000 … 70,07,000 …', 'the sliders used');
  await page.getByTestId('rep-undo').click();
  if (await page.inputValue('field=Sales in a full first year') !== '70,00,000') v('Undo did not put the sales back');
  await leave(page, 'field=Sales in a full first year', '1.2 Cr');
  // The collateral, in expert mode: 3 lakh with a 20 lakh limit misses the security cover (₹4,36,226 needed), which
  // its note says; Make it work sets it aside (engine/work.ts), and the sliders have the collateral.
  await leave(page, 'field=Working-capital limit you will ask for', '20 L');
  await leave(page, 'field=Collateral: its market value', '3 L');
  await expectFigures(page, v, 'rep-check-securityCover', '… misses … 1.17 … 2026-27 …', 'the security cover with the collateral');
  await expectFigures(page, v, 'rep-collateral-note', '… 4,36,226 …', 'the collateral that meets');
  if (await page.getByTestId('rep-work').count()) v('Make it work shown for the security cover alone, which the collateral meets');
  await page.getByTestId('rep-levers').click();
  if (!(await page.locator('#rep-slider-collateral').count())) v('the sliders have no collateral beside the security cover');
  await layout(page, v, 'make it viable, 390 px');
  await leave(page, 'field=Collateral: its market value', '');
  await leave(page, 'field=Working-capital limit you will ask for', '5 L');
  await confirmReport(page, v, 'case R, checked again');
  await layout(page, v, 'the report filled, 390 px');
  await expectFigures(page, v, 'rep-doc-status', '3', 'the report before its facts');
  await leave(page, 'field=Business’s name', 'Asha Packaging');
  await leave(page, 'field=What the business does', 'Manufacture of corrugated boxes');
  await leave(page, 'field=Business’s address', 'Plot 4, Example MIDC, Pune');
  await expectText(page, v, 'rep-doc-status', 'All questions answered', 'the report with its facts');
  const save = saver(page, v);
  if (await page.getByTestId('rep-print').count() !== 1) v('UXR5 (P10): the report has no Print beside its downloads');
  const pdf = await save('rep-download-pdf');
  if (pdf.name !== 'Project report - Asha Packaging.pdf') v(`the report PDF is named "${pdf.name}"`);
  const pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!/1\. The project at a glance[ .]*3/.test(pages[1] ?? '') || !pages.join('\n').includes('Total cost of the project 37,86,301') || !pages.join('\n').includes('Total assets 55,81,804')) v('the report PDF does not read back its contents, its cost and its balance sheet');
  const book = await workbook((await save('rep-download-xlsx')).bytes).catch((e) => v(`the report's Excel copy is not read: ${e.message}`)) ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'Cover|1 At a glance|2 Business|3 Cost and finance|4 Basis|5 Statements|6 DSCR and ratios|7 Repayment|Annex|Declaration') v(`the report's Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))}`);
  const { lines, messages } = await docxLines((await save('rep-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (messages.length || !lines.some((l) => l.startsWith('Total assets | 55,81,804'))) v(`the report's Word copy reads back ${JSON.stringify(lines.slice(0, 4))} ${JSON.stringify(messages).slice(0, 120)}`);
  // REP2 (D-AI-02): the words, one closed fold. Off, the boxes open to write in; then a reply written by hand for case R
  // (tests/fixtures/draft-r.json) stands in for the AI: two sentences dropped and said, and the words in the PDF and the
  // Word copy only once ticked.
  const reply = JSON.parse(await readFile(new URL('../tests/fixtures/draft-r.json', import.meta.url), 'utf8'));
  if (await page.getByTestId('rep-words').evaluate((d) => d.open)) v('the report’s words are open by default');
  // The Worker answers 503 then; a 200 with the same error keeps the console clean and takes the page's same path.
  await page.route('**/api/draft', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"error":"Drafting the words is not switched on yet: write them yourself."}' }));
  await page.locator('[data-testid="rep-words"] > summary').click();
  await page.getByTestId('rep-words-draft').click();
  await expectText(page, v, 'rep-words-error', 'Drafting the words is not switched on yet: write them yourself.', 'the words while drafting is off');
  await expectText(page, v, 'rep-words-by', 'Your own words: a box left empty stays out.', 'the boxes to write in');
  let asked;
  await page.unroute('**/api/draft');
  // WORDS1: the notes left empty, the AI drafts the process, the market and the promoter from the other answers, with
  // blanks for what only the borrower knows (tests/fixtures/draft-r-blank.json); each blank is a box in its sentence, and
  // the tick waits until all four are filled.
  const blankReply = JSON.parse(await readFile(new URL('../tests/fixtures/draft-r-blank.json', import.meta.url), 'utf8'));
  await page.route('**/api/draft', (r) => { asked = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ draft: blankReply.draft }) }); });
  await page.getByTestId('rep-words-draft').click();
  await expectFigures(page, v, 'rep-words-dropped', '… 3 …', 'WORDS1: three sentences dropped from a draft with the notes empty');
  if (asked?.stage !== 'new' || Object.values(asked?.notes ?? { x: 1 }).some(Boolean)) v(`WORDS1: the words were drafted from ${JSON.stringify(asked).slice(0, 160)}`);
  if (await page.getByTestId('rep-words-blank').count() !== 4) v(`WORDS1: ${await page.getByTestId('rep-words-blank').count()} blanks to fill in, not 4`);
  if (await page.getByText('Drafted from your other answers, as you left its note empty.').count() !== 3) v('WORDS1: the three sections drafted from the other answers do not say so');
  await expectText(page, v, 'rep-words-open', 'Fill in the 4 blanks above first.', 'WORDS1: the blanks to fill before the tick');
  if (!(await page.getByTestId('rep-words-true').isDisabled())) v('WORDS1: the words can be ticked with blanks open');
  await layout(page, v, 'the report’s words with blanks, 390 px');
  for (const t of ['mills in Gujarat', 'visits to packers in Chakan', 'Asha Rao and Ravi Rao', 'eight years in a packaging firm’s stores']) {
    const box = page.getByTestId('rep-words-blank').first();
    await box.fill(t);
    await box.press('Enter');
  }
  if (await page.getByTestId('rep-words-blank').count()) v('WORDS1: blanks left open after all four were filled');
  if (!(await page.locator('#fld-rep-words-promoter').inputValue()).includes('run by Asha Rao and Ravi Rao. They bring eight years in a packaging firm’s stores to the firm.')) v('WORDS1: the filled blanks are not in the promoter’s words');
  if (await page.getByTestId('rep-words-true').isDisabled()) v('WORDS1: the tick stays locked with every blank filled');
  await page.unroute('**/api/draft');
  for (const [id, t] of Object.entries(reply.notes)) await leave(page, `#fld-rep-note-${id}`, t);
  await page.route('**/api/draft', (r) => { asked = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ draft: reply.draft }) }); });
  await page.getByTestId('rep-words-draft').click();
  await expectFigures(page, v, 'rep-words-dropped', '… 2 …', 'the words: two sentences dropped');
  if (asked?.name !== 'Asha Packaging' || asked?.notes?.market !== reply.notes.market || /lakh|₹|\d,\d/.test(JSON.stringify(asked))) v(`the words were drafted from ${JSON.stringify(asked).slice(0, 160)}`);
  await expectFigures(page, v, 'rep-doc-status', '1', 'the words drafted, not yet ticked');
  await page.check('field=I have read these words and they are true');
  await expectText(page, v, 'rep-doc-status', 'All questions answered', 'the words ticked');
  await layout(page, v, 'the report’s words, 390 px');
  const worded = (await pdfPages((await save('rep-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`])).join('\n').replace(/\s+/g, ' ');
  if (!worded.includes('2. Promoters and the business') || !worded.includes('It is in talks with 3 buyers.') || /reputed|lakh/.test(worded)) v(`the report PDF holds its words as ${worded.slice(worded.indexOf('2. Promoters'), 200)}`);
  const wordedDocx = await docxLines((await save('rep-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (wordedDocx.messages.length || !wordedDocx.lines.some((l) => /^2\.\d The promoter$/.test(l))) v(`the report's Word copy lacks its words ${JSON.stringify(wordedDocx.messages).slice(0, 120)}`);
  // BUILD1 (D-UX-340): the paper beside the questions is the document's own blocks, never a second copy. All answered and
  // worded, at 1280 px it stands in its pane with the engine's figures and the words; on a phone one tap opens it over the
  // questions and one closes it.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByTestId('rep-paper').waitFor({ timeout: 5000 }).catch(() => v('BUILD1: no paper beside the questions at 1280 px'));
  await expectFigures(page, v, 'rep-paper', '… 37,86,301 …', 'BUILD1, the paper\'s cost of the project');
  await expectFigures(page, v, 'rep-paper', '… 3 …', 'BUILD1, the paper\'s words');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('rep-peek').waitFor({ timeout: 5000 }).catch(() => v('BUILD1: no "See the paper" on a phone'));
  if (await page.locator('dialog[open]').count()) v('BUILD1: the paper covers the questions on a phone before it is asked for');
  await page.getByTestId('rep-peek').click();
  await page.locator('dialog[open] [data-testid="rep-paper"]').waitFor({ timeout: 5000 }).catch(() => v('BUILD1: "See the paper" does not open the paper on a phone'));
  await page.getByTestId('rep-peek-close').click();
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 }).catch(() => v('BUILD1: the paper does not close back to the questions'));
  await ctx.close();
}

// Case P by products (tests/report.test.ts), on the default path with PMEGP: land 2 L, building 6 L, plant 20 L,
// preliminary 50,000; 24 L sanctioned at 10% from October 2026, six months' moratorium, 48 monthly instalments; two
// lines, roasted chana 2,500 a month and roasted peanuts 1,500 a month, both at ₹200; sales three months after the
// loan; general category, a village, manufacturing. The margin money is 25% of PMEGP's cost of 31,23,424.66,
// ₹7,80,856; cash at the end of 2026-27 is 83,271 (tests/report.test.ts by hand, the part first year by D-UX-350).
// With fixed costs of 25 L, the engine's cash (checked by report-check.ts's own route) goes lowest in 2030-31,
// 48,67,334 short (tests/report-page.test.ts).
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'dark' });
  await openMore(page); await page.check('field=Expert…');
  await page.check('field=Partnership firm or LLP');
  await page.check('field=PMEGP');
  for (const id of ['field=General', 'field=A village', 'field=Manufacturing', 'field=Equal principal every month', 'field=Each of these holds for my project']) await page.check(id);
  await page.getByTestId('rep-product-add').click();
  // Sold by (OR6, D-UX-203): the second line by the kg; its count and price take the unit's words, its sums the piece's.
  await page.selectOption('field=Product or service 2 > Sold by', 'kg');
  for (const [id, want] of [['fld-product-1-units', 'How many kg a month at full running'], ['fld-product-1-price', 'Price a kg'], ['fld-product-0-price', 'Price a piece']]) {
    const said = (await page.locator(`label[for="${id}"]`).textContent())?.trim();
    if (!said?.startsWith(want)) v(`the PMEGP report's ${id} reads "${said}", want "${want}" (OR6)`);
  }
  if (await page.locator('field=Capital subsidy, if any').count()) v('the project report asks a capital subsidy beside PMEGP');
  for (const [id, value] of [['field=Land', '2 L'], ['field=Building and civil works', '6 L'], ['field=Plant and machinery', '20 L'], ['field=Preliminary and pre-operative expenses', '50,000'],
    ['field=Term loan you will ask for', '24 L'], ['field=Interest rate (% a year)', '10'], ['field=Month the loan is first drawn', '2026-10'], ['#fld-tl-moratorium', '6'], ['field=Number of instalments', '48'],
    ['#fld-product-0-name', 'Roasted chana'], ['#fld-product-0-units', '2,500'], ['#fld-product-0-price', '200'],
    ['field=Product or service 2 > What it is', 'Roasted peanuts'], ['#fld-product-1-units', '1,500'], ['#fld-product-1-price', '200'], ['field=Months from the loan to the first sales (0 if at once)', '3'], ['field=Materials and other variable costs (% of sales)', '70'], ['field=Fixed costs in a full first year', '12 L'], ['field=Fixed costs: growth a year (%)', '5'],
    ['field=Working-capital limit you will ask for', '3 L'], ['field=Its interest rate (% a year)', '11']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-status', /^\d+ questions? left, for the document$/, 'the PMEGP report');
  const tiles = await page.locator('#report dl > div').allTextContents();
  if (!tiles.some((t) => t.startsWith('PMEGP margin money') && t.includes('₹7,80,856'))) v(`the PMEGP report's tiles read ${JSON.stringify(tiles).slice(0, 200)}`);
  await confirmReport(page, v, 'the PMEGP report');
  await page.getByTestId('rep-cf').evaluate((t) => t.closest('details').open = true);
  const cash = await page.getByTestId('rep-cf').locator('tr', { has: page.locator('th', { hasText: 'Cash at the end of the year' }) }).first().locator('td').allTextContents();
  if (cash[0] !== '83,271') v(`the PMEGP report's cash at the end of 2026-27 shows ${cash[0]}, want 83,271`);
  await page.getByTestId('rep-sales').evaluate((t) => t.closest('details').open = true);
  const total = await page.getByTestId('rep-sales').locator('tr', { has: page.locator('th', { hasText: 'Total sales' }) }).first().locator('td').allTextContents();
  if (total[0] !== '14,40,000') v(`the PMEGP report's sales by product total ${total[0]} in 2026-27, want 14,40,000`);
  for (const want of ['Pieces sold', 'Kg sold', 'Price a kg'])
    if (!(await page.getByTestId('rep-sales').locator('th', { hasText: want }).count())) v(`the PMEGP report's sales by product has no "${want}" row (OR6)`);
  await leave(page, 'field=Fixed costs in a full first year', '25 L');
  // Cash running out names its first year, the amount at its lowest (OR11a2, D-UX-247); a result, said by the verdict,
  // never a question left (OR11a); the document stays provisional.
  await expectFigures(page, v, 'rep-short', '… 2026-27 … 48,67,334 … short … 2030-31 …', 'cash running out');
  await expectFigures(page, v, 'rep-misses-work', '… short … 2026-27 …', 'OR11a2: the first year cash runs out in the verdict');
  await expectFigures(page, v, 'rep-status', '3', 'the report with cash running out');
  await expectFigures(page, v, 'rep-misses', '… misses …', 'the DSCR below the level');
  // Make it work (OR11d, D-UX-251): more use cannot carry it; a higher price or a larger plant at 85% use can, the plant's
  // cost asked inside its card; no change of the loan alone. The larger plant's cost of 40 L, less the building's 6 L,
  // is machinery of 34 L.
  await expectFigures(page, v, 'rep-work-use-cannot', '… 85% … short …', 'more use out of reach, never a use above 100% (FIX1)');
  await expectFigures(page, v, 'rep-work-text-price-0', '… 200 … 200 … 85% …', 'the price, in each line\'s unit');
  await expectFigures(page, v, 'rep-work-chips-price-0', 'meets 6', 'the price meets every level missed');
  await expectText(page, v, page.locator('label[for="fld-plantCost-capacity-1"]'), 'What would the larger plant cost? (₹)', 'the plant\'s cost asked inside its card');
  if (await page.locator('[data-testid^="rep-short-"]').count()) v('a key figure still says its shortfall in rupees (D-UX-237)');
  await page.getByTestId('rep-work-use-capacity-1').click();
  await expectText(page, v, 'rep-needs', /The larger plant: its cost of machinery and building \(₹\)/, 'the plant\'s cost left open keeps it provisional');
  await leave(page, '#fld-pending', '40 L');
  if (await page.inputValue('field=Plant and machinery') !== '34,00,000') v(`the larger plant's cost wrote machinery of ${await page.inputValue('field=Plant and machinery')}, want 34,00,000`);
  await expectFigures(page, v, 'rep-used', '… 34,00,000 …', 'the plant\'s cost under the same undo');
  await page.getByTestId('rep-undo').click();
  if (!['20 L', '20,00,000'].includes(await page.inputValue('field=Plant and machinery'))) v('Undo did not put the machinery back');
  await confirmReport(page, v, 'the PMEGP report with cash running out');
  await expectFigures(page, v, 'rep-doc-why', '2026-27', 'OR11a2: why the file is provisional');
  await page.getByTestId('rep-levers').click();
  if (!(await page.getByTestId('rep-lever-promoters').count())) v('the sliders: none for a smaller loan');
  await expectFigures(page, v, 'rep-plan-limits', '… 85% …', 'the sliders\' limits by the drivers');
  await layout(page, v, 'the PMEGP report, 390 px, dark');
  await ctx.close();
}

// Case F (OR2b, tests/fix.test.ts by hand): a building of 50 L and plant of 2.5 Cr, a 2.5 Cr loan at 9.3% over 15 years
// after a month's holiday, misses only the fixed-asset cover. Make it work keeps no loan as asked, and changes it by
// fix.ts: 1,11,40,000 over the 15 years, or 1,72,20,000 over 11 (D-UX-350); the sliders as typed shorten to 17 instalments.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/');
  await openMore(page); await page.check('field=Expert…');
  for (const id of ['field=Proprietor', 'field=EMI every month']) await page.check(id);
  for (const [id, value] of [['field=Building and civil works', '50 L'], ['field=Plant and machinery', '2.5 Cr'], ['field=Term loan you will ask for', '2.5 Cr'], ['field=Interest rate (% a year)', '9.3'],
    ['field=Month the loan is first drawn', '2026-10'], ['#fld-tl-moratorium', '1'], ['field=Number of instalments', '180'], ['#fld-product-0-name', 'Widgets'], ['#fld-product-0-units', '10,000'],
    ['#fld-product-0-price', '1,500'], ['field=Months from the loan to the first sales (0 if at once)', '1'], ['field=Materials and other variable costs (% of sales)', '60'], ['field=Fixed costs in a full first year', '1.2 Cr'], ['field=Fixed costs: growth a year (%)', '5'], ['field=Working-capital limit you will ask for', '53 L'], ['field=Its interest rate (% a year)', '9.3']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-cause-assets', /^The assets wear out faster than the loan is repaid/, 'case F\'s cause');
  await expectFigures(page, v, 'rep-work-text-fix-0', '1,11,40,000 2,50,00,000', 'case F: the smaller loan over 15 years');
  await expectFigures(page, v, 'rep-work-text-fix-1', '1,72,20,000 2,50,00,000 11 15', 'case F: the smaller loan over 11 years');
  await page.getByTestId('rep-work-use-fix-1').click();
  await expectFigures(page, v, 'rep-used', '… 1,72,20,000 … 180 … 132 …', 'case F\'s change used');
  if (await page.getByTestId('rep-misses').count()) v('case F still misses after Use this');
  await page.getByTestId('rep-undo').click();
  await page.getByTestId('rep-levers').click();
  if (await page.locator('#rep-slider-instalments').getAttribute('min') !== '-163') v('the repayment slider does not shorten to 17 instalments, where the term loan as typed reaches its bound (tests/fix.test.ts)');
  await leave(page, 'field=The most the promoters can bring in all, if known', '2 Cr');
  await expectFigures(page, v, 'rep-plan-promoters', '… 2,00,00,000 …', 'the promoters within their most');
  await ctx.close();
}

// Fix it for me (FIX1, D-UX-346, D-UX-351) on fictional Sample Metals (tests/fixtures/solve-part-year.json; the plans
// by hand in tests/solve.test.ts, the page's words in tests/report-page.test.ts): a new unit whose first year holds
// three months of sales misses five of eight checks and cash runs out. One tap gives the plans that pass: Earn more
// (the use at 85% in every year, the price at ₹251.25) and Balanced (a loan of ₹54,66,000, a limit of
// ₹18,00,000, the use from 80.5%); Borrow less alone leaves interest cover short, so it is not offered. Use this
// plan writes it, every check then passes, and Undo gives the answers back.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/');
  await openMore(page); await page.check('field=Expert…');
  for (const id of ['field=Partnership firm or LLP', 'field=Equal principal every month']) await page.check(id);
  for (const [id, value] of [['field=Building and civil works', '30 L'], ['field=Plant and machinery', '60 L'], ['field=Furniture and fixtures', '5 L'], ['field=Preliminary and pre-operative expenses', '2 L'],
    ['field=Term loan you will ask for', '75 L'], ['field=Interest rate (% a year)', '11'], ['field=Month the loan is first drawn', '2026-06'], ['#fld-tl-moratorium', '6'], ['field=Number of instalments', '72'],
    ['#fld-product-0-name', 'Castings'], ['#fld-product-0-units', '10,000'], ['#fld-product-0-price', '250'], ['field=Months from the loan to the first sales (0 if at once)', '7'], ['field=Use of the capacity by year (%)', '50, 65, 80'],
    ['field=The price: growth a year (%)', '0'], ['field=Materials and other variable costs (% of sales)', '68'], ['field=Fixed costs in a full first year', '36 L'], ['field=Fixed costs: growth a year (%)', '5'], ['field=Days of debtors', '45'], ['field=Working-capital limit you will ask for', '20 L'], ['field=Its interest rate (% a year)', '11.5']])
    await leave(page, id, value);
  await expectFigures(page, v, 'rep-misses', '… misses … 5 … 8 …', 'FIX1: the case as typed');
  await expectFigures(page, v, 'rep-short', '… 2026-27 …', 'FIX1: cash runs out as typed');
  await page.getByTestId('rep-fix').click();
  await expectFigures(page, v, 'rep-fix-moves-earnMore', '… 50% … 65% … 80% … 85% … 85% … 85% … 250 … 251.25 …', 'FIX1: Earn more');
  await expectFigures(page, v, 'rep-fix-moves-balanced', '… 75,00,000 … 54,66,000 … 20,00,000 … 18,00,000 … 50% … 65% … 80% … 80.5% … 85% … 85% …', 'FIX1: Balanced');
  await expectFigures(page, v, 'rep-fix-passes-balanced', '8', 'FIX1: a plan passes every check');
  await expectText(page, v, 'rep-fix-brings-balanced', /^You bring ₹[\d,]+ more\.$/, 'FIX1: what the promoters bring');
  if (await page.getByTestId('rep-fix-plan-borrowLess').count()) v('FIX1: a plan that leaves a check short is offered');
  await layout(page, v, 'Fix it for me, the plans');
  await page.getByTestId('rep-fix-use-balanced').click();
  await expectFigures(page, v, 'rep-used-counts', '3 8 8 8', 'FIX1: the checks before and now');
  await expectFigures(page, v, 'rep-used', '… 54,66,000 …', 'FIX1: the plan written under the undo');
  await expectText(page, v, 'rep-verdict', /./, 'FIX1: the verdict once the plan is used');
  if (await page.getByTestId('rep-misses').count() || await page.getByTestId('rep-short').count() || await page.getByTestId('rep-work').count()) v('FIX1: the plan used still misses a check, runs out of cash or shows Make it work');
  if (await page.inputValue('field=Term loan you will ask for') !== '54,66,000') v(`FIX1: the plan wrote a term loan of ${await page.inputValue('field=Term loan you will ask for')}, want 54,66,000`);
  await page.getByTestId('rep-undo').click();
  if (!['75 L', '75,00,000'].includes(await page.inputValue('field=Term loan you will ask for')) || await page.inputValue('field=Use of the capacity by year (%)') !== '50, 65, 80') v('FIX1: Undo did not put the answers back');
  await expectFigures(page, v, 'rep-misses', '… misses … 5 … 8 …', 'FIX1: the case back as typed after Undo');
  // No plan within the limits: one card, the nearest, with what stays short and a button to its box.
  await leave(page, 'field=Materials and other variable costs (% of sales)', '97');
  await page.getByTestId('rep-fix').click();
  await expectFigures(page, v, 'rep-fix-nearest', '… short …', 'FIX1: the nearest when no plan passes');
  await page.getByTestId('rep-fix-nearest').locator('a').first().click();
  if (!(await page.evaluate(() => /^fld-/.test(document.activeElement?.id ?? '')))) v('FIX1: the nearest plan\'s button does not reach its box');
  await ctx.close();
}

// Mudra (SCH1), case M of tests/report-page.test.ts on the default path: a 12 L term loan from April 2026 and a 3 L
// limit, 15 L in all, so Tarun Plus, only once a Tarun loan is ticked as repaid. CGFMU's fee in 2026-27 by hand: 1% of
// 12,00,000 and of 3,00,000 for 12 months, 15,000. Above 20 L in all it stops. With no scheme and CGTMSE ticked, its slab
// for 15 L is 0.55%: 6,600 on the term loan and 1,650 on the limit, 8,250.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  await openMore(page);
  for (const id of ['field=Expert…', 'field=Partnership firm or LLP', 'field=Mudra', 'field=Equal principal every month']) await page.check(id);
  for (const [id, value] of [['field=Building and civil works', '10 L'], ['field=Plant and machinery', '20 L'], ['field=Furniture and fixtures', '2 L'], ['field=Preliminary and pre-operative expenses', '1 L'],
    ['field=Term loan you will ask for', '12 L'], ['field=Interest rate (% a year)', '10'], ['field=Month the loan is first drawn', '2026-04'], ['#fld-tl-moratorium', '0'], ['field=Number of instalments', '60'],
    ['#fld-product-0-name', 'Boxes'], ['#fld-product-0-units', '10,000'], ['#fld-product-0-price', '100'], ['field=Months from the loan to the first sales (0 if at once)', '0'], ['field=Materials and other variable costs (% of sales)', '65'],
    ['field=Fixed costs in a full first year', '18 L'], ['field=Fixed costs: growth a year (%)', '5'], ['field=Working-capital limit you will ask for', '3 L'], ['field=Its interest rate (% a year)', '11']])
    await leave(page, id, value);
  await expectFigures(page, v, 'rep-mudra-level', '15,00,000', 'Mudra\'s level');
  await expectFigures(page, v, 'rep-mudra-collateral', '… 20,00,000 …', 'Mudra without collateral');
  await expectFigures(page, v, 'rep-needs', '… 15,00,000 …', 'Tarun Plus unticked');
  await page.check('field=The borrower has taken and repaid a Tarun loan…');
  await expectText(page, v, 'rep-status', /^\d+ questions? left, for the document$/, 'the Mudra report');
  await confirmReport(page, v, 'the Mudra report');
  await page.getByTestId('rep-pl').evaluate((t) => t.closest('details').open = true);
  const fee = (name) => page.getByTestId('rep-pl').locator('tr', { has: page.locator('th', { hasText: `Less: guarantee fee (${name})` }) }).first().locator('td').first();
  await expectFigures(page, v, fee('CGFMU'), '15,000', 'CGFMU\'s fee in 2026-27');
  if (await page.locator('#fld-collateral, #fld-cgtmse').count()) v('the Mudra report asks collateral or CGTMSE');
  if (!(await page.locator('field=The guarantee fee, if the lender quotes another rate (% a year)').count())) v('the Mudra report has no box for the lender\'s own fee rate');
  await leave(page, 'field=Term loan you will ask for', '18 L');
  await expectFigures(page, v, 'rep-needs', '… 21,00,000 … 1,00,000 …', 'Mudra above 20 L');
  await leave(page, 'field=Term loan you will ask for', '12 L');
  await page.check('#fld-scheme-');
  await page.check('field=CGTMSE guarantees the loans…');
  await expectFigures(page, v, fee('CGTMSE'), '8,250', 'CGTMSE\'s fee in 2026-27');
  await layout(page, v, 'the Mudra report, 390 px, light');
  await ctx.close();
}

// Simple mode (REP3, D-UX-112), case S of tests/report-page.test.ts: case P's two products, building 6 L, plant 20 L, a
// 20 L loan at 10% over 4 years, selling from three months after this month, variable costs 70%, fixed costs 1 L a month,
// the limit worked out and nothing behind the loan. The limit by hand: a first year's run of 96 L at 60% is 57,60,000,
// its materials at 70% 40,32,000; 75% of 30 days' debtors and stock, less 30 days' creditors:
// (0.75 x 30 x 57,60,000 + (0.75 x 30 - 30) x 40,32,000) / 365 = 2,72,219, below the turnover method's 11,52,000.
// The questions are in its own words; switching to expert mode writes what it assumed, and back, nothing is listed as changed.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  const now = new Date(FIXED_AT), sell = new Date(now.getFullYear(), now.getMonth() + 3, 1), month = `${sell.getFullYear()}-${String(sell.getMonth() + 1).padStart(2, '0')}`;
  for (const id of ['field=Partnership firm or LLP', 'field=Neither', 'field=Work it out for me']) await page.check(id);
  await page.getByTestId('rep-product-add').click();
  for (const [id, value] of [['field=Building and civil works', '6 L'], ['field=Plant and machinery', '20 L'], ['field=Term loan you will ask for', '20 L'], ['field=Interest rate (% a year)', '10'], ['field=Repayment period after it (years)', '4'],
    ['#fld-product-0-name', 'Roasted chana'], ['#fld-product-0-units', '2,500'], ['#fld-product-0-price', '200'],
    ['field=Product or service 2 > What it is', 'Roasted peanuts'], ['#fld-product-1-units', '1,500'], ['#fld-product-1-price', '200'], ['field=When will you start selling?', month], ['field=Materials and other variable costs (% of sales)', '70'], ['field=Fixed costs a month', '1 L']])
    await leave(page, id, value);
  await expectFigures(page, v, 'rep-worked', '… 2,72,219 … 2,72,219 … 11,52,000 …', 'the limit worked out');
  if (await page.getByTestId('rep-needs').count()) v(`simple mode still asks: ${await page.getByTestId('rep-needs').textContent()}`);
  if (await page.locator('#fld-tl-disbursed, #fld-wcRate, #fld-fixedGrowth').count()) v('simple mode shows an expert field');
  // Property for part, CGTMSE for the rest (OR7): its value asked, then the part guaranteed read back: the loans in all,
  // 20 L and the limit's 2,72,219, less the property's 5 L.
  await page.check('field=Property for part, CGTMSE for the rest…');
  await expectText(page, v, 'rep-needs', /The collateral: its market value, for the part CGTMSE does not guarantee/, 'hybrid security, the property\'s value not yet typed');
  await leave(page, 'field=Collateral: its market value', '5 L');
  await expectFigures(page, v, 'rep-hybrid', '17,72,219 22,72,219 5,00,000', 'hybrid security');
  await page.check('field=Neither');
  // The holiday runs to the first sales until typed, and the period reads back in all (D-UX-174).
  if (await page.inputValue('#fld-tl-moratorium') !== '3') v(`the holiday's box reads ${await page.inputValue('#fld-tl-moratorium')}, want its default 3`);
  await expectFigures(page, v, 'rep-period', '4 3 3 4 180', 'the loan period');
  // The ways to repay compared (OR5): the cheapest first, EMI in use; the stepped way taken stays through the switch.
  const ways = await page.locator('[data-testid^="rep-way-"]:not([data-testid^="rep-way-use-"])').evaluateAll((es) => es.map((e) => e.dataset.testid));
  if (ways.join() !== 'rep-way-monthly,rep-way-emi,rep-way-stepped') v(`the ways to repay read ${ways.join()}`);
  if (!/In use/.test(await page.getByTestId('rep-way-emi').textContent())) v('EMI is not the way in use in simple mode');
  await layout(page, v, 'the report in simple mode, 390 px');
  await page.getByTestId('rep-way-use-stepped').click();
  if (!/In use/.test(await page.getByTestId('rep-way-stepped').textContent())) v('"Use this" did not take the stepped way');
  await openMore(page); await page.check('field=Expert…');
  if (!(await page.isChecked('field=Stepped: less at first, rising each year'))) v('expert mode after simple does not show the stepped way taken');
  const got = await Promise.all(['#fld-tl-moratorium', 'field=Number of instalments', 'field=Months from the loan to the first sales (0 if at once)', 'field=Fixed costs in a full first year'].map((id) => page.inputValue(id)));
  if (got.join('|') !== '3|48|3|12,00,000') v(`expert mode after simple reads ${got.join('|')}, want 3|48|3|12,00,000`);
  await openMore(page); await page.check('field=Simple…');
  if (await page.getByTestId('rep-changed').count()) v('back in simple mode, values are listed as changed that were not');
  await ctx.close();
}

// Home (HOME1b, D-UX-114): each tool once, in one block with one button, which opens the tool filled with its scene's
// fictional case; each tool says so above its answers and reads as the scene does (site/src/home/story.ts, its figures
// worked by hand in tests/home-story.test.ts).
if (touched('/')) {
  const { ctx, page, v } = await open('/', { scheme: 'light' });
  const blocks = await page.locator('#tools [data-tool]').evaluateAll((els) => els.map((e) => [e.dataset.tool, [...e.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))]));
  if (blocks.length !== 4 || new Set(blocks.map(([id]) => id)).size !== 4) v(`home shows the tool blocks ${blocks.map(([id]) => id).join(', ')}; want each of the four tools once`);
  for (const [id, hrefs] of blocks) if (hrefs.length !== 1 || !hrefs[0].endsWith('?case=home')) v(`home's ${id} block has the links ${hrefs.join(', ')}; want one, opening the tool with the case`);
  await ctx.close();
}
for (const [path, id, want, step] of [['/dscr/', 'dscr-lowest', '1.00', 'case S'], ['/estimate/', 'pl-summary', /· Pune · 1,000 sq ft · 2 BHK · Standard$/, 'the Pune flat'],
  ['/project-report/', 'rep-status', 'All questions answered', 'case R, its cash short in 2027-28 as at 70 lakh of sales'], ['/cma/', 'cma-status', 'All questions answered', 'case W']]
  .filter(([path]) => touched('/') || touched(path))) {
  const { ctx, page, v } = await open(`${path}?case=home`, { scheme: 'light' });
  if (!(await page.getByTestId('home-case').count())) v(`${path}?case=home does not say it is filled with the home page's case`);
  await expectText(page, v, id, want, `${step} from home`);
  await ctx.close();
}
// OR11a (D-UX-245): case R all answered. The status counts only questions with a box, the check is a step of its own,
// and cash running out joins the verdict. Home's case opens on the Check step, where its answer is (BUILD1).
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/?case=home', { scheme: 'light' });
  await expectText(page, v, 'rep-status-go', 'check your figures before the download', 'OR11a: the check as its own step');
  await expectFigures(page, v, 'rep-misses-work', '… short …', 'OR11a: cash running out in the verdict');
  if ((await page.getByTestId('rep-step-check').getAttribute('aria-current')) !== 'step') v('BUILD1: home\'s case does not open on the Check step');
  await ctx.close();
}
// BUILD1 (D-UX-340 to D-UX-342): the builder. Six steps on the progress line and one shown; Next and Back walk them and
// the step's heading takes the focus; what is typed shows on the paper, marked a draft; the answers and the step come
// back after a reload, saved on the device (D-UX-341); the worked example passes every check (D-UX-342); Clear all
// empties the device's copy.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  const shown = () => page.evaluate(() => [...document.querySelectorAll('[data-step]')].filter((x) => !x.hidden).map((x) => x.dataset.step).join());
  const kept = () => page.evaluate(() => [localStorage.getItem('draft:report:v1') !== null, sessionStorage.getItem('draft:report:v1') !== null, localStorage.getItem('report-step')]);
  const names = await page.locator('[data-steps] button').allTextContents();
  if (await shown() !== 'business' || (await page.getByTestId('rep-step-business').getAttribute('aria-current')) !== 'step') v(`BUILD1: the page opens on ${await shown()}, want the business alone`);
  if (await page.getByTestId('rep-back').count()) v('BUILD1: Back shows on the first step');
  await leave(page, 'field=Business’s name', 'Meera Foods');
  await expectText(page, v, 'rep-paper', /Meera Foods/, 'BUILD1, the name typed on the paper');
  await expectText(page, v, 'rep-paper', /Draft/, 'BUILD1, the paper marked a draft before the check');
  await page.getByTestId('rep-next').click();
  await page.waitForFunction(() => document.activeElement?.id === 'step-cost-h', null, { timeout: 5000 }).catch(() => v('BUILD1: Next does not take the focus to the next step\'s heading'));
  if (await shown() !== 'cost') v(`BUILD1: Next from the business shows ${await shown()}`);
  await page.getByTestId('rep-back').click();
  if (await shown() !== 'business') v(`BUILD1: Back from the cost shows ${await shown()}`);
  await page.getByTestId('rep-step-loan').click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#fld-rep-name')?.value === 'Meera Foods', null, { timeout: 5000 }).catch(() => v('D-UX-341: a reload lost the report\'s answers'));
  if (await shown() !== 'loan') v(`D-UX-341: a reload opens on ${await shown()}, want the loan, the step left`);
  if (JSON.stringify(await kept()) !== '[true,false,"loan"]') v(`D-UX-341: the device keeps ${JSON.stringify(await kept())}, want the draft on the device, none in the tab, the step`);
  await page.getByTestId('rep-example').click();
  await page.getByTestId('rep-step-check').click();
  await expectText(page, v, 'rep-verdict', /./, 'D-UX-342, the worked example\'s verdict');
  if (await page.getByTestId('rep-misses').count()) v('D-UX-342: the worked example misses a check');
  await expectFigures(page, v, 'rep-paper', '… 2.31 …', 'D-UX-342, the example\'s lowest DSCR on the paper');
  await page.getByTestId('rep-clear').click();
  if ((await kept())[0]) v('D-UX-341: Clear all leaves the answers on the device');
  await ctx.close();
}
// UXR5 (LOOP1d, D-UX-234): the estimate's answers folded from 1024 px to a rail in two groups, which opens in place.
if (touched('/estimate/')) {
  const { ctx, page, v } = await open('/estimate/?case=home', { scheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectText(page, v, 'pl-rail', /^Your answersThe workWhat the work is.*Pune.*The homeBedrooms|The home.*Bedrooms.*Level/, 'UXR5, the estimate\'s rail at 1280 px');
  await page.getByTestId('pl-rail-change').click();
  await page.locator('[data-testid="pl-rail-open"] #six-questions').waitFor({ timeout: 5000 }).catch(() => v('UXR5: the estimate\'s rail does not open to its questions'));
  await layout(page, v, 'the estimate\'s answers open in the rail, 1280 px');
  await page.getByTestId('pl-rail-done').click();
  await ctx.close();
}
// UXR5 (LOOP1d, D-UX-233): case W all answered, "See the answer" folds the CMA's questions: on a phone to "Edit answers"
// and a sheet; from 1024 px to a rail of the limit, each year's net sales and balance sheet and the more options, which
// opens in place with the years as cards; a link to an answer while folded opens them and lands on it.
if (touched('/cma/')) {
  const { ctx, page, v } = await open('/cma/?case=home', { scheme: 'dark' });
  await expectText(page, v, 'cma-status', 'All questions answered', 'case W from home');
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByTestId('cma-answer-bar-see').click();
  if (await page.locator('#cma-figures').count()) v('UXR5: "See the answer" leaves the CMA\'s figures unfolded');
  await page.getByTestId('cma-edit').click();
  await page.locator('dialog[open] >> field=Limit you have today, from all banks').waitFor();
  await layout(page, v, 'the CMA\'s sheet, 390 px');
  await page.keyboard.press('Escape');
  await page.locator('field=Limit you have today, from all banks').waitFor({ state: 'detached', timeout: 5000 }).catch(() => v('UXR5: Esc leaves the CMA\'s sheet open'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  await expectText(page, v, 'cma-rail', /^Your answersThe limitLimit you have today.*Net sales.*Balance sheet.*Balances at ₹[\d,]+.*More options/, 'UXR5, the CMA\'s rail at 1280 px');
  await page.getByTestId('cma-rail-change').click();
  await page.locator('[data-testid="cma-rail-open"] >> field=Limit you have today, from all banks').waitFor({ timeout: 5000 }).catch(() => v('UXR5: the CMA\'s rail does not open to its questions'));
  await layout(page, v, 'the CMA\'s answers open in the rail, 1280 px');
  await page.getByTestId('cma-rail-done').click();
  await tap(page, 'cma-assumed');
  await page.locator('[data-testid="cma-assumed"] a[href="#fld-cma-quasi"]').click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-cma-quasi', null, { timeout: 5000 }).catch(() => v('UXR5: a link to a folded answer does not land on it (the CMA\'s promoters\' loans)'));
  await ctx.close();
}

// CMA data (C1, D-UX-46), fictional case K worked outside the engine in tests/cma.test.ts: sales 300 to 520 L over
// 2023-24 to 2027-28. In 2027-28 the balance sheet totals 2,96,80,000 on both sides and the limit by the turnover method
// is 1,04,00,000 (25% of 520 L less the 5% margin of 26 L, the net working capital of 23.8 L being less). The default
// path is the owner's short CMA: 25 heads for each of five years, the limit now and, from MV4 (D-UX-56), fresh or renewal:
// 127 fields (D-UX-12's count).
if (touched('/cma/')) {
  const { ctx, page, v } = await open('/cma/', { scheme: 'light' });
  if (await page.locator('#more-options').evaluate((d) => d.open)) v('the CMA page opens with More options open');
  await ceiling(page, v, 127, 'the CMA page (25 heads × 5 years, the limit now, fresh or renewal)');
  await expectFigures(page, v, 'cma-years', '… 2023-24 … 2024-25 … 2025-26 … 2026-27 … 2027-28 …', 'the CMA years');
  await expectFigures(page, v, 'cma-status', '3', 'the empty CMA page');
  // UXR6 (UXR1's S20): on a phone one year's card a form, picked by its button; a link to a box in another year opens
  // that year and lands on the box; "Next year" goes on to the next one's first box.
  const shown = () => page.evaluate(() => ['II', 'III'].map((f) => [...document.querySelectorAll(`[data-testid^="cma-input-${f}-"]`)].filter((e) => e.checkVisibility()).map((e) => e.dataset.testid.split('-').at(-1)).join('+')).join(' '));
  const focused = () => page.evaluate(() => document.activeElement?.id);
  if (await shown() !== 'a1 a1') v(`UXR6: the CMA on a phone shows the years ${await shown()}, want a1 a1`);
  await page.getByTestId('cma-year-est').click();
  if (await shown() !== 'est est' || await page.getByTestId('cma-year-est').getAttribute('aria-current') !== 'true') v(`UXR6: the CMA's estimate button shows ${await shown()}, want est est and itself current`);
  await page.getByTestId('cma-year-III-a3').click();
  if (await shown() !== 'a3 a3' || await page.getByTestId('cma-year-a3').getAttribute('aria-current') !== 'true') v(`the CMA's balance-sheet year buttons show ${await shown()}, want a3 a3 with Form II's in step`);
  await page.locator('[data-testid="cma-key-0"] a').click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-cma-a1-sales', null, { timeout: 3000 }).catch(() => {});
  if (await shown() !== 'a1 a1' || await focused() !== 'fld-cma-a1-sales') v(`UXR6: the CMA's link to a missing figure lands on ${await focused()} with ${await shown()} shown, want fld-cma-a1-sales`);
  await page.getByTestId('cma-next-year').click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-cma-a2-sales', null, { timeout: 3000 }).catch(() => v('UXR6: the CMA\'s "Next year" does not land on 2024-25\'s net sales'));
  await page.getByTestId('cma-example').click();
  await expectText(page, v, 'cma-status', 'All questions answered', 'the CMA example');
  await expectFigures(page, v, 'cma-key-0', '1,04,00,000', 'the CMA limit');
  if (await page.getByTestId('cma-to-download').getAttribute('href') !== '#download') v('UXR6: the CMA\'s answer card has no jump to the download');
  const flags = await page.getByTestId('cma-flags').locator('li').count();
  if (flags !== 3) v(`the CMA example shows ${flags} things to look at, want 3 (the growth and the two short margins)`);
  await page.getByTestId('cma-form3').evaluate((t) => t.closest('details').open = true);
  for (const label of ['Total liabilities', 'Total assets']) {
    const got = await page.getByTestId('cma-form3').locator('tr', { has: page.locator('th', { hasText: label }) }).first().locator('td').allTextContents();
    if (got.at(-1) !== '2,96,80,000') v(`the CMA Form III "${label}" ends ${JSON.stringify(got.at(-1))}, want 2,96,80,000`);
  }
  // MV4 (D-UX-56): case K is fresh and meets every level in its worse year; the room is how far its sales can fall.
  const misses = await page.locator('[data-testid^="cma-check-"]', { hasText: 'Misses:' }).count();
  if (misses || await page.getByTestId('cma-misses').count()) v(`the CMA example misses ${misses} of the default benchmark ratios, want none`);
  await expectFigures(page, v, 'cma-check-dscrAverage', '… meets … 5.84 … 2026-27 … 2027-28 …', 'case K\'s average DSCR');
  await page.getByTestId('cma-viable').click();
  await expectFigures(page, v, 'cma-move-sales', '8.4%', 'how far case K\'s sales can fall');
  await expectFigures(page, v, 'cma-text-sales', '… 4,76,32,000 … 5,20,00,000 …', 'case K\'s sales at the edge');
  await layout(page, v, 'the CMA example, 390 px');
  const viable = page.getByTestId('cma-viable');
  if (await viable.getAttribute('aria-expanded') !== 'true') v('the CMA\'s "How far can sales fall?" does not stay open');
  await viable.click();
  if (await page.getByTestId('cma-viable-box').count() || await viable.textContent() !== 'How far can sales fall?') v('the CMA\'s "Close" does not close the room');
  await viable.click();
  await page.getByTestId('cma-doc-needs').getByRole('link', { name: 'The business’s name' }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'fld-cma-name', null, { timeout: 3000 }).catch(() => v('the CMA document\'s "The business’s name" does not land on its box'));
  await expectFigures(page, v, 'cma-doc-status', '1', 'the CMA document before its name');
  await leave(page, 'field=Business’s name', 'K Steel Furniture Pvt Ltd');
  await expectText(page, v, 'cma-doc-status', 'All questions answered', 'the CMA document');
  const save = saver(page, v);
  const pdf = await save('cma-download-pdf');
  if (pdf.name !== 'CMA data - K Steel Furniture Pvt Ltd.pdf') v(`the CMA PDF is named "${pdf.name}"`);
  const text = (await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`])).join('\n');
  if (!text.includes('1,04,00,000') || !text.includes('2,96,80,000')) v('the CMA PDF does not read back its limit and its balance sheet');
  if (/DSCR|benchmark|viable/i.test(text)) v('the CMA PDF carries the levels or the plan (MV4 keeps them on the page)');
  const xlsx = (await save('cma-download-xlsx')).bytes;
  const book = await workbook(xlsx).catch((e) => v(`the CMA Excel copy is not read: ${e.message}`)) ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'Summary|Forms II and III|Forms IV to VI|Ratios') v(`the CMA Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))}`);
  const formulas = await formulaParts(xlsx);
  if (formulas.length) v(`the CMA Excel copy holds formulas in ${formulas.join(', ')}`);
  // The Word copy, as on the other tools (UXR5b, P10).
  const word = await docxLines((await save('cma-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (word.messages.length || !word.lines.some((l) => l.includes('1,04,00,000'))) v(`the CMA Word copy reads back ${JSON.stringify(word.lines.slice(0, 4))} ${JSON.stringify(word.messages).slice(0, 120)}`);
  await ctx.close();
}

// Make it viable on the CMA (MV4, D-UX-56): fictional case M worked by hand in tests/cma-plan.test.ts, a fresh limit with
// no collateral. It misses five levels; the plan counts the promoters' loans, raises 2027-28's sales 5.2% to 2,52,48,000
// and asks collateral of 3,11,112, still short on the current ratio; with the promoters' most at 10 L it brings 5,45,455
// of capital instead of the collateral and meets every level. "Use this plan" writes the cells; Undo puts them back.
if (touched('/cma/')) {
  const { ctx, page, v } = await open('/cma/', { scheme: 'light' });
  const M = { sales: [150, 165, 180, 200, 240], otherIncome: [0, 0, 0, 0, 0], materials: [103, 114, 126, 140, 170], otherDirect: [15, 17, 18, 20, 25],
    employees: [9, 10, 11, 12, 14], sga: [6, 7, 7, 8, 10], depreciation: [5, 5, 5, 5, 5], wcInterest: [7.5, 8, 8.5, 9, 12.5], tlInterest: [4.5, 4, 3.5, 3, 2.5],
    tax: [0, 0, 0.25, 0.75, 0.25], drawings: [0, 0, 0.75, 1.25, 0.75], capital: [20, 20, 20, 20, 20], reserves: [4, 4, 4, 5, 5], promoterLoans: [10, 10, 10, 10, 10],
    termLoans: [36, 32, 28, 24, 20], tlDue12: [4, 4, 4, 4, 4], bankWc: [55, 60, 65, 70, 80], creditors: [24, 26, 28, 30, 34], otherCl: [2, 2, 2, 2, 2],
    netBlock: [55, 50, 45, 40, 35], nonCurrent: [10, 10, 10, 10, 10], stock: [32, 35, 38, 40, 48], debtors: [24, 26, 28, 30, 36], cash: [3, 3, 3, 3, 2], otherCa: [27, 30, 33, 38, 40] };
  for (const [i, y] of ['a1', 'a2', 'a3', 'est', 'proj'].entries()) for (const [h, xs] of Object.entries(M)) await leave(page, `#fld-cma-${y}-${h}`, `${xs[i]} L`);
  await leave(page, 'field=Limit you have today, from all banks', '60 L');
  await expectText(page, v, 'cma-levels-ask', /whether the limit is fresh or enhanced, or a renewal/, 'case M before fresh or renewal');
  await page.locator('field=A fresh or enhanced limit…').check();
  await page.locator('#more-options').evaluate((d) => d.open = true);
  await leave(page, 'field=Collateral’s market value (0 if none)', '0');
  await expectFigures(page, v, 'cma-misses', '… misses … 5 … 8 …', 'case M fresh');
  await expectFigures(page, v, 'cma-short-currentRatio', '… short … 5,60,000 …', 'case M\'s current ratio');
  await page.getByTestId('cma-viable').click();
  await expectFigures(page, v, 'cma-plan-steps', '… 2,52,48,000 … 2027-28 … 2,40,00,000 … 5.2% … 3,11,112 …', 'case M\'s plan');
  await expectFigures(page, v, 'cma-plan-verdict', 'misses', 'case M\'s plan without the promoters\' most');
  await leave(page, 'field=The most the promoters can bring as capital, if known', '10 L');
  await expectFigures(page, v, 'cma-plan-steps', '… 5,45,455 … 2026-27 …', 'case M\'s plan with 10 L from the promoters');
  await expectFigures(page, v, 'cma-plan-verdict', 'meets', 'case M\'s plan with 10 L from the promoters');
  await layout(page, v, 'case M\'s plan, 390 px');
  await page.getByTestId('cma-plan-use').click();
  await expectValue(page, v, 'field=Net sales (without GST), 2027-28', '2,52,48,000', 'case M\'s plan used');
  await expectValue(page, v, 'field=Capital, 2026-27', '25,45,455', 'case M\'s plan used');
  const marked = await page.locator('[data-changed="plan"]').count();
  if (!marked) v('the plan used marks no cell it changed');
  if (await page.getByTestId('cma-misses').count()) v('case M still misses a level after its plan is used');
  await page.getByTestId('cma-undo').click();
  await expectValue(page, v, 'field=Net sales (without GST), 2027-28', '2,40,00,000', 'case M\'s plan undone');
  if (await page.getByTestId('cma-used').count()) v('Undo left the banner of the plan used');
  await ctx.close();
}

// Reading an audited statement (U1, D-UX-48): the fictional statement K (tests/fixtures/statement-k.ts), read on the
// phone; a pretend Worker answers with the pointers tests/read.test.ts made, as an honest reader would. Only the text
// lines may leave the page, all eight checks must tie, and nothing may reach the forms until the borrower ticks it.
if (touched('/cma/')) {
  const { ctx, page, v } = await open('/cma/', { scheme: 'dark' });
  const fixture = (f) => fileURLToPath(new URL(`../tests/fixtures/${f}`, import.meta.url));
  const answer = await readFile(fixture('statement-k.answer.json'), 'utf8');
  let sent;
  await page.route('**/api/read', (r) => { sent = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: `{"answer":${answer}}` }); });
  const filled = () => page.locator('[id^="fld-cma-"]').evaluateAll((es) => es.filter((e) => /^fld-cma-(a\d|est|proj)-/.test(e.id) && e.value.trim()).length);
  await page.setInputFiles('#read-file', fixture('statement-k.pdf'));
  if (!(await page.getByTestId('read-result').waitFor({ timeout: 15000 }).then(() => true, () => false))) v('statement K was not read');
  else {
    const keys = Object.keys(sent ?? {}), lines = sent?.lines ?? [];
    if (keys.join() !== 'lines' || !lines.length || lines.some((l) => Object.keys(l).join() !== 'page,line,text')) v(`the page sent ${JSON.stringify(keys)} to the reader, want only the lines`);
    if (!lines.some((l) => l.text === 'Share capital 1 30.00 30.00')) v('the lines sent do not hold "Share capital 1 30.00 30.00"');
    const ties = await page.locator('[data-testid^="read-checks-"] li[data-state="ties"]').count();
    if (ties !== 8) v(`${ties} of statement K's 8 checks tie`);
    if (await filled()) v(`${await filled()} CMA cells were filled before any tick`);
    await expectFigures(page, v, 'cma-status', '3', 'statement K read, nothing ticked');
    await ceiling(page, v, 127, 'the CMA page with a statement read');
    await page.getByTestId('read-a3-sales').check();
    await expectValue(page, v, 'field=Net sales (without GST), 2025-26', '3,90,00,000', 'one figure ticked');
    if (await filled() !== 1) v(`one tick filled ${await filled()} cells`);
    await page.getByTestId('read-all-a3').click();
    await page.getByTestId('read-all-a2').click();
    if (await filled() !== 50) v(`confirming both years filled ${await filled()} cells, want 50`);
    await expectValue(page, v, 'field=Reserves and surplus, 2024-25', '11,20,000', 'the year before confirmed');
    await layout(page, v, 'statement K read, 390 px, dark');
  }
  // A PDF with no text, as a scan has: asked to be typed, and nothing sent.
  sent = undefined;
  const scan = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
  await page.setInputFiles('#read-file', { name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(scan) });
  await expectText(page, v, 'read-said', 'This looks scanned: type the figures, or upload the text PDF your CA sends.', 'a scanned statement');
  if (sent) v('a scanned statement was sent to the reader');
  await ctx.close();
}

// Review-by dates (Q2, D-DATA-19): nothing is flagged while in time; a year on, dscr.json's and tax.json's passed dates show beside their sources.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await toReport(page);
  await page.getByTestId('mode-pro').click(); // the sources sit beside the fields, in Professional mode (NEW1c)
  if (await page.getByTestId('review-due').count()) v('a source is flagged due for review on 02-10-2026');
  await ctx.close();
}
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', at: '2027-10-01T10:00:00+05:30' });
  await toReport(page);
  await page.getByTestId('mode-pro').click();
  const due = await page.getByTestId('review-due').allTextContents();
  if (!due.includes('Due for review since 30-09-2027.')) v(`dscr.json's passed review-by date is not flagged on 01-10-2027 (seen: ${due.join(' | ') || 'none'})`);
  await ctx.close();
}

// Interaction data (UD1, D-TECH-37): the steps only, never what is typed. Case S answered question by question, one of
// the ways that work used, the paper by the next step, Professional mode opened, a PDF and an Excel copy, a figure not understood, then leaving: every batch has the
// Worker's shape, holds each step, and holds none of the typed figures in any form. Built without the Worker's address
// (as now), a page sends nothing.
if (touched('/dscr/')) {
  const { check } = await import('../worker/src/event-shape.ts');
  const events = [];
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', events });
  await answerAll(page, { ...CASE_S, rate: '12.25' });
  await page.locator('[data-testid="options"] button[data-testid^="use-"]').first().click({ timeout: 3000 }).catch(() => v('UD1: case S offers no way that works'));
  await page.getByTestId('next').click();
  await page.getByTestId('mode-pro').click();
  await openFold(page, 'paper');
  for (const kind of ['pdf', 'xlsx']) {
    const saved = page.waitForEvent('download');
    await page.getByTestId(`download-${kind}`).click();
    await saved;
  }
  // The facts as a sentence to tap are Simple mode's; Professional mode has the fields themselves.
  await page.getByTestId('mode-simple').click();
  await typeFact(page, 'amount', '1,23,45,678');
  await page.locator('[data-fact="rate"]').click();
  await page.getByTestId('ask-field').fill('twelve');
  await page.getByTestId('ask-next').click();
  await page.waitForTimeout(100);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  const batches = events.map((b) => { try { return JSON.parse(b); } catch { return b; } });
  for (const b of batches) { const r = check(b); if (!r.ok) v(`UD1: a batch the Worker would refuse (${r.why}): ${String(JSON.stringify(b)).slice(0, 120)}`); }
  const steps = batches.flatMap((b) => b.ev ?? []).map((e) => (e.f ? `${e.e} ${e.f}` : e.e));
  for (const want of ['open', 'tap start', 'tap ask-choice-firm', 'field ask-profit', 'field ask-amount', 'tap ask-next', 'result dscr-status-ready', 'tap next',
    'tap mode-pro', 'download pdf', 'download xlsx', 'error ask-rate']) if (!steps.includes(want)) v(`UD1: no "${want}" in the batches (seen: ${steps.join(', ').slice(-300)})`);
  if (!steps.some((x) => /^tap use-/.test(x))) v(`UD1: using a way that works is not a step (seen: ${steps.join(', ').slice(-300)})`);
  if (!steps.at(-1)?.startsWith('leave error-ask-')) v(`UD1: leaving does not name the last step, an error (seen: ${steps.at(-1)})`);
  // The figures as typed, in digits, and as the page shows them; the times are left out, being the page's own.
  const said = events.join('\n').replace(/"t":\d+/g, '');
  for (const x of ['4.5 L', '450000', '4,50,000', '12 L', '1200000', '12,00,000', '12.25', '12345678', '1,23,45,678', 'twelve'])
    if (said.includes(x)) v(`UD1: the typed or shown figure ${x} is in a batch`);
  if (await page.getByTestId('counted').count()) v('UD1: the footer says steps are counted on a build without the Worker');
  await ctx.close();
  // A build without the Worker's address sends nothing.
  const { ctx: c2, page: p2, v: v2 } = await open('/dscr/', { scheme: 'dark' });
  let sent = 0;
  p2.on('request', (r) => { if (r.method() === 'POST') sent++; });
  await typeFact(p2, 'amount', '12 L');
  await p2.evaluate(() => dispatchEvent(new Event('pagehide')));
  await p2.waitForTimeout(200);
  if (sent) v2(`UD1: ${sent} requests sent while the Worker is not live`);
  await c2.close();
}

// Q1: in WhatsApp's own browser the downloads carry the way out to the phone's: on Android a link to the same page.
if (touched('/estimate/')) {
  const UA = 'Mozilla/5.0 (Linux; Android 13; SM-A145F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.21.80';
  const { ctx, page, v } = await open('/estimate/', { userAgent: UA });
  await page.check('field=Repair or renovate…');
  await page.check('#fld-home-flat');
  await page.selectOption('field=Which city?', 'pune');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('field=2 BHK');
  await page.click('field=Basic…');
  const href = await page.getByTestId('pl-in-app').locator('a').getAttribute('href', { timeout: 3000 }).catch(() => null);
  if (href !== 'intent://' + new URL(BASE).host + '/estimate/#Intent;scheme=http;end') v(`Q1: in WhatsApp the downloads' way out reads ${href}`);
  await ctx.close();
  const plain = await open('/estimate/');
  if (await plain.page.getByTestId('pl-in-app').count()) plain.v('Q1: the in-app line shows in a phone\'s own browser');
  await plain.ctx.close();
}

// Answers kept in the tab (UXR2, D-UX-157 to D-UX-162; the DSCR, now kept on the device, is checked with its page above): each tool, typed into, reloaded and opened from home's fictional
// case keeps its filled fields; Clear all empties the draft. A field is filled when it holds text, a choice or a tick.
const filledCount = (page) => page.evaluate(() => [...document.querySelectorAll('main input, main select, main textarea')]
  .filter((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value.trim() !== '')).length);
// What the tab holds (D-UX-173): only the five drafts (the estimate's two islands keep one each, D-UX-171), each small and
// holding no document; nothing in localStorage but the theme and the report's mode (preferences, not answers), and, on
// the project report alone, its draft and the step left: its answers are saved on the device until cleared (D-UX-341).
const DRAFT_KEY = /^draft:(dscr|cma|report|plan|quote):v1$/;
const stored = (page) => page.evaluate(() => ({ s: Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k) ?? '']), l: Object.keys(localStorage).map((k) => [k, localStorage.getItem(k) ?? '']) }));
const KEPT = [
  { path: '/cma/', key: 'cma', clear: ['cma-clear'] },
  { path: '/project-report/', key: 'report', clear: ['rep-clear'], device: true },
  { path: '/estimate/', key: 'plan', fill: async (page) => { await page.check('field=Repair or renovate…'); await page.check('#fld-home-flat'); await page.selectOption('field=Which city?', 'pune'); } },
];
for (const t of KEPT.filter((t) => touched(t.path))) {
  const { ctx, page, v } = await open(t.path);
  if (await page.getByTestId('kept-line').count() !== 1) v('UXR2: the line on what is kept shows not once');
  const blank = await filledCount(page);
  if (t.fill) await t.fill(page);
  else {
    const boxes = page.locator('main input[type="text"]:visible:not(#more-options input):not(#read input)');
    for (let i = 0, n = Math.min(await boxes.count(), 4); i < n; i++) { await boxes.nth(i).fill('5'); await boxes.nth(i).press('Tab'); }
  }
  const typed = await filledCount(page);
  if (typed <= blank) v(`UXR2: typing filled no field (${blank} → ${typed})`);
  const held = await stored(page);
  if (!(t.device ? held.l : held.s).some(([k]) => k === `draft:${t.key}:v1`)) v(`UXR2: typing kept no draft:${t.key}:v1 ${t.device ? 'on the device' : 'in the tab'}`);
  const own = t.device ? held.l.filter(([k]) => k === `draft:${t.key}:v1`) : [];
  for (const [k, val] of [...held.s, ...own]) {
    if (k === 'seeded') continue;
    if (!DRAFT_KEY.test(k) || (t.device && !own.some(([o]) => o === k))) v(`UXR2: the tab holds ${k}, not a draft`);
    else if (val.length > 20000 || /data:|blob:|%PDF/.test(val)) v(`UXR2: ${k} holds more than typed answers (${val.length} characters)`);
  }
  if (held.l.some(([k]) => k !== 'app-theme' && k !== 'report-mode' && !(t.device && (k === `draft:${t.key}:v1` || k === 'report-step')))) v(`UXR2: localStorage holds ${held.l.map(([k]) => k).join(', ')}`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 10000 }).catch(() => {});
  const back = await filledCount(page);
  if (back !== typed) v(`UXR2: a reload kept ${back} of ${typed} filled fields`);
  await page.goto(`${BASE}${t.path}?case=home`, { waitUntil: 'networkidle' });
  await page.goto(BASE + t.path, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 10000 }).catch(() => {});
  if (await filledCount(page) !== typed) v('UXR2: a visit with home\'s fictional case changed the kept answers');
  if (t.clear) {
    for (const id of t.clear) await page.getByTestId(id).click({ timeout: 3000 }).catch(() => v(`UXR2: no ${id} to tap`));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 10000 }).catch(() => {});
    const after = await filledCount(page);
    if (after !== blank) v(`UXR2: after Clear all and a reload ${after} fields are filled, not ${blank}`);
    const left = await stored(page);
    if ([...left.s, ...left.l].some(([k]) => k === `draft:${t.key}:v1`)) v(`UXR2: Clear all left draft:${t.key}:v1 behind`);
  }
  await ctx.close();
}

// UXR5's "Done when" (UXR5b, the UXR1 report; the DSCR, now opening on its example, is checked with its page above): on the other three tools one closed More options (S19); the worked example fills and says it is fictional; Clear all
// takes it in one tap, with an undo; and the same four downloads (P10). The report's downloads wait for its check (OR8).
const SAME = [['/cma/', 'cma', 'cma-'], ['/project-report/', 'rep', 'rep-'], ['/estimate/', 'pl', 'pl-']];
for (const [path, pre, dl] of SAME.filter(([p]) => touched(p))) for (const width of [390, 1280]) {
  const { ctx, page, v } = await open(path);
  if (width !== 390) await page.setViewportSize({ width, height: 900 });
  const more = await page.evaluate(() => [...document.querySelectorAll('main details')].filter((d) => /^More options/.test(d.querySelector(':scope > summary')?.textContent.trim() ?? '')).map((d) => d.open));
  if (more.length !== 1 || more[0]) v(`UXR5 (S19): ${more.length} More options, ${more.filter(Boolean).length} open on load; one, closed, is meant`);
  await page.getByTestId(`${pre}-example`).click();
  if (!(await page.getByTestId('example-case').isVisible())) v('UXR5 (P11): the worked example fills without saying it is fictional');
  if (pre !== 'rep') for (const id of [`${dl}download-pdf`, `${dl}download-xlsx`, `${dl}download-docx`, `${dl}print`]) {
    if (await page.getByTestId(id).count() !== 1) v(`UXR5 (P10): no ${id} once the worked example is in`);
  }
  if (!(await page.getByTestId(`${pre}-clear`).isVisible())) await page.getByTestId(width < 1024 ? `${pre}-edit` : `${pre}-rail-change`).click({ timeout: 3000 }).catch(() => {});
  await page.getByTestId(`${pre}-clear`).click({ timeout: 3000 }).catch(() => v(`UXR5 (S16): no ${pre}-clear to tap`));
  await page.getByTestId(`${pre}-clear-undo`).click({ timeout: 3000 }).catch(() => v(`UXR5 (S16): Clear all gave no undo`));
  if (!(await page.getByTestId('example-case').isVisible())) v('UXR5 (S16): Undo did not bring back the worked example');
  await ctx.close();
}

// The design team's measured checks (docs/DESIGN.md): every page at 360 and 1280 px, light and dark, 320 px, reduced motion.
const design = await designChecks({ browser, BASE, pages, violations });
const asks = await questionsCheck({ browser, BASE, pages, violations });
const forbidden = await forbiddenChecks({ browser, BASE, pages, motion: touched('/'), violations });
await browser.close();
server.close();
console.log(`site check: ${pages.length} pages at 390 px, light and dark: ${violations.length} violations${quick ? ` (--quick: ${pages.join(' ')}; the full check before a PR)` : ''}`);
console.log(`design checks: ${design.lines} findings; questions as each page loads: ${asks.pages} pages within scripts/load-baseline.json; ${forbidden.weight ? `home weighs ${forbidden.weight} KB as it loads` : 'no motion check (home not touched)'}`);
console.log(`downloads on a slow phone (CPU ×4): ${timings.length} timed, slowest ${Math.max(0, ...timings.map((t) => t[1]))} ms (cap ${SLOW_MS} ms)`);
for (const x of violations) console.log(`  - ${x}`);
// In CI each violation is also an annotation, readable where the job's log is not (UX4).
if (process.env.GITHUB_ACTIONS) for (const x of violations) console.log(`::error title=site check::${String(x).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
process.exit(violations.length ? 1 : 0);
