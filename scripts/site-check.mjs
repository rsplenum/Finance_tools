/**
 * Site check (0 violations required). Serves site/dist the way Cloudflare Pages does and opens every built page in
 * Chromium at phone width (390 px), in light and in dark mode. Violations: horizontal scroll; an input under 16 px;
 * text below WCAG AA contrast (catches an element missing its dark: classes); a missing title, description or single
 * h1; a script error, console error or missing file; a light flash for a dark-mode visitor; the theme toggle not
 * cycling Auto → Light → Dark and remembering the choice. The DSCR calculator is driven through its fields (fld-… ids)
 * and its answers read as text (data-testid): fictional case A from the loan terms, own yearly figures, the amount
 * field's read-back, the DSCR statement and the repayment schedule, the tax rate by borrower, Clear all, and the same
 * layout checks once the tables are filled, in light and dark, with the tables as cards at 390 px and as tables at 1024 px.
 * The statement downloads at 390 px, as a PDF, an Excel copy and a Word copy, each read back (scripts/read-doc.mjs):
 * provisional until the borrower's name and the lender are in, then complete, laid out as a CA's statement (P1g).
 * The construction estimate (P2) and the project report (P3) are filled in, worked out and downloaded the same way.
 * Then the design checks (DT1, scripts/design-checks.mjs): axe, contrast, field edges and focus at 3:1, target sizes, Tab
 * reach, 320 px and reduced motion on every page at 360 and 1280 px, light and dark, and the token ratchet.
 * Then the load measure (UX2b, scripts/load-measure.mjs): every page's counts against scripts/load-baseline.json.
 * Run after `npm run build`. CHROMIUM_PATH overrides the browser Playwright would use. `--quick` (CHK1, D-TECH-63) opens only
 * the pages this branch's change touches (scripts/site-pages.mjs), and the motion and frame checks only when home is one.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { docxLines, docxPart, pdfPages, workbook, zipPart } from './read-doc.mjs';
import { DIST, serveDist } from './serve-dist.mjs';
import { designChecks } from './design-checks.mjs';
import { loadCheck } from './load-measure.mjs';
import { forbiddenChecks, sceneFrame, WEIGHT_CAP } from './forbidden-checks.mjs';
import { changedFiles, pagesFor } from './site-pages.mjs';

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
async function open(path, { scheme = 'light', stored, blockScripts = false, at = '2026-10-02T10:00:00+05:30', events, userAgent } = {}) {
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

// DSCR calculator. Expected figures: fictional case A (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts.
const YEARS_A = ['2026-27', '2027-28', '2028-29', '2029-30'];

/**
 * Reads a test id's (or a locator's) text once it settles on `want`, a text or a pattern (or after 3 s); a violation when it differs.
 * It reads `textContent`, which joins paragraphs with no space ("…wardrobeWhat it is:"): a pattern puts none before a label that
 * starts one (T1, `docs/LESSONS.md`).
 */
async function expectText(page, v, what, want, step) {
  const at = typeof what === 'string' ? page.getByTestId(what).first() : what, name = typeof what === 'string' ? what : String(what);
  const read = () => at.textContent({ timeout: 3000 }).then((t) => (t ?? '').replace(/\s+/g, ' ').trim(), () => '(missing)');
  const fits = (t) => (want instanceof RegExp ? want.test(t) : t === want);
  let got = await read();
  for (let i = 0; !fits(got) && i < 30; i++) { await page.waitForTimeout(100); got = await read(); }
  if (!fits(got)) await v(`${step}: ${name} says "${got}", want "${want}"`);
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
const leave = async (page, sel, value) => { await page.fill(sel, value); await page.press(sel, 'Tab'); };
/** The detailed form sits under the closed "More options" (P1f): the flows below open it first. */
const openMore = async (page) => {
  const more = page.locator('#more-options');
  if (!(await more.evaluate((d) => d.open))) await more.locator(':scope > summary').click();
};
/** A closed line on the planning estimate opened by a tap, as a user would (V1): a section, the other things to check, what the estimate assumes. */
const tap = async (page, id) => {
  const d = page.getByTestId(id);
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
  const f = await page.evaluate(audit);
  if (f.wide) v(`${step}: horizontal scroll: ${f.wide}`);
  for (const id of f.smallInputs) v(`${step}: input under 16 px: ${id}`);
  for (const t of f.lowContrast) v(`${step}: low contrast: ${t}`);
}

if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
  // The page opens with the assumptions answered (D-UX-08): the start questions chosen, the loan asked at once, the target
  // filled in, and the preview listing what it assumes.
  if (!(await page.isChecked('#fld-source-plan')) || !(await page.isChecked('#fld-method-common'))) v('the start questions are not answered from the assumptions');
  await page.locator('#fld-loanAmount').waitFor({ timeout: 3000 }).catch(() => v('the loan is not asked at once'));
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'the assumed target');
  // The method and the target read as one line (P1f).
  await expectText(page, v, 'assumed-method', 'How DSCR is worked out, and the target: Common term-loan DSCR; average 1.50, lowest year 1.25 Change', 'the assumptions listed');

  // The loan amount field, kept from P0: read back in figures and words while typing; long words wrap.
  const field = page.locator('#fld-loanAmount');
  for (const [typed, want] of [['70 L', 'Rs. 70,00,000 (Rupees Seventy Lakh Only)'], ['1.2 Cr', 'Rs. 1,20,00,000 (Rupees One Crore Twenty Lakh Only)'], ['seventy', 'Not understood. Type 70 L, 1.2 Cr or 70,00,000.']]) {
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
  await expectText(page, v, 'loan-dates', 'First instalment at the end of December 2026, the last at the end of September 2029. The loan runs over 2026-27 to 2029-30.', 'case A');
  await expectText(page, v, 'loan-level', 'Principal Rs. 1,00,000 a quarter, and interest on the balance every month.', 'case A');
  await expectValue(page, v, '#fld-depreciation-2027-28', '1,30,000', '1.3 L read back once the field is left');
  // With the assumed target removed: the figures show, and the preview stays provisional and says what is still needed.
  await leave(page, '#fld-targetAverage', '');
  await leave(page, '#fld-targetMinimum', '');
  await expectText(page, v, 'dscr-status', '1 question left', 'case A without a target');
  const needs = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (needs.join('|') !== 'A target DSCR for the average, the lowest year, or both') v(`case A without a target: still needed ${JSON.stringify(needs)}`);
  await expectText(page, v, 'dscr-average', '1.45', 'case A');
  await expectText(page, v, 'dscr-lowest', '1.16', 'case A');
  await expectText(page, v, 'dscr-lowest-year', 'in 2027-28', 'case A');
  // The DSCR statement, as a CA lays it out: profit before tax and tax, cash available (A), debt service (B), DSCR.
  for (const [fy, dscr, cash, service] of [['2026-27', '1.20', '4,10,250', '3,41,000'], ['2027-28', '1.16', '5,83,000', '5,02,000'],
    ['2028-29', '1.33', '6,03,500', '4,54,000'], ['2029-30', '2.82', '5,89,750', '2,09,000']]) {
    await expectText(page, v, `dscr-${fy}`, dscr, `case A, DSCR for ${fy}`);
    await expectText(page, v, `available-${fy}`, cash, `case A, cash available in ${fy}`);
    await expectText(page, v, `service-${fy}`, service, `case A, debt service in ${fy}`);
  }
  await expectText(page, v, 'pbt-2026-27', '1,59,000', 'case A, profit before tax in 2026-27');
  await expectText(page, v, 'tax-2026-27', '39,750', 'case A, tax in 2026-27');
  // The Total column, by hand: cash available 21,86,500 and debt service 15,06,000 over the four years; DSCR 1.45, the average.
  await expectText(page, v, 'available-total', '21,86,500', 'case A, total cash available');
  await expectText(page, v, 'service-total', '15,06,000', 'case A, total debt service');
  await expectText(page, v, 'dscr-total', '1.45', 'case A, the Total column\'s DSCR');
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
  await expectText(page, v, 'dscr-status', 'All questions answered, on 7 assumptions', 'case A with the examples');
  await expectText(page, v, 'dscr-verdict', 'Misses 2 of 2 targets: the lowest year, 2027-28, is 1.16 against 1.25; the average is 1.45 against 1.50.', 'case A with the examples');
  await expectText(page, v, 'dscr-largest', 'The largest loan on these terms is Rs. 11,11,295, limited by the lowest year, 2027-28.', 'case A with the examples');
  await expectText(page, v, 'use-amount', 'Use Rs. 11,11,295', 'case A with the examples');
  await expectText(page, v, 'dscr-fewest', 'Even 14 instalments, the most the projections cover (to 2029-30), miss the target: the average is below the target. Add later years to try a longer repayment.', 'case A with the examples');
  await expectText(page, v, 'answer-bar', 'Average 1.45 · lowest 1.16 in 2027-28 · does not work yet: 2 ratios short · all questions answered, on 7 assumptions', 'case A with the examples');

  // Tables become cards on phones and stay tables on wider screens, without a sideways scroll either way.
  await layout(page, v, 'case A filled, a schedule year open, 390 px');
  const statement = page.getByTestId('dscr-statement'), card = page.getByTestId('card-2027-28');
  if (await statement.isVisible() || !(await card.isVisible())) v('390 px: the statement is shown as a table, not as cards');
  await expectText(page, v, card.locator('[data-line="dscr"]'), '1.16', 'the 2027-28 card on a phone');
  await expectText(page, v, page.getByTestId('card-total').locator('[data-line="available"]'), '21,86,500', 'the Total card on a phone');
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
  if (filled !== '11,11,295') v(`"Use Rs. 11,11,295" shows "${filled}" in the loan amount until the next paint`);
  await expectText(page, v, 'amount-read', 'Rs. 11,11,295 (Rupees Eleven Lakh Eleven Thousand Two Hundred and Ninety Five Only)', 'after taking the largest loan');
  await expectText(page, v, 'dscr-verdict', 'Meets both targets: the lowest year, 2027-28, is 1.25 against 1.25; the average is 1.56 against 1.50.', 'after taking the largest loan');
  if (await page.getByTestId('use-amount').count()) v('the largest loan is still offered after it was taken');

  // A figure that is not understood is flagged and listed as still needed, never taken as zero.
  await leave(page, '#fld-pbdit-2028-29', 'lots');
  await page.waitForSelector('#fld-pbdit-2028-29[aria-invalid="true"]', { timeout: 3000 }).catch(() => v('"lots" in a figure is not flagged'));
  await expectText(page, v, 'dscr-status', '1 question left', 'a figure not understood');
  const missing = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (missing.join('|') !== 'Profit before interest, depreciation and tax for 2028-29') v(`a figure not understood: still needed ${JSON.stringify(missing)}`);
  // The answer's outline stays, each figure a "—" until every figure is understood (UX8, D-UX-106).
  if (/\d/.test((await page.getByTestId('dscr-average').textContent()) ?? '')) v('figures shown while a figure is not understood');

  // Who the borrower is sets the tax for every year in one tap.
  await page.check('#fld-borrowerType-company');
  await expectText(page, v, 'tax-by', 'Worked out each year for a company: 25.168%.', "the company's tax");
  if (await page.locator('#fld-taxPct-2026-27').count()) v('a tax rate is still asked after saying who the borrower is');
  // Clear all in one tap takes the page back to where it opened, the assumptions and nothing typed, with an undo (UXR5b, S16).
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
  await openMore(page);
  await enterCaseA(page);
  await page.getByTestId('use-examples').click();
  await expectText(page, v, 'dscr-average', '1.45', 'case A, dark');
  await layout(page, v, 'case A filled, dark, 390 px');
  await page.setViewportSize({ width: 1024, height: 900 });
  await layout(page, v, 'case A filled, dark, 1024 px');
  await ctx.close();
}

// A loan drawn in October: 2026-27 has interest only. The figures start in the loan's first year, as assumed and listed,
// and the question offers the later year.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
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
  await expectText(page, v, 'dscr-status', '2 questions left', 'a first year with interest only');
  if (!(await page.isChecked('#fld-start-2026-27'))) v("the figures do not start in the loan's first year as assumed");
  await expectText(page, v, 'assumed-start', 'The first year of the figures: The year the loan is first drawn Change', 'the start assumption listed');
  await expectText(page, v, page.getByTestId('start-question').locator('p').first(), 'No instalment falls in 2026-27, only interest of Rs. 72,000. If operations start later, start your figures there: the interest before then is taken as paid from the project cost, not from profits.', 'the question about the first year');
  await page.check('#fld-start-2027-28');
  await expectText(page, v, 'dscr-status', 'All questions answered, on 7 assumptions', 'figures starting in 2027-28');
  if (await page.getByTestId('assumed-start').count()) v('the start assumption is still listed after choosing 2027-28');
  await expectText(page, v, 'dscr-before-start', 'Left out: 2026-27, before your figures start. Its interest (Rs. 72,000) is taken as paid from the project cost (capitalised), not from profits.', 'figures starting in 2027-28');
  await expectValue(page, v, '#fld-pbdit-2027-28', '7,50,000', 'each figure stays under its year');
  if (await page.locator('#fld-pbdit-2026-27').count()) v('2026-27 is still asked after the figures start in 2027-28');
  await layout(page, v, 'figures starting in 2027-28');
  await page.check('#fld-start-2026-27');
  await expectText(page, v, 'dscr-status', '2 questions left', 'figures starting in 2026-27');
  await ctx.close();
}

// A few answers instead of every year: profit grows from one figure and one rate; the rest are one figure or None.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
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
  await expectText(page, v, 'readback-pbdit', 'Worked out: Rs. 18,00,000 in 2027-28 to Rs. 26,35,380 in 2031-32.', 'profit growing 10% a year');
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
  await expectText(page, v, 'dscr-status', 'All questions answered, on 9 assumptions', 'a few answers');
  // Four fields for a five-year loan (profit and its rate, depreciation, working-capital interest; the tax from who the
  // borrower is), not five a line.
  const inputs = await page.locator('#figures input[type="text"]').count();
  if (inputs > 4) v(`${inputs} fields asked for a 5-year loan; want 4`);
  // 18,00,000 growing 10% a year: 19,80,000, 21,78,000, 23,95,800, 26,35,380.
  for (const [fy, want] of [['2027-28', '18,00,000'], ['2028-29', '19,80,000'], ['2031-32', '26,35,380']])
    await expectText(page, v, `pbdit-${fy}`, want, `profit worked out for ${fy}`);
  await layout(page, v, 'a few answers, 390 px');
  await ctx.close();
}

// The owner's quick path: the loan and this year's figures, everything else as assumed and listed (fictional case A′,
// worked by hand in tests/dscr-page.test.ts).
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
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
  await expectText(page, v, 'dscr-status', 'All questions answered, on 10 assumptions', 'the quick path');
  await expectText(page, v, 'dscr-average', '1.16', 'the quick path');
  await expectText(page, v, 'dscr-lowest', '0.84', 'the quick path');
  await expectText(page, v, 'assumed-tax', 'Tax rate: 31.2% Change', 'the quick path');
  // Four figures typed for the business, whatever the number of years, beside the assumed tax rate.
  const inputs = await page.locator('#figures input[type="text"]').count();
  if (inputs !== 5) v(`${inputs} fields in the figures on the quick path; want 5 (4 typed and the assumed tax rate)`);
  await layout(page, v, 'the quick path, 390 px');

  // The statement to download, at 390 px. Without the borrower's name and the lender it is provisional, and says so.
  await expectText(page, v, 'doc-status', '2 questions left, for the document', 'the download before its facts');
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
  await expectText(page, v, 'fld-gstin-said', 'A GSTIN has 15 letters and digits, like 27ABCDE1234F1Z5.', 'a short GSTIN');
  await leave(page, '#fld-gstin', '');
  await expectText(page, v, 'doc-status', 'All questions answered', 'the download with its facts');
  if (await page.getByTestId('doc-needs').count()) v('the download still lists needs once its facts are in');
  pdf = await save('download-pdf');
  if (pdf.name !== 'DSCR statement - Asha Traders.pdf') v(`the PDF is named "${pdf.name}"`);
  pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  // Page 1: the borrower's name, the lender, the whole working, the average and the lowest year, the signature (P1g).
  const first = pages[0].split('\n');
  for (const want of ['Asha Traders', 'Average DSCR Lowest year', '1.16 0.84', 'For Asha Traders', 'Profit before tax 1,59,000 2,48,000 3,51,000 4,56,500 12,14,500',
    'Cash available (A) 4,00,392 4,22,624 4,45,488 4,73,072 17,41,576', 'DSCR (A ÷ B) 1.17 0.84 0.98 2.26 1.16'])
    if (!first.includes(want)) v(`the PDF's first page has no line "${want}"`);
  if (!first.some((l) => l.startsWith('Lender Example Bank, Pune branch Prepared on '))) v("the PDF's first page does not name the lender");
  if (pages.length < 3 || pages.join('\n').includes('Provisional')) v(`the PDF has ${pages.length} pages, or still says provisional`);
  if (!pages[1]?.includes('Annex 1. The basis') || !pages[2]?.includes('Annex 2. Repayment schedule')) v('the annexes do not start pages 2 and 3');
  // What stays on the page only (D-DOC-03, and the owner on 02-10-2026): the assumptions, the verdict, the largest loan,
  // the fewest instalments, the lender's target, how far the method was checked, and the rules for building the figures.
  const ONLY_ON_THE_PAGE = ['Assumed until changed', 'Misses', 'The largest loan', 'The fewest instalments', 'target', 'checked', 'How the figures are built', 'Status'];
  for (const not of ONLY_ON_THE_PAGE) if (pages.join('\n').includes(not)) v(`the PDF says "${not}"`);
  const xlsx = await save('download-xlsx');
  if (xlsx.name !== 'DSCR statement - Asha Traders.xlsx') v(`the Excel copy is named "${xlsx.name}"`);
  const book = await workbook(xlsx.bytes).catch((e) => v(`the Excel copy is not read: ${e.message}`)) ?? [];
  const cash = book[0]?.data.find((r) => r[0] === 'Cash available (A)')?.filter((c) => c !== null);
  if (book.map((x) => x.sheet).join('|') !== 'DSCR statement|Basis|Repayment schedule|Check' || JSON.stringify(cash) !== JSON.stringify(['Cash available (A)', 400392, 422624, 445488, 473072, 1741576]))
    v(`the Excel copy holds sheets ${JSON.stringify(book.map((x) => x.sheet))} and cash available ${JSON.stringify(cash)}`);
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
  await openMore(page);
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
  await expectText(page, v, 'tax-by', 'Worked out each year for a proprietor: slab rates of 5% to 30% with 4% cess, nothing up to Rs. 12,00,000 of profit.', "a proprietor's tax");
  await expectText(page, v, 'tax-2026-27', '0', "a proprietor's tax");
  await expectText(page, v, 'dscr-average', '1.41', "a proprietor's tax");
  await expectText(page, v, 'assumed-proprietorTax', "A proprietor's tax: The new regime's slab rates, on the business's profit as the only income Change", "a proprietor's tax");
  await page.check('#fld-otherLoansInterest-emi');
  await expectText(page, v, 'emis-ask', 'All EMIs a month, business and personal (home, car, personal loans).', "a proprietor's EMIs");
  await leave(page, '#fld-emi-1', '20000');
  await page.getByTestId('add-loan').click();
  await leave(page, '#fld-emi-2', '15,000');
  await leave(page, '#fld-emiLast-2', '2027-06');
  await expectText(page, v, 'readback-existingEmis', 'Worked out: Rs. 4,20,000 in 2026-27; Rs. 2,85,000 in 2027-28; Rs. 2,40,000 in 2028-29; Rs. 2,40,000 in 2029-30.', 'EMIs a month');
  await expectText(page, v, 'emis-2027-28', '2,85,000', 'EMIs a month in the statement');
  await expectText(page, v, 'service-2026-27', '7,61,000', 'EMIs a month in the statement');
  await page.check('#fld-assetIncome-from');
  await leave(page, '#fld-assetIncome-yearly', '3.6 L');
  await leave(page, '#fld-assetIncome-start', '2026-10');
  await expectText(page, v, 'asset-2026-27', '1,80,000', 'the new asset from October 2026');
  await expectText(page, v, 'dscr-2026-27', '0.83', 'the new asset from October 2026');
  await expectText(page, v, 'dscr-average', '1.26', 'the new asset from October 2026');
  for (const id of ['assumed-asset', 'assumed-otherLoans', 'assumed-tax']) if (await page.getByTestId(id).count()) v(`${id} is still listed after it was answered`);
  await layout(page, v, 'borrower, EMIs and the new asset, 390 px');
  await ctx.close();
}

// Own yearly figures (tests/dscr.test.ts, "which years count"): the loan amount is not asked, and the year with no
// instalment is not counted.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
  await page.check('#fld-source-own');
  await page.check('#fld-method-common');
  await page.waitForSelector('#fld-firstYear', { timeout: 3000 }).catch(() => v('own figures: the years are not asked'));
  if (await page.locator('#fld-loanAmount').count()) v('own figures: the loan amount is asked though it does not change the answer');
  await leave(page, '#fld-firstYear', '2026-27');
  await leave(page, '#fld-yearCount', '3');
  await expectText(page, v, 'years-read', '2026-27 to 2028-29', 'own figures');
  const fys = ['2026-27', '2027-28', '2028-29'];
  const own = { pat: ['60000', '80000', '100000'], depreciation: ['40000', '40000', '40000'], interestTL: ['50000', '40000', '20000'], principalTL: ['0', '100000', '100000'] };
  for (const [k, xs] of Object.entries(own)) for (const [i, fy] of fys.entries()) await leave(page, `#fld-${k}-${fy}`, xs[i]);
  await expectValue(page, v, '#fld-principalTL-2026-27', '0', 'a typed 0 stays');
  // Own figures take none of the assumptions about the figures; the method and the target still hold.
  await expectText(page, v, 'dscr-status', '1 question left', 'own figures before None');
  await page.check('#fld-nonCash-none');
  await leave(page, '#fld-targetAverage', '1.5');
  await expectText(page, v, 'dscr-status', 'All questions answered, on 2 assumptions', 'own figures');
  await expectText(page, v, 'dscr-average', '1.23', 'own figures');
  await expectText(page, v, 'dscr-lowest', '1.14', 'own figures');
  await expectText(page, v, 'dscr-not-counted', 'Not counted: 2026-27 (no term-loan instalment).', 'own figures');
  await expectText(page, v, 'dscr-verdict', 'Misses 2 of 2 targets: the lowest year, 2027-28, is 1.14 against 1.25; the average is 1.23 against 1.50.', 'own figures');
  await layout(page, v, 'own figures filled');
  await ctx.close();
}

// The front door (P1f, D-UX-10): eight fields, More options closed on load, and the results without opening it. A textbook
// EMI: Rs. 10,00,000 at 12% for one year is Rs. 88,848.79 a month; 12 of them less the loan is Rs. 66,185 of interest.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  if (await page.locator('#more-options').evaluate((d) => d.open)) v('More options is open on load');
  const texts = await page.locator('#front-door input[type="text"]').count(), radios = await page.locator('#front-door fieldset').count();
  if (texts + radios !== 8) v(`the front door asks ${texts + radios} fields (${texts} typed, ${radios} choices); the owner's list is 8`);
  await expectText(page, v, 'fd-loan-note', 'The loan is taken as drawn in October 2026 and repaid by EMI every month, with no holiday before the first instalment.', 'the front door');
  // S8 (UXR5b): the line to year-by-year projections stands under the last default field, not above the first.
  if (!(await page.evaluate(() => { const m = document.querySelector('[data-testid="fd-more"]'), f = [...document.querySelectorAll('#front-door input')].at(-1);
    return !!m && !!f && !!(f.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING); }))) v('S8: the line to More options is not under the last default field');
  await page.check('#fld-fd-borrower-firm');
  await leave(page, '#fld-fd-profit', '5 L');
  await leave(page, '#fld-fd-growth', '10');
  await leave(page, '#fld-fd-amount', '10 L');
  await leave(page, '#fld-fd-rate', '12');
  await leave(page, '#fld-fd-years', '1');
  await expectText(page, v, 'dscr-instalment', 'EMI Rs. 88,848.79 a month', 'the front door');
  await expectText(page, v, 'dscr-total-interest', 'Rs. 66,185', 'the front door');
  if (!(await page.getByTestId('dscr-average').isVisible())) v('the front door: no average DSCR without opening More options');
  if (!(await page.getByTestId('dscr-marks').isVisible())) v('the front door: the years are not marked against the target');
  if (await page.locator('#more-options').evaluate((d) => d.open)) v('More options opened by itself');
  await expectText(page, v, 'assumed-method', 'How DSCR is worked out, and the target: Common term-loan DSCR; average 1.50, lowest year 1.25 Change', 'the method and the target in one line');
  await expectText(page, v, 'part-2026-27', '6 of 12 instalments', 'the first part-year');
  await layout(page, v, 'the front door filled, 390 px');
  // D1 (D-UX-47): the lenders' lines beside the DSCR, their inputs only under More options; the front door still asks 8.
  if (!(await page.getByTestId('lender-ask').isVisible())) v('D1: no line asking for sales beside the DSCR');
  await expectText(page, v, 'lender-promoters', "Promoters' loans are kept in the business until this loan is repaid (subordinated).", 'D1');
  const avg = await page.getByTestId('dscr-average').textContent();
  await page.getByTestId('lender-ask').locator('a').click();
  await leave(page, '#fld-lender-sales', '50 L');
  if (!/^Sales price 5% lower: average \d\.\d{2,4}, lowest /.test((await page.getByTestId('lender-price').textContent()) ?? '')) v('D1: no line for the sales price 5% lower');
  if (!(await page.getByTestId('lender-costs').count())) v('D1: no line for costs 10% higher');
  if ((await page.getByTestId('dscr-average').textContent()) !== avg) v('D1: the sales changed the borrower\'s DSCR');
  const after = await page.locator('#front-door input[type="text"]').count() + await page.locator('#front-door fieldset').count();
  if (after !== 8) v(`D1: the front door asks ${after} fields after the lenders' tests; want 8`);
  await layout(page, v, 'the lenders\' tests open, 390 px');
  await ctx.close();
}

// Make it work on the front door (LOOP1b, D-UX-227 to D-UX-229): fictional case S, worked by hand in tests/dscr-plan.test.ts
// (a firm, Rs. 4,50,000 this year with no growth, Rs. 12,00,000 at 12% for 5 years; the targets 1.50 and 1.25). The bars
// with the cash short; up to Rs. 1,80,000 of the borrower's own; the plans with their cost, each EMI checked by its closed
// form P·r ÷ (1 − (1 + r)^−n) (20,145.98 over 91, 20,962.39 for 10,20,000 over 67); the repayment let go short of what
// works stops at the nearest that does, the loan following; the rate cut to 10% gives the loan back (20,905.97 for
// 10,70,000 over 67); "See round 2" writes all three; round 1 restores the loan as typed; the front door still asks 8.
// Make it work folds the answers (OR9, D-UX-231): on a phone to "Edit answers" and a sheet that holds the eight fields; from
// 1024 px to a rail of the answers as typed, which opens in place to change them.
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'dark' });
  await page.check('#fld-fd-borrower-firm');
  await leave(page, '#fld-fd-profit', '4.5 L');
  await leave(page, '#fld-fd-growth', '0');
  await leave(page, '#fld-fd-amount', '12 L');
  await leave(page, '#fld-fd-rate', '12');
  await leave(page, '#fld-fd-years', '5');
  await expectText(page, v, 'dscr-short-average', 'Short by Rs. 4,19,502 of cash to pay the loan, in total over the loan.', 'case S');
  await expectText(page, v, 'dscr-short-lowest', 'Short by Rs. 79,164 of cash to pay the loan in 2030-31.', 'case S');
  await page.getByTestId('dscr-viable').click();
  if (await page.locator('#front-door').count()) v('OR9: Make it work leaves the answers unfolded');
  if (!(await page.getByTestId('dscr-edit').isVisible())) v('OR9: no "Edit answers" on a phone once folded');
  await page.check('#dscr-own-180000');
  await expectText(page, v, 'dscr-plan-longer', /Repay over7 years 7 months.*Each instalmentRs\. 20,145\.98 a monthInterest over the loanRs\. 6,33,284Total you pay outRs\. 18,33,284/, 'case S, repay over longer');
  await expectText(page, v, 'dscr-plan-mix', /Repay over5 years 7 monthsThe loanRs\. 10,20,000Your own moneyRs\. 1,80,000Each instalmentRs\. 20,962\.39 a monthInterest over the loanRs\. 3,84,480Total you pay outRs\. 15,84,480/, 'case S, some of both');
  await expectText(page, v, 'dscr-plans-own-short', /^Your own money alone would need Rs\. [\d,]+ over 5 years, more than the Rs\. 1,80,000 you can bring\.$/, 'case S, own money alone');
  if (await page.getByTestId('dscr-plan-best').count()) v('LOOP1b: a plan is marked best');
  await layout(page, v, 'case S\'s plans, 390 px');
  const slide = (id, x) => page.$eval(`#dscr-slider-${id}`, (el, x) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(x));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, x);
  await slide('instalments', 66);
  await expectText(page, v, 'dscr-move-instalments', '5 years 7 months', 'case S, the repayment let go at 66');
  await expectText(page, v, 'dscr-move-amount', 'Rs. 10,20,000', 'case S, the loan following');
  await expectText(page, v, 'dscr-badge-amount', 'Follows', 'case S, the loan following');
  await expectText(page, v, 'dscr-plan-stop', 'Stopped at 5 years 7 months: at 5 years 6 months it does not meet the bank’s figures, even with the loan at Rs. 10,20,000.', 'case S, the stop');
  await slide('ratePct', 10);
  await expectText(page, v, 'dscr-move-instalments', '5 years 7 months', 'case S at 10%: the repayment stays');
  await expectText(page, v, 'dscr-move-amount', 'Rs. 10,70,000', 'case S at 10%: the loan comes back');
  await expectText(page, v, 'dscr-plan-line', /average 1\.62 · meets the bank’s figuresEMI Rs\. 20,905\.97 a month · interest over the loan Rs\. 3,30,700$/, 'case S at 10%');
  await page.getByTestId('dscr-plan-use').click();
  await page.getByTestId('dscr-edit').click();
  await page.locator('dialog[open] #front-door').waitFor();
  const fields = await page.locator('dialog[open] #front-door input[type="text"]').count() + await page.locator('dialog[open] #front-door fieldset').count();
  if (fields !== 8) v(`MV5, OR9: the sheet asks ${fields} fields; want 8`);
  await expectValue(page, v, '#fld-fd-amount', '10,70,000', 'case S, round 2');
  await expectValue(page, v, '#fld-fd-years', '5.58', 'case S, round 2');
  await expectValue(page, v, '#fld-fd-rate', '10', 'case S, round 2');
  await expectText(page, v, page.locator('#fld-fd-amount-hint'), 'Round 1 had Rs. 12,00,000.', 'case S, round 2');
  await expectText(page, v, page.locator('#fld-fd-years-hint'), 'Round 1 had 60 instalments.', 'case S, round 2');
  await page.getByTestId('dscr-sheet-done').click();
  await expectText(page, v, 'dscr-verdict', /^Meets both targets/, 'case S, round 2');
  await expectText(page, v, 'dscr-round-2', /^Round 2 \(on the page now\)You repay over 5 years 7 months instead of 5 years; borrow Rs\. 10,70,000 instead of Rs\. 12,00,000: Rs\. 1,30,000 of your own money; at 10% instead of 12%\./, 'case S, round 2');
  if (await page.getByTestId('dscr-levels').count()) v('case S still shows why it does not work in round 2');
  await page.getByTestId('dscr-round-back-1').click();
  await expectText(page, v, 'dscr-round-1', /^Round 1 \(on the page now\)/, 'case S, back to round 1');
  await page.getByTestId('dscr-edit').click();
  await expectValue(page, v, '#fld-fd-amount', '12,00,000', 'case S, back to round 1');
  await expectValue(page, v, '#fld-fd-years', '5', 'case S, back to round 1');
  // Esc closes only an open dialog: on a slow runner it came before showModal (GOTCHAS).
  await page.locator('dialog[open] #front-door').waitFor();
  await page.keyboard.press('Escape');
  // The answers leave the page once the sheet has closed (its close event may come a frame late, GOTCHAS).
  if (!(await page.locator('#front-door').waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false))) v('OR9: Esc leaves the sheet open');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectText(page, v, 'dscr-rail', /The loanLoan amountRs\. 12,00,000Interest rate12% a yearRepay over5 years/, 'OR9, the rail at 1280 px');
  if (await page.getByTestId('dscr-rail-change').waitFor({ timeout: 5000 }).then(() => true, () => false)) {
    await page.getByTestId('dscr-rail-change').click();
    await leave(page, '#fld-fd-rate', '11');
    await page.getByTestId('dscr-rail-done').click();
    await expectText(page, v, 'dscr-rail', /Interest rate11% a year/, 'OR9, an answer changed in the rail');
  } else v(`OR9: no "Change an answer" at 1280 px; on the page: ${await page.evaluate(() => [...document.querySelectorAll('[data-testid^="dscr-rail"], [data-testid^="dscr-sheet"], [data-testid="dscr-edit"], #front-door, #preview')].map((e) => e.dataset.testid || e.id).join(', ') + ` (dialogs open ${document.querySelectorAll('dialog[open]').length}, wide ${matchMedia('(min-width: 64rem)').matches})`)}`);
  await ctx.close();
}

// The planning estimate (E1, E3, A3, A8, V1): six questions and no other field, then the answer first; a line for every
// section, ten on for a renovation and ten for interiors with Furniture and Soft furnishings (D-UX-19); a slider and what
// it changed, the strip, Compare, the rooms (a size and a level of one's own) and the item drawer; the downloads read
// back. A 2BHK of 1,000 sq ft in Pune at Basic, worked by hand in tests/architect.test.ts and tests/library.test.ts: the
// living room's floor is 303.03 sq ft of tiles at Rs. 111.65 = Rs. 33,833.
for (const scheme of touched('/estimate/') ? ['light', 'dark'] : []) {
  const { ctx, page, v } = await open('/estimate/', { scheme });
  if (await page.locator('#typed-path').evaluate((d) => d.open)) v('the typed quotation is open on load');
  const questions = await page.locator('#six-questions [data-question]').count();
  const loose = await page.locator('#six-questions input, #six-questions select').evaluateAll((els) => els.filter((e) => !e.closest('[data-question]')).length);
  if (questions !== 6 || loose) v(`the estimate asks ${questions} questions (want 6)${loose ? ` and ${loose} fields outside them` : ''}`);
  await page.check('#fld-work-renovate');
  await page.check('#fld-home-flat');
  await page.selectOption('#fld-city', 'pune');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('#fld-bhk-2');
  // The questions fold into one line as the sixth is answered, so the last is clicked rather than checked.
  await page.click('#fld-level-1');
  await expectText(page, v, 'pl-summary', 'Repair or renovate · Flat · Pune · 1,000 sq ft · 2 BHK · Basic', 'the answers folded');
  // The headline as precise as the estimate, the exact total beside it for the bill and the documents (UX8, D-UX-106).
  const head = ((await page.getByTestId('pl-total').textContent()) ?? '').trim();
  if (!/^Rs\. [\d,]+\.\d (lakh|crore)$/.test(head)) v(`the estimate's headline reads "${head}"`);
  const exact = /Rs\. \d[\d,]*\d/.exec((await page.getByTestId('pl-exact').textContent()) ?? '')?.[0] ?? '';
  if (!exact) v('the exact total is not beside the headline');
  await expectText(page, v, 'pl-sticky-total', head, 'the total in the bar at the bottom');
  // L1: the level's range by its choices, as a bar under the total with its words.
  await expectText(page, v, 'pl-range', /^At Basic: the cheapest choice in each item to the dearest; \d+ of the \d+ items offer one\.$/, 'the level\'s range under the total');
  const strip = (await page.getByTestId('pl-strip-1').textContent()) ?? '';
  if (!strip.startsWith('Basic') || !strip.endsWith(`(${exact})`) || (await page.getByTestId('pl-strip-1').getAttribute('aria-pressed')) !== 'true')
    v('the strip does not mark Basic at the total');
  const cards = await page.locator('[data-testid^="pl-card-"]').count(), on = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  if (cards !== 15 || on !== 10) v(`a renovation shows ${cards} sections with ${on} on (want 15 and 10)`);
  // V1: short by default. Every section is one line, closed, and so are the other things to check and the assumptions.
  const opened = await page.locator('main details[open]').count();
  if (opened) v(`${opened} closed lines are open with the answer`);
  await tap(page, 'pl-card-flooring');
  if (await page.getByTestId('pl-brand-notice-flooring').count()) v('the brand notice shows with the floors\' items, though none names a brand until a drawer opens (D-BIZ-05)');
  const living = page.getByTestId('pl-line-living:floor:floor-skirting');
  await expectText(page, v, living.locator('p').nth(1), '303.03 sq ft × Rs. 111.65 = Rs. 33,833', 'the living room floor, by hand');
  await page.getByTestId('pl-open-living:floor:floor-skirting').click();
  await expectText(page, v, 'pl-brand-notice-flooring', NOTICE, 'the brand notice once the floor\'s drawer shows its brands, word for word (D-BIZ-03, D-BIZ-05)');
  // L1: the choices at the line's level first, under its name; each other level one tap away, closed.
  await expectText(page, v, page.getByTestId('pl-choices-1').locator('p').first(), 'At Basic: 5 choices', 'the choices at the line\'s level first');
  const levels = await page.getByTestId('pl-drawer').locator('details[data-testid^="pl-choices-"]').evaluateAll((ds) => ds.map((d) => `${d.querySelector('summary')?.textContent}${d.open ? ' (open)' : ''}`));
  if (JSON.stringify(levels) !== JSON.stringify(['At Standard: 8 choices', 'At Premium: 8 choices', 'At Luxury: 6 choices', 'At Bespoke: 4 choices'])) v(`the drawer's other levels read ${JSON.stringify(levels)}`);
  await layout(page, v, `the estimate with the drawer open, 390 px, ${scheme}`);
  if (scheme === 'dark') { await ctx.close(); continue; }
  await expectText(page, v, page.getByTestId('pl-assumed').locator(':scope > summary'), /^What the estimate assumes \(\d+\)$/, 'the assumptions behind one line with their count');
  await tap(page, 'pl-assumed');
  await expectText(page, v, 'pl-assumed-0', /^Rooms: Living and dining/, 'the assumptions');
  await expectText(page, v, 'pl-rates', /^A planning estimate: rates as reported on \d\d-\d\d-\d{4} for Pune; \d+ of \d+ lines verified at their pages$/, 'the rates as reported, in one line by the total');

  // The downloads, at the package as answered.
  await expectText(page, v, 'pl-doc-status', '2 questions left, for the document', 'the planning estimate before its facts');
  await leave(page, '#fld-pl-owner', 'Asha Rao');
  await leave(page, '#fld-pl-property', 'Flat 4, Example Towers, Pune');
  await expectText(page, v, 'pl-doc-status', 'All questions answered', 'the planning estimate with its facts');
  const save = saver(page, v);
  const pdf = await save('pl-download-pdf');
  if (pdf.name !== 'Planning estimate - Asha Rao.pdf') v(`the planning estimate PDF is named "${pdf.name}"`);
  const pdfText = (await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]));
  const figure = exact.replace('Rs. ', '');
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
  // sheet's Rs. 50.35 and the highest high end Kota stone's Rs. 164.78 a sq ft; Rs. 210 is (210 − 164.78) ÷ 164.78 = 27%
  // above it, past the 20% allowed. "Door" fits more than one family, so it is not matched until the main door is picked;
  // its band at Basic, laminated, Rs. 5,830.85–32,323.42 each.
  await page.locator('#typed-path > summary').click();
  await page.getByTestId('from-bill').click();
  const billLines = billBook[0]?.data.filter((r) => typeof r[0] === 'string' && /^\d+\.\d+$/.test(r[0])).length ?? 0;
  const checks = await page.locator('[data-testid^="item-"][data-testid$="-check"]').allTextContents();
  if (!billLines || checks.length !== billLines || checks.some((x) => x !== 'Left out of the quotation: no rate.'))
    v(`the bill taken in shows ${checks.length} lines (want ${billLines}), ${checks.filter((x) => x !== 'Left out of the quotation: no rate.').length} not left out`);
  const tileCard = await page.locator('[id$="-description"]').evaluateAll((els) => els.findIndex((e) => e.value.startsWith('Double-charge vitrified tiles, 600 × 600 mm (')) + 1);
  await leave(page, `#fld-item-${tileCard}-rate`, '210');
  await expectText(page, v, `item-${tileCard}-check`, 'Check this rate: 27% above the band at Basic (Rs. 50.35–164.78 a sq ft).', 'the floor tiles\' rate against the band');
  await expectText(page, v, page.getByTestId('quote-flagged').locator('li'), /^Double-charge vitrified tiles, 600 × 600 mm \(/, 'the rate to check, listed');
  await expectText(page, v, 'quote-gst', 'Each rate is taken as the price you pay. Where a quotation adds GST on top, add it to each rate before you type it.', 'the one line on GST');
  await expectText(page, v, 'quote-rule', /^A rate is flagged to check when it is more than 20% below the low end/, 'the 20% on the page');
  await leave(page, `#fld-item-${tileCard}-rate`, '150');
  await expectText(page, v, `item-${tileCard}-check`, 'Within the band at Basic: Rs. 50.35–164.78 a sq ft.', 'the floor tiles\' rate within the band');
  await page.getByTestId('add-item').click();
  const door = billLines + 1;
  await leave(page, `#fld-item-${door}-description`, 'Door');
  await expectText(page, v, `item-${door}-check`, 'Not matched to the library: pick what it is to compare its rate.', 'a line typed by hand that fits more than one family');
  await page.selectOption(`#fld-item-${door}-pick`, 'main-door');
  await page.selectOption(`#fld-item-${door}-unit`, 'nos');
  await leave(page, `#fld-item-${door}-rate`, '30,000');
  await expectText(page, v, `item-${door}-check`, 'Taken as Main door. Within the band at Basic: Rs. 5,830.85–32,323.42 each.', 'the door picked and compared');
  await expectText(page, v, 'pl-summary', 'Repair or renovate · Flat · Pune · 1,000 sq ft · 2 BHK · Basic', 'the six answers after the bill is taken in');
  await layout(page, v, 'the quotation against the library, 390 px');

  // An item of one's own makes the section Mixed; a brand chip names it; the slider moves the whole section again.
  await page.getByTestId('pl-choices-1').locator('label', { hasText: 'Kota stone' }).click();
  await expectText(page, v, 'pl-level-flooring', 'Mixed (1 chosen)', 'an item of one\'s own');
  const slider = page.locator('#fld-slider-flooring');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expectText(page, v, 'pl-level-flooring', 'Luxury', 'the slider moved three stops');
  await expectText(page, v, page.getByTestId('pl-over-flooring'), /^Rs\. [\d,]+ more than Basic$/, 'the change from the package');
  await expectText(page, v, 'pl-what-changed', /^Flooring to Luxury: Rs\. [\d,]+ more · /, 'what the slider changed, in the bar at the bottom');
  await page.getByTestId('pl-strip-3').click();
  await expectText(page, v, 'pl-level-flooring', 'Premium', 'the strip switches the package and every slider with it');
  if ((await page.getByTestId('pl-strip-3').getAttribute('aria-pressed')) !== 'true') v('the strip does not mark the package chosen on it');
  await expectText(page, v, 'pl-what-changed', /^Every section to Premium: Rs\. [\d,]+ more/, 'what the new package changed');
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
  if (compared < 40 || marked !== 1 || !((await page.locator('[data-testid="pl-compare-total"] td').nth(2).getAttribute('aria-label')) ?? '').startsWith('Total, Premium: Rs. '))
    v(`Compare shows ${compared} amounts with ${marked} total marked`);
  await layout(page, v, 'Compare open, 390 px');
  // The rooms (A8): closed until opened; a size of one's own in feet, and a bathroom at its own level (A4).
  if (await page.getByTestId('pl-rooms').evaluate((d) => d.open)) v('the rooms are open on load');
  await page.getByTestId('pl-rooms').locator(':scope > summary').click();
  // R1: the bar of shares and four size buttons on each room. A word moves the room's share along its range, the other
  // rooms share what is left, and What changed names the knock-on; the arrow keys move along the buttons.
  await expectText(page, v, 'pl-share-living', /^Living and dining ?28%$/, 'the living room\'s share of the carpet area');
  await expectText(page, v, 'pl-share-walls', /^Inside walls ?5%$/, 'the inside walls\' share');
  if (!(await page.isChecked('#fld-roomword-living-medium'))) v('the living room is not Medium on load');
  await page.locator('label[for="fld-roomword-living-spacious"]').click();
  await expectText(page, v, 'pl-what-changed', /^Living and dining to Spacious: the other rooms 3\.2% smaller · Rs\. [\d,]+ (more|less)/, 'what the word changed, and its knock-on');
  await expectText(page, v, 'pl-room-size-living', /· 302 sq ft$/, 'the living room made Spacious');
  await expectText(page, v, 'pl-share-living', /^Living and dining ?30%$/, 'the bar after the word');
  await page.focus('#fld-roomword-kitchen-medium');
  await page.keyboard.press('ArrowRight');
  await expectText(page, v, 'pl-what-changed', /^Kitchen to Above medium: the other rooms [\d.]+% smaller · /, 'a word moved by the arrow keys');
  if (!(await page.isChecked('#fld-roomword-kitchen-above'))) v('the arrow key did not check Above medium');
  // A size typed and a level of its own sit behind one line under each room's buttons, closed until one is set.
  if (await page.getByTestId('pl-room-more-living').evaluate((d) => d.open)) v('a room\'s own size and level are open with nothing set');
  await page.getByTestId('pl-room-more-living').locator('summary').click();
  await leave(page, '#fld-room-living-l', '16');
  await expectText(page, v, 'pl-room-bad-living', 'One side is missing. Type both sides. Until then the planned size is used.', 'one side of a room typed');
  await leave(page, '#fld-room-living-b', '20');
  await expectText(page, v, 'pl-room-size-living', '20 × 16 ft · 320 sq ft · your size', 'the living room at its own size');
  await expectText(page, v, 'pl-what-changed', /^Living and dining to 16 × 20 ft: Rs\. [\d,]+ (more|less)$/, 'what the size changed');
  if (await page.locator('[name="fld-roomword-living"]:checked').count()) v('a size typed leaves a size word checked');
  await expectText(page, v, 'pl-rooms-note', /^With your sizes the rooms and the passage come to [\d,]+ sq ft/, 'the rooms against the carpet area');
  await page.getByTestId('pl-room-more-bath-1').locator('summary').click();
  await page.selectOption('#fld-roomlevel-bath-1', '4');
  await expectText(page, v, 'pl-level-bathrooms', 'Mixed (1 room at its own level)', 'a bathroom at its own level');
  await expectText(page, v, 'pl-what-changed', /^Bathroom 1 \(attached\) at Luxury: Rs\. [\d,]+ more · /, 'what the room\'s level changed');
  await layout(page, v, 'the rooms open, 390 px');
  // A word on a room of one's own size puts the size aside: the planned size at that word, the others sharing what is left.
  await page.locator('label[for="fld-roomword-living-medium"]').click();
  await expectText(page, v, 'pl-what-changed', /^Living and dining to Medium, in place of your size: the other rooms 3\.3% larger · Rs\. [\d,]+ (more|less)/, 'a word in place of a typed size');
  await expectText(page, v, 'pl-room-size-living', /· 2\d\d sq ft$/, 'the living room planned again');
  // R2: rooms by buttons. A bathroom attached to the second bedroom, one added and taken out again (the other rooms
  // sharing what is left), the balcony taken out and put back, a bedroom added and taken out: back to the plan's 2 BHK.
  await page.locator('label[for="fld-attached-bedroom-2"]').click();
  await expectText(page, v, 'pl-what-changed', /^Bathroom 2 attached to Bedroom 2: (Rs\. [\d,]+ (more|less)|no change in the total)/, 'a bathroom attached to a bedroom');
  await expectText(page, v, page.getByTestId('pl-room-bath-2').locator('h3'), 'Bathroom 2 (attached to Bedroom 2)', 'the bathroom named for its bedroom');
  await page.getByTestId('pl-room-add-bath').click();
  await expectText(page, v, 'pl-what-changed', /^A bathroom added: the other rooms [\d.]+% smaller · Rs\. [\d,]+ (more|less)/, 'a bathroom added, the others sharing what is left');
  await page.getByTestId('pl-room-out-bath-3').click();
  await expectText(page, v, 'pl-what-changed', /^Bathroom 3 taken out: the other rooms [\d.]+% larger · Rs\. [\d,]+ (more|less)/, 'a bathroom taken out');
  await page.locator('label[for="fld-attached-bedroom-2"]').click();
  await expectText(page, v, 'pl-what-changed', /^Bedroom 2's bathroom made common: /, 'the bathroom made common again');
  await page.getByTestId('pl-room-out-balcony').click();
  await expectText(page, v, 'pl-what-changed', /^The balcony taken out: Rs\. [\d,]+ less/, 'the balcony taken out');
  await page.getByTestId('pl-room-add-balcony').click();
  await expectText(page, v, 'pl-what-changed', /^The balcony put back: Rs\. [\d,]+ more/, 'the balcony put back');
  await page.getByTestId('pl-room-add-bedroom').click();
  await expectText(page, v, 'pl-what-changed', /^A bedroom added, now 3 BHK: Rs\. [\d,]+ more/, 'a bedroom added');
  await expectText(page, v, 'pl-summary', /· 3 BHK ·/, 'the bedrooms answer follows the rooms');
  await page.getByTestId('pl-room-out-bedroom-3').click();
  await expectText(page, v, 'pl-what-changed', /^Bedroom 3 taken out, now 2 BHK: Rs\. [\d,]+ less/, 'a bedroom taken out');
  await layout(page, v, 'the rooms by buttons, 390 px');
  // Interiors: ten sections on, with Appliances, Smart home, Furniture and Soft furnishings, the movable items apart (D-UX-19).
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('#fld-work-interiors');
  await page.getByTestId('pl-sheet-done').click();
  const onI = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  const movable = await Promise.all(['appliances', 'smart', 'furniture', 'furnishings'].map((x) => page.isChecked(`#fld-on-${x}`)));
  if (onI !== 10 || movable.includes(false)) v(`interiors show ${onI} sections on, Appliances, Smart home, Furniture and Soft furnishings ${movable.join('/')}`);
  await expectText(page, v, 'pl-split', /^Fixed works Rs\. [\d,]+ · Movable items Rs\. [\d,]+ · Equipment Rs\. [\d,]+$/, 'the movable items apart');
  await layout(page, v, 'the estimate as interiors, 390 px');
  // A new house (A3, D-UX-23): the second question asks the floors and the area is the built-up area, still six
  // questions; eighteen sections with thirteen on (E5: Outside works and Water), the structure the same at every level;
  // the PDF titled for construction, with its stages.
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('#fld-work-build');
  const asked = await page.locator('#six-questions [data-question]').count(), floorsAsked = await page.locator('#fld-floors-2').count();
  if (asked !== 6 || floorsAsked !== 1 || (await page.locator('#fld-home-flat').count())) v(`a new house asks ${asked} questions (want 6), the floors ${floorsAsked ? '' : 'not '}among them`);
  await page.check('#fld-floors-2');
  await leave(page, '#fld-carpet', '2,000');
  await page.check('#fld-bhk-3');
  await page.getByTestId('pl-sheet-done').click();
  await expectText(page, v, 'pl-summary', /^Build a new house · G\+1 · Pune · 2,000 sq ft · 3 BHK · \w+$/, 'a new house, folded');
  const cardsB = await page.locator('[data-testid^="pl-card-"]').count(), onB = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  if (cardsB !== 18 || onB !== 13) v(`a new house shows ${cardsB} sections with ${onB} on (want 18 and 13)`);
  if (!((await page.getByTestId('pl-card-structure').textContent()) ?? '').includes('The same at every level')) v('the structure is not the same at every level');
  if (!((await page.locator('#pl-result').textContent()) ?? '').includes('a sq ft of built-up area')) v('a new house\'s cost a sq ft is not of the built-up area');
  const pdfB = await pdfPages((await save('pl-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pdfB[0].includes('Estimate of cost of construction') || !pdfB[0].includes('Built-up area 2,000 sq ft')) v(`a new house's PDF reads "${pdfB[0].slice(0, 160)}"`);
  if (!pdfB.join(' ').includes('Stages of construction')) v('a new house\'s PDF has no stages');
  // E5: the stages for a construction loan, closed under the strip, adding up to the total; the plot changed in the
  // assumptions, and the sewer in place of the septic tank, each read in What changed.
  if (await page.getByTestId('pl-stages').evaluate((d) => d.open)) v('the stages are open on load');
  await page.getByTestId('pl-stages').locator('summary').click();
  const stageRows = await page.locator('[data-testid^="pl-stage-"]').count();
  if (stageRows !== 6) v(`a G+1 house shows ${stageRows} stages (want 6)`);
  const cells = async (id) => (await page.getByTestId(id).locator('th, td').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const slab2 = await cells('pl-stage-slab-2'), last = await cells('pl-stage-outside');
  if (!slab2[0].startsWith('First floor roof slab') || !/^[\d,]+$/.test(slab2[1]) || !/^\d+\.\d%$/.test(slab2[2]) || !/^\d+\.\d%$/.test(slab2[3])) v(`the second slab's stage reads ${slab2.join(' | ')}`);
  if (!last[0].startsWith('Outside works and water') || last[3] !== '100.0%') v(`the last stage reads ${last.join(' | ')} (want the outside works and water, 100.0% by then)`);
  await tap(page, 'pl-assumed');
  await page.getByTestId('pl-plot-change').click();
  await leave(page, '#fld-plot-l', '40');
  await leave(page, '#fld-plot-b', '30');
  await expectText(page, v, 'pl-what-changed', /^The plot to 40 × 30 ft: Rs\. [\d,]+ less$/, 'what the plot changed');
  await expectText(page, v, page.locator('[data-testid^="pl-assumed-"]', { hasText: 'The plot:' }), /^The plot: 40 × 30 ft, 1,200 sq ft, your size/, 'the plot of your own');
  await page.check('#fld-sewer');
  // The septic tank's 84,680 out (tests/architect.test.ts); Pune's own sewer charge is still to be found, so it is said.
  await expectText(page, v, 'pl-what-changed', /^The sewer in place of a septic tank: Rs\. 84,680 less; the sewer connection is still to be priced$/, 'what the sewer changed');
  await layout(page, v, 'the estimate as a new house, 390 px');
  // E5b: a floor added on the house: the second question asks the floors being added, still six questions; seventeen
  // sections with twelve on (no outside works); the PDF titled for an extension, its stages from the old terrace taken
  // up to the overhead tank; no plot and no sewer to change.
  await page.getByTestId('pl-edit').click(); await page.waitForSelector('dialog[open]');
  await page.check('#fld-work-extend');
  const askedX = await page.locator('#six-questions [data-question]').count(), oneX = await page.locator('#fld-floors-1').count(), threeX = await page.locator('#fld-floors-3').count();
  if (askedX !== 6 || oneX !== 1 || threeX !== 0) v(`an extension asks ${askedX} questions (want 6), one floor ${oneX ? '' : 'not '}offered, a third ${threeX ? '' : 'not '}offered`);
  await page.check('#fld-floors-1');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('#fld-bhk-2');
  await page.getByTestId('pl-sheet-done').click();
  await expectText(page, v, 'pl-summary', /^Add a floor or rooms · One floor added · Pune · 1,000 sq ft · 2 BHK · \w+$/, 'an extension, folded');
  const cardsX = await page.locator('[data-testid^="pl-card-"]').count(), onX = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  if (cardsX !== 17 || onX !== 12) v(`an extension shows ${cardsX} sections with ${onX} on (want 17 and 12)`);
  const pdfX = await pdfPages((await save('pl-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pdfX[0].includes('Estimate of cost of an extension') || !pdfX.join(' ').includes('Stages of construction')) v(`an extension's PDF reads "${pdfX[0].slice(0, 160)}"`);
  const stagesX = await page.locator('[data-testid^="pl-stage-"]').count(), firstX = await cells('pl-stage-terrace'), lastX = await cells('pl-stage-water');
  if (stagesX !== 5 || !firstX[0]?.startsWith('Old terrace taken up') || !lastX[0]?.startsWith('Overhead tank') || lastX[3] !== '100.0%') v(`an extension shows ${stagesX} stages (want 5), the first ${firstX.join(' | ')}, the last ${lastX.join(' | ')}`);
  if (await page.locator('#fld-sewer').count() || await page.getByTestId('pl-plot-change').count()) v('an extension offers the sewer or the plot');
  await layout(page, v, 'the estimate as an extension, 390 px');
  await ctx.close();
}

// V1 (D-UX-32): short by default. Before any tap, the words shown with the answer stay within a budget of 400 for a flat's
// interiors and a new G+1 house (before V1, about 810 and 1,360); only the flags that can change the decision show, and
// no field but the document's own facts. T1 (D-UX-34): a line's and a section's Why?, closed, drawn only once its section is
// opened, so none before any tap: what it is, why it costs what it does, what to check, with sources still as reported.
if (touched('/estimate/')) {
  const BUDGET = 400;
  const cases = [
    ['a 2 BHK flat\'s interiors', async (page) => {
      await page.check('#fld-work-interiors'); await page.check('#fld-home-flat');
      await page.selectOption('#fld-city', 'pune'); await leave(page, '#fld-carpet', '1,000');
      await page.check('#fld-bhk-2'); await page.click('#fld-level-2');
    }, 1, { cards: ['wardrobes', 'walls'], line: 'pl-why-bedroom-1:wardrobe:wardrobe', section: ['pl-why-section-walls', 'Save here'] }],
    ['a new G+1 house at Luxury', async (page) => {
      await page.check('#fld-work-build'); await page.check('#fld-floors-2');
      await page.selectOption('#fld-city', 'pune'); await leave(page, '#fld-carpet', '2,000');
      await page.check('#fld-bhk-3'); await page.click('#fld-level-4');
    }, 0, { cards: ['structure'], line: 'pl-why-flat:steel:struct:steel', own: true, section: ['pl-why-section-structure', 'Spend here'] }],
  ];
  for (const [label, answer, flags, why] of cases) {
    const { ctx, page, v } = await open('/estimate/', { scheme: 'light' });
    await answer(page);
    await expectText(page, v, 'pl-total', /^Rs\. [\d,]+\.\d+ (lakh|crore)$/, label);
    await expectText(page, v, 'pl-range', /^At (Standard|Luxury)( as a package)?: the cheapest choice in each item to the dearest; /, `${label}: the level's range`);
    const words = await page.locator('main').evaluate((m) => (m.innerText.match(/\S+/g) ?? []).length);
    if (words > BUDGET) v(`${label}: ${words} words shown with the answer (budget ${BUDGET})`);
    const shown = await page.locator('[data-testid="pl-flags"] li').count();
    if (shown !== flags) v(`${label}: ${shown} flags with the answer (want ${flags})`);
    const fields = await page.locator('main').evaluate((m) => [...m.querySelectorAll('input, select, textarea')].filter((e) => e.checkVisibility() && !e.closest('#pl-download')).length);
    if (fields) v(`${label}: ${fields} fields shown with the answer besides the document's facts`);
    console.log(`V1: ${label}: ${words} words shown with the answer (budget ${BUDGET})`);
    const whys = await page.locator('[data-testid^="pl-why-"]').count();
    if (whys) v(`${label}: ${whys} Why? shown before any tap (want none)`);
    for (const c of why.cards) await tap(page, `pl-card-${c}`);
    // textContent runs the paragraphs together ("…wardrobeWhat it is: …"); on screen each is a line of its own.
    const reported = `Sources: .+${why.own ? '; and our own rule' : ''}\\. (Needs review: as reported, not yet confirmed at its page|Verified at (its page|their pages))\\.$`;
    for (const [id, want] of [[why.line, new RegExp(`^ⓘ Why\\? .+What it is: .+Why it costs what it does: .+What to check: .+${reported}`)],
      [why.section[0], new RegExp(`^ⓘ Why\\? .+Where to spend, where to save${why.section[1]}: .+${reported}`)]]) {
      if (await page.getByTestId(id).evaluate((d) => d.open, null, { timeout: 3000 }).catch(() => true)) v(`${label}: ${id} missing, or open before a tap`);
      await tap(page, id).catch(() => {});
      await expectText(page, v, id, want, `${label}: T1's Why?`);
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
  await page.check('#fld-kind-construction');
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
  await leave(page, '#fld-basis', 'Contractor’s quotation of 25-09-2026');
  await page.check('#fld-gst-add');
  await leave(page, '#fld-gstPct', '18');
  await expectText(page, v, 'est-status', '1 question left', 'the estimate before contingency');
  await page.check('#fld-contingency-none');
  await expectText(page, v, 'est-status', 'All questions answered', 'the estimate');
  for (const [id, want] of [['est-works', '2,81,750'], ['est-gst', '50,715'], ['est-total', '3,32,465'], ['est-per-sqft', 'Rs. 277'], ['item-2-amount', 'Rs. 2,66,000']])
    await expectText(page, v, id, want, 'the estimate');
  await layout(page, v, 'the estimate filled, 390 px');
  await expectText(page, v, 'est-doc-status', '2 questions left, for the document', 'the estimate before its facts');
  await leave(page, '#fld-est-borrower', 'Asha Traders');
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
// The inputs on the default path, radios included: 35 until REP3 (D-UX-112), when the page opened in simple mode: the mode
// (2), who the borrower is (3), building and machinery, the scheme (3), the loan, its rate and its years, what backs it (3),
// one product's line (3), when selling starts, the variable costs' share, the fixed costs a month and the limit (3), 25 in
// all; 26 from OR5 (D-UX-174), with the holiday before the first instalment beside the repayment period after it; 27 from
// OR6 (D-UX-203), with what the product line is sold by, a pick counted as a field; 28 from OR7 (D-UX-206), what backs it
// gaining a fourth radio, property for part and CGTMSE for the rest (a choice, not a question); 33 from D-UX-216, the report's
// first page (the business's name, what it does, its address, the lender, who prepared it) among the questions, before the
// check, out of the download; 31 from UXR5b (S12, D-UX-240), the mode's two radios moving under More options. Expert mode asks
// every figure (61 with one product line, the stepped way among the four ways to repay).
const REP_DEFAULT = 31;
const REP_FIELDS = 'main input:not(#download input):not(#benchmarks input):not(#more-options input), main select:not(#download select):not(#benchmarks select):not(#more-options select)';
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
  if (!(await page.isChecked('#fld-mode-simple'))) v('the project report opens in expert mode');
  const fields = await page.locator(REP_FIELDS).count();
  if (fields !== REP_DEFAULT) v(`the project report asks ${fields} fields by default; it was ${REP_DEFAULT} (D-UX-49, D-UX-112)`);
  if (!(await page.locator('#more-options #fld-mode-simple').count())) v('S12: the choice of how much to ask is not under More options');
  await page.check('#fld-borrower-firm');
  await openMore(page); await page.check('#fld-mode-expert');
  await page.check('#fld-salesBy-typed');
  for (const [id, value] of [['#fld-cost-building', '10 L'], ['#fld-cost-machinery', '20 L'], ['#fld-cost-furniture', '2 L'], ['#fld-cost-preliminary', '1 L'],
    ['#fld-tl-amount', '25 L'], ['#fld-tl-rate', '10'], ['#fld-tl-disbursed', '2026-04'], ['#fld-tl-moratorium', '0'], ['#fld-tl-instalments', '60'], ['#fld-monthsToStart', '0'],
    ['#fld-sales', '1.2 Cr'], ['#fld-salesGrowth', '10'], ['#fld-variablePct', '65'], ['#fld-fixed', '18 L'], ['#fld-fixedGrowth', '5'], ['#fld-wcLimit', '5 L'], ['#fld-wcRate', '11']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-status', '1 question left', 'the report before the repayment');
  await page.check('#fld-tl-repayment-monthly');
  await expectText(page, v, 'rep-status', '3 questions left, for the document', 'the report, before its facts (UXR3, S4)');
  // The first page's questions stand among the others (the owner, 26-10-2026: three left that could not be seen): the
  // status names them, and "answer it" lands on the first, before the check as after it.
  await expectText(page, v, 'rep-doc-left', 'The business’s nameWhat the business doesThe business’s address', 'the questions left, named');
  await expectText(page, v, 'rep-status-go', 'answer it', 'the status link before the check');
  await page.getByTestId('rep-status-go').click();
  if (await page.evaluate(() => document.activeElement?.id) !== 'fld-rep-name') v('"answer it" does not land on the business\'s name (the owner, 26-10-2026)');
  await expectText(page, v, 'rep-key-0', 'Rs. 37,86,301', 'the cost of the project');
  // Before the check (OR8, the owner's O13): what was collected and the benchmarks, the owner's line; no table, no download.
  if (await page.getByTestId('rep-pl').count() || await page.getByTestId('rep-download-pdf').count()) v('the report shows its tables or downloads before its check (OR8)');
  await expectText(page, v, 'rep-doc-wait', 'A PDF, an Excel copy and a Word copy, once you have checked your figures above.', 'the download before the check');
  await expectText(page, v, 'rep-confirm-cost', /Total cost of the projectRs\. 37,86,301$/, 'the check: the cost of the project');
  await expectText(page, v, 'rep-confirm-sales', /Sales in a full first yearRs\. 1,20,00,000Sales: growth a year10%$/, 'the check: the sales as typed');
  await expectText(page, v, 'rep-confirm-document', /Business’s nameNot given yet/, 'the check: the first page, not given yet');
  await expectText(page, v, 'rep-confirm-benchmarks', /These are standard; a bank’s credit manager, a CA or a DSA may change them\.RatioTarget.*Average DSCR1\.50 or more/, 'the check: the benchmarks, a table');
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
  await expectText(page, v, 'rep-check-dscrLowest', /^Lowest DSCR ?2\.51 ?in 2026-27 ?Meets · target 1\.25 or more$/, 'the lowest DSCR against its level, on its key figure');
  if (await page.getByTestId('rep-checks').getByText('DSCR in the lowest year').count() > await page.locator('#benchmarks').getByText('DSCR in the lowest year').count()) v('the lowest DSCR is shown twice: on its key figure and as a bar (review finding 9)');
  // Every benchmark box holds its default (OR4, O10); a changed one is tinted, tagged, and says its default with a reset.
  await page.locator('#benchmarks').evaluate((d) => d.open = true);
  await expectValue(page, v, '#fld-bm-dscrLowest', '1.25', 'the lowest DSCR\'s benchmark box filled with its default');
  await leave(page, '#fld-bm-dscrLowest', '1.5');
  if (await page.locator('#fld-bm-dscrLowest[data-changed="own"]').count() !== 1) v('a changed benchmark box is not marked changed (OR4)');
  await expectText(page, v, 'fld-bm-dscrLowest-default', 'Default 1.25. Reset DSCR in the lowest year to the default', 'a changed benchmark says its default');
  await page.getByTestId('fld-bm-dscrLowest-reset').click();
  await expectValue(page, v, '#fld-bm-dscrLowest', '1.25', 'Reset puts the default back');
  if (await page.locator('#fld-bm-dscrLowest[data-changed]').count() || await page.getByTestId('rep-benchmarks-reset').count()) v('a reset benchmark still reads as changed (OR4)');
  await page.locator('#benchmarks').evaluate((d) => d.open = false);
  await expectText(page, v, 'rep-check-securityCover', /Meets: [0-9.]+ in 20[0-9-]+ on the project’s own assets/, 'the security cover before the collateral, on the own assets');
  if (await page.getByTestId('rep-collateral-note').count()) v('the security cover met on the own assets still asks for the collateral (UX5b)');
  await page.getByTestId('rep-viable').click();
  // If the answer is missing, say what is there (the intermittent miss on CI, UX6: a reset after paint undid the tap).
  const there = async () => (await Promise.all(['rep-viable', 'rep-viable-box', 'rep-plan'].map(async (id) => `${id} ${await page.getByTestId(id).count()}`))).join(', ');
  await expectText(page, (m) => there().then((t) => v(`${m} (${t})`)), 'rep-text-sales', /^To Rs\. 82,20,000 in 2026-27/, 'how far sales can fall');
  await expectText(page, v, 'rep-move-sales', '31.5%', 'how far sales can fall, its figure');
  // The plan (MV3, D-UX-52) on case R at 70 lakh (tests/plan.test.ts by hand): without the promoters' most, sales alone,
  // 17.3% higher; with 12 lakh, the limit, the term loan, then sales 14.3% higher. A slider changes no figure above;
  // "Use this plan" writes the plan's, marked, and Undo puts them back.
  await leave(page, '#fld-sales', '70 L');
  await page.getByTestId('rep-viable').click();
  await expectText(page, v, 'rep-plan-steps', 'Sales of Rs. 82,11,000 in a full first year (now Rs. 70,00,000), 17.3% higher.', 'the plan without the promoters\' most');
  await leave(page, '#fld-promotersMost', '12 L');
  await expectText(page, v, 'rep-plan-steps', /^A working-capital limit of Rs\. 3,80,877 \(now Rs\. 5,00,000\)\.A term loan of Rs\. 23,76,740 .*Sales of Rs\. 80,01,000 in a full first year/, 'the plan with the promoters\' most');
  await expectText(page, v, 'rep-plan-promoters', 'The promoters bring Rs. 11,99,999 in all (now Rs. 8,75,342), within the Rs. 12,00,000 they can.', 'the promoters within their most');
  await expectText(page, v, 'rep-plan-line', 'With these changes: Meets every benchmark', 'the plan\'s verdict');
  await page.focus('#rep-slider-sales');
  await page.keyboard.press('ArrowLeft');
  await expectText(page, v, 'rep-move-sales', '+14.2%', 'the sales slider a step back');
  await expectText(page, v, 'rep-plan-line', 'With these changes: Misses 1: DSCR in the lowest year', 'the verdict at the sliders');
  await expectText(page, v, 'rep-check-dscrLowest', /^Lowest DSCR.*Misses · target/, 'the key figures above as typed');
  if (await page.inputValue('#fld-sales') !== '70,00,000') v('a slider changed a typed figure');
  if (!(await page.getByTestId('rep-plan-rest').count())) v('the plan: no "Work out the rest" after a slider moved');
  await page.getByTestId('rep-plan-back').click();
  await expectText(page, v, 'rep-move-sales', '+14.3%', 'back to the engine\'s plan');
  await page.getByTestId('rep-plan-use').click();
  await expectText(page, v, 'rep-used', /Term loan: 25,00,000 → 23,76,740.*Working-capital limit: 5,00,000 → 3,80,877.*Sales: 70,00,000 → 80,01,000/, 'the plan used');
  // The figures changed since the check: it asks again; the tables stay, the downloads wait (OR8).
  await expectText(page, v, 'rep-confirm-lapsed', 'Your figures changed since you checked them: check them again.', 'the check after the plan is used');
  if (!(await page.getByTestId('rep-pl').count()) || await page.getByTestId('rep-download-pdf').count()) v('after a change the tables went, or the downloads stayed (OR8)');
  await expectText(page, v, page.locator('#fld-tl-amount-hint'), 'Changed by the plan; it was 25,00,000.', 'a field the plan changed, marked');
  if (await page.inputValue('#fld-wcLimit') !== '3,80,877') v('"Use this plan" did not write the limit');
  if (await page.getByTestId('rep-misses').count()) v('the plan used still misses a level');
  await page.getByTestId('rep-undo').click();
  if ([await page.inputValue('#fld-tl-amount'), await page.inputValue('#fld-sales')].join() !== '25,00,000,70,00,000') v('Undo did not put the figures back');
  await leave(page, '#fld-sales', '1.2 Cr');
  // The collateral, in expert mode: 3 lakh with a 20 lakh limit misses the security cover (Rs. 4,36,226 needed).
  await leave(page, '#fld-wcLimit', '20 L');
  await leave(page, '#fld-collateral', '3 L');
  await expectText(page, v, 'rep-check-securityCover', /Misses: 1\.17 in 2026-27/, 'the security cover with the collateral');
  await page.getByTestId('rep-viable').click();
  await expectText(page, v, 'rep-text-collateral', /^Collateral with a market value of Rs\. 4,36,226 \(now Rs\. 3,00,000\)/, 'the collateral that meets');
  await expectText(page, v, 'rep-plan-steps', 'Collateral with a market value of Rs. 4,36,226 (now Rs. 3,00,000).', 'the plan: the collateral last');
  await layout(page, v, 'make it viable, 390 px');
  await leave(page, '#fld-collateral', '');
  await leave(page, '#fld-wcLimit', '5 L');
  await confirmReport(page, v, 'case R, checked again');
  await layout(page, v, 'the report filled, 390 px');
  await expectText(page, v, 'rep-doc-status', '3 questions left, for the document', 'the report before its facts');
  await leave(page, '#fld-rep-name', 'Asha Packaging');
  await leave(page, '#fld-rep-activity', 'Manufacture of corrugated boxes');
  await leave(page, '#fld-rep-address', 'Plot 4, Example MIDC, Pune');
  await expectText(page, v, 'rep-doc-status', 'All questions answered', 'the report with its facts');
  const save = saver(page, v);
  if (await page.getByTestId('rep-print').count() !== 1) v('UXR5 (P10): the report has no Print beside its downloads');
  const pdf = await save('rep-download-pdf');
  if (pdf.name !== 'Project report - Asha Packaging.pdf') v(`the report PDF is named "${pdf.name}"`);
  const pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pages[0].includes('Total cost of the project 37,86,301') || !pages.join('\n').includes('Total assets 55,81,804')) v('the report PDF does not read back its cost and its balance sheet');
  const book = await workbook((await save('rep-download-xlsx')).bytes).catch((e) => v(`the report's Excel copy is not read: ${e.message}`)) ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'Summary|Projections|DSCR and ratios|Annex') v(`the report's Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))}`);
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
  for (const [id, t] of Object.entries(reply.notes)) await leave(page, `#fld-rep-note-${id}`, t);
  await page.getByTestId('rep-words-draft').click();
  await expectText(page, v, 'rep-words-error', 'Drafting the words is not switched on yet: write them yourself.', 'the words while drafting is off');
  await expectText(page, v, 'rep-words-by', 'Your own words: a box left empty stays out.', 'the boxes to write in');
  let asked;
  await page.unroute('**/api/draft');
  await page.route('**/api/draft', (r) => { asked = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ draft: reply.draft }) }); });
  await page.getByTestId('rep-words-draft').click();
  await expectText(page, v, 'rep-words-dropped', /^2 sentences were left out: ?“Asha Packaging is a reputed name/, 'the words: two sentences dropped');
  if (asked?.name !== 'Asha Packaging' || asked?.notes?.market !== reply.notes.market || /lakh|Rs\.|\d,\d/.test(JSON.stringify(asked))) v(`the words were drafted from ${JSON.stringify(asked).slice(0, 160)}`);
  await expectText(page, v, 'rep-doc-status', '1 question left, for the document', 'the words drafted, not yet ticked');
  await page.check('#fld-rep-words-true');
  await expectText(page, v, 'rep-doc-status', 'All questions answered', 'the words ticked');
  await layout(page, v, 'the report’s words, 390 px');
  const worded = (await pdfPages((await save('rep-download-pdf')).bytes).catch((e) => [`(not read: ${e.message})`])).join('\n').replace(/\s+/g, ' ');
  if (!worded.includes('About the project') || !worded.includes('It is in talks with 3 buyers.') || /reputed|lakh/.test(worded)) v(`the report PDF holds its words as ${worded.slice(worded.indexOf('About'), 200)}`);
  const wordedDocx = await docxLines((await save('rep-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (wordedDocx.messages.length || !wordedDocx.lines.includes('About the project') || !wordedDocx.lines.includes('The promoter')) v(`the report's Word copy lacks its words ${JSON.stringify(wordedDocx.messages).slice(0, 120)}`);
  // UXR5 (LOOP1d, D-UX-233): all answered, "See the answer" folds the questions: on a phone to "Edit answers" and a sheet
  // that holds them; from 1024 px to a rail of the answers as the check reads them, which opens in place. On a phone it is
  // the answer bar's arrow (OR11a), shown once the answer is out of view.
  if (await page.getByTestId('rep-fold').isVisible()) v('OR11a: the button "See the answer" shows on a phone, beside the bar\'s arrow');
  await page.evaluate(() => scrollTo(0, 0));
  if (!(await page.getByTestId('rep-answer-bar-see').isVisible())) v('UXR5: no "See the answer" on a report all answered');
  else {
    await page.getByTestId('rep-answer-bar-see').click();
    if (await page.locator('#fld-rep-name').count()) v('UXR5: "See the answer" leaves the report\'s questions unfolded');
    await page.getByTestId('rep-edit').click();
    await page.locator('dialog[open] #fld-rep-name').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#fld-rep-name').waitFor({ state: 'detached', timeout: 5000 }).catch(() => v('UXR5: Esc leaves the report\'s sheet open'));
    await page.setViewportSize({ width: 1280, height: 900 });
    await expectText(page, v, 'rep-rail', /Total cost of the projectRs\. 37,86,301/, 'UXR5, the report\'s rail at 1280 px');
    // The owner (D-UX-237): what the rail shows, the check beside it does not repeat; its benchmarks stay.
    if (await page.locator('details#check').count()) await page.locator('details#check').evaluate((d) => { d.open = true; });
    if (await page.getByTestId('rep-confirm-cost').isVisible()) v('D-UX-237: the check repeats the rail\'s answers at 1280 px');
    if (!(await page.getByTestId('rep-confirm-railed').isVisible()) || !(await page.getByTestId('rep-confirm-benchmarks').isVisible())) v('D-UX-237: the check beside the rail lacks its pointer or its benchmarks');
    await page.getByTestId('rep-rail-change').click();
    await page.locator('[data-testid="rep-rail-open"] #fld-rep-name').waitFor({ timeout: 5000 }).catch(() => v('UXR5: the report\'s rail does not open to its questions'));
    await page.getByTestId('rep-rail-done').click();
    await page.getByTestId('rep-rail').waitFor({ timeout: 5000 }).catch(() => v('UXR5: Done does not close the report\'s answers to the rail'));
  }
  await ctx.close();
}

// Case P by products (tests/report.test.ts), on the default path with PMEGP: land 2 L, building 6 L, plant 20 L,
// preliminary 50,000; 24 L sanctioned at 10% from October 2026, six months' moratorium, 48 monthly instalments; two
// lines, roasted chana 2,500 a month and roasted peanuts 1,500 a month, both at Rs. 200; sales three months after the
// loan; general category, a village, manufacturing. The margin money is 25% of PMEGP's cost of 31,23,424.66,
// Rs. 7,80,856; cash at the end of 2026-27 is 42,793. With fixed costs of 25 L, the engine's cash (checked by
// report-check.ts's own route) goes lowest in 2030-31, 49,07,813 short.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'dark' });
  await openMore(page); await page.check('#fld-mode-expert');
  await page.check('#fld-borrower-firm');
  await page.check('#fld-scheme-pmegp');
  for (const id of ['#fld-category-general', '#fld-area-rural', '#fld-activity-manufacturing', '#fld-tl-repayment-monthly', '#fld-pmegp-confirmed']) await page.check(id);
  await page.getByTestId('rep-product-add').click();
  // Sold by (OR6, D-UX-203): the second line by the kg; its count and price take the unit's words, its sums the piece's.
  await page.selectOption('#fld-product-1-unit', 'kg');
  for (const [id, want] of [['fld-product-1-units', 'How many kg a month at full running'], ['fld-product-1-price', 'Price a kg'], ['fld-product-0-price', 'Price a piece']]) {
    const said = (await page.locator(`label[for="${id}"]`).textContent())?.trim();
    if (!said?.startsWith(want)) v(`the PMEGP report's ${id} reads "${said}", want "${want}" (OR6)`);
  }
  if (await page.locator('#fld-subsidy').count()) v('the project report asks a capital subsidy beside PMEGP');
  for (const [id, value] of [['#fld-cost-land', '2 L'], ['#fld-cost-building', '6 L'], ['#fld-cost-machinery', '20 L'], ['#fld-cost-preliminary', '50,000'],
    ['#fld-tl-amount', '24 L'], ['#fld-tl-rate', '10'], ['#fld-tl-disbursed', '2026-10'], ['#fld-tl-moratorium', '6'], ['#fld-tl-instalments', '48'],
    ['#fld-product-0-name', 'Roasted chana'], ['#fld-product-0-units', '2,500'], ['#fld-product-0-price', '200'],
    ['#fld-product-1-name', 'Roasted peanuts'], ['#fld-product-1-units', '1,500'], ['#fld-product-1-price', '200'], ['#fld-monthsToStart', '3'], ['#fld-variablePct', '70'], ['#fld-fixed', '12 L'], ['#fld-fixedGrowth', '5'],
    ['#fld-wcLimit', '3 L'], ['#fld-wcRate', '11']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-status', /^\d+ questions? left, for the document$/, 'the PMEGP report');
  const tiles = await page.locator('#report dl > div').allTextContents();
  if (!tiles.some((t) => t.startsWith('PMEGP margin money') && t.includes('Rs. 7,80,856'))) v(`the PMEGP report's tiles read ${JSON.stringify(tiles).slice(0, 200)}`);
  await confirmReport(page, v, 'the PMEGP report');
  await page.getByTestId('rep-cf').evaluate((t) => t.closest('details').open = true);
  const cash = await page.getByTestId('rep-cf').locator('tr', { has: page.locator('th', { hasText: 'Cash at the end of the year' }) }).first().locator('td').allTextContents();
  if (cash[0] !== '42,793') v(`the PMEGP report's cash at the end of 2026-27 shows ${cash[0]}, want 42,793`);
  await page.getByTestId('rep-sales').evaluate((t) => t.closest('details').open = true);
  const total = await page.getByTestId('rep-sales').locator('tr', { has: page.locator('th', { hasText: 'Total sales' }) }).first().locator('td').allTextContents();
  if (total[0] !== '14,40,000') v(`the PMEGP report's sales by product total ${total[0]} in 2026-27, want 14,40,000`);
  for (const want of ['Pieces sold', 'Kg sold', 'Price a kg'])
    if (!(await page.getByTestId('rep-sales').locator('th', { hasText: want }).count())) v(`the PMEGP report's sales by product has no "${want}" row (OR6)`);
  await leave(page, '#fld-fixed', '25 L');
  // Cash running out names its first year, the amount at its lowest (OR11a2, D-UX-247); a result, said by the verdict,
  // never a question left (OR11a); the document stays provisional.
  await expectText(page, v, 'rep-short', /^Cash runs out in 2026-27: Rs\. 49,07,813 short at its lowest, in 2030-31\./, 'cash running out');
  await expectText(page, v, 'rep-misses-work', /^Does not work yet: \d+ ratios? short and cash runs out in 2026-27\./, 'OR11a2: the first year cash runs out in the verdict');
  await expectText(page, v, 'rep-status', '3 questions left, for the document', 'the report with cash running out');
  await expectText(page, v, 'rep-misses', /^Misses \d+ of \d+ benchmarks: .*DSCR/, 'the DSCR below the level');
  await page.getByTestId('rep-viable').click();
  await expectText(page, v, 'rep-short-dscrLowest', /^Short by Rs\. [\d,]+ of cash to pay the loan in 20\d\d-\d\d\.$/, 'the lowest DSCR\'s shortfall in rupees');
  await confirmReport(page, v, 'the PMEGP report with cash running out');
  await expectText(page, v, 'rep-doc-why', 'The file is marked provisional while cash runs out in 2026-27, as the answer says.', 'OR11a2: why the file is provisional');
  await expectText(page, v, 'rep-text-sales', /^Sales [\d.]+% higher in every year: Rs\. [\d,]+ in 20\d\d-\d\d instead of Rs\. [\d,]+\./, 'the sales that make it viable');
  // Sales at the use limit (41.7% higher) meet none of the six levels missed, so the plan gives them back (D-UX-178).
  await expectText(page, v, 'rep-move-sales', 'As typed', 'the plan keeps sales that meet nothing as typed');
  await expectText(page, v, 'rep-plan-steps', 'No lever moves: nothing within its limit helps.', 'the plan with no lever that helps');
  await expectText(page, v, 'rep-reach-sales', /^Out of reach at this capacity: it needs [\d.]+% of it\./, 'sales above full capacity marked out of reach');
  if (!(await page.getByTestId('rep-lever-promoters').count())) v('make it viable: no lever for a smaller loan');
  await expectText(page, v, 'rep-plan-limits', /the use of the capacity at most 85% in any year/, 'the plan\'s limits by the drivers');
  await layout(page, v, 'the PMEGP report, 390 px, dark');
  await ctx.close();
}

// Case F (OR2b, tests/fix.test.ts by hand): a building of 50 L and plant of 2.5 Cr, a 2.5 Cr loan at 9.3% over 15 years
// after a month's holiday, misses only the fixed-asset cover. "Make it viable" opens on the fix beside the miss, 10 years
// and 1,75,00,000, asks once for the promoters' 75 lakh more, and works; the repayment slider shortens to 12 instalments.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/');
  await openMore(page); await page.check('#fld-mode-expert');
  for (const id of ['#fld-borrower-proprietor', '#fld-tl-repayment-emi']) await page.check(id);
  for (const [id, value] of [['#fld-cost-building', '50 L'], ['#fld-cost-machinery', '2.5 Cr'], ['#fld-tl-amount', '2.5 Cr'], ['#fld-tl-rate', '9.3'],
    ['#fld-tl-disbursed', '2026-10'], ['#fld-tl-moratorium', '1'], ['#fld-tl-instalments', '180'], ['#fld-product-0-name', 'Widgets'], ['#fld-product-0-units', '10,000'],
    ['#fld-product-0-price', '1,500'], ['#fld-monthsToStart', '1'], ['#fld-variablePct', '60'], ['#fld-fixed', '1.2 Cr'], ['#fld-fixedGrowth', '5'], ['#fld-wcLimit', '53 L'], ['#fld-wcRate', '9.3']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-fix-0', 'Repay in 10 years instead of 15 years and borrow Rs. 1,75,00,000 instead of Rs. 2,50,00,000: the promoters bring Rs. 75,00,000 more.', 'case F\'s fix beside the miss');
  await page.getByTestId('rep-viable').click();
  await expectText(page, v, page.locator('label[for="fld-promotersMost"]'), 'This needs Rs. 75,00,000 more from the promoters: can you bring it?', 'the plan asks once for the promoters\' more');
  await expectText(page, v, 'rep-plan-steps', 'A term loan of Rs. 1,75,00,000 (now Rs. 2,50,00,000), the promoters bringing the rest.120 instalments (now 180).', 'the plan agrees with "Use this"');
  await expectText(page, v, 'rep-plan-line', 'With these changes: Meets every benchmark', 'case F made viable');
  if (await page.locator('#rep-slider-instalments').getAttribute('min') !== '-168') v('the repayment slider does not shorten to 12 instalments, where the lowest-year DSCR stops meeting');
  await leave(page, '#fld-promotersMost', '2 Cr');
  await expectText(page, v, 'rep-plan-promoters', /within the Rs\. 2,00,00,000 they can\.$/, 'the promoters within their most');
  await expectText(page, v, 'rep-plan-line', 'With these changes: Meets every benchmark', 'case F viable within the promoters\' most');
  await ctx.close();
}

// Mudra (SCH1), case M of tests/report-page.test.ts on the default path: a 12 L term loan from April 2026 and a 3 L
// limit, 15 L in all, so Tarun Plus, only once a Tarun loan is ticked as repaid. CGFMU's fee in 2026-27 by hand: 1% of
// 12,00,000 and of 3,00,000 for 12 months, 15,000. Above 20 L in all it stops. With no scheme and CGTMSE ticked, its slab
// for 15 L is 0.55%: 6,600 on the term loan and 1,650 on the limit, 8,250.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  await openMore(page);
  for (const id of ['#fld-mode-expert', '#fld-borrower-firm', '#fld-scheme-mudra', '#fld-tl-repayment-monthly']) await page.check(id);
  for (const [id, value] of [['#fld-cost-building', '10 L'], ['#fld-cost-machinery', '20 L'], ['#fld-cost-furniture', '2 L'], ['#fld-cost-preliminary', '1 L'],
    ['#fld-tl-amount', '12 L'], ['#fld-tl-rate', '10'], ['#fld-tl-disbursed', '2026-04'], ['#fld-tl-moratorium', '0'], ['#fld-tl-instalments', '60'],
    ['#fld-product-0-name', 'Boxes'], ['#fld-product-0-units', '10,000'], ['#fld-product-0-price', '100'], ['#fld-monthsToStart', '0'], ['#fld-variablePct', '65'],
    ['#fld-fixed', '18 L'], ['#fld-fixedGrowth', '5'], ['#fld-wcLimit', '3 L'], ['#fld-wcRate', '11']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-mudra-level', 'Tarun Plus: the term loan and the limit come to Rs. 15,00,000, only for a borrower who has repaid a Tarun loan.', 'Mudra\'s level');
  await expectText(page, v, 'rep-mudra-collateral', /^No collateral needed up to Rs\. 20,00,000: CGFMU .* Apply on JanSamarth\.$/, 'Mudra without collateral');
  await expectText(page, v, 'rep-needs', /Mudra: the loans come to Rs\. 15,00,000, above Tarun's/, 'Tarun Plus unticked');
  await page.check('#fld-tarun');
  await expectText(page, v, 'rep-status', /^\d+ questions? left, for the document$/, 'the Mudra report');
  await confirmReport(page, v, 'the Mudra report');
  await page.getByTestId('rep-pl').evaluate((t) => t.closest('details').open = true);
  const fee = (name) => page.getByTestId('rep-pl').locator('tr', { has: page.locator('th', { hasText: `Less: guarantee fee (${name})` }) }).first().locator('td').first();
  await expectText(page, v, fee('CGFMU'), '15,000', 'CGFMU\'s fee in 2026-27');
  if (await page.locator('#fld-collateral, #fld-cgtmse').count()) v('the Mudra report asks collateral or CGTMSE');
  if (!(await page.locator('#fld-feeRate').count())) v('the Mudra report has no box for the lender\'s own fee rate');
  await leave(page, '#fld-tl-amount', '18 L');
  await expectText(page, v, 'rep-needs', /Mudra: the term loan and the working-capital limit come to Rs\. 21,00,000, Rs\. 1,00,000 above/, 'Mudra above 20 L');
  await leave(page, '#fld-tl-amount', '12 L');
  await page.check('#fld-scheme-');
  await page.check('#fld-cgtmse');
  await expectText(page, v, fee('CGTMSE'), '8,250', 'CGTMSE\'s fee in 2026-27');
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
  const now = new Date(), sell = new Date(now.getFullYear(), now.getMonth() + 3, 1), month = `${sell.getFullYear()}-${String(sell.getMonth() + 1).padStart(2, '0')}`;
  for (const id of ['#fld-borrower-firm', '#fld-security-neither', '#fld-wcBy-worked']) await page.check(id);
  await page.getByTestId('rep-product-add').click();
  for (const [id, value] of [['#fld-cost-building', '6 L'], ['#fld-cost-machinery', '20 L'], ['#fld-tl-amount', '20 L'], ['#fld-tl-rate', '10'], ['#fld-years', '4'],
    ['#fld-product-0-name', 'Roasted chana'], ['#fld-product-0-units', '2,500'], ['#fld-product-0-price', '200'],
    ['#fld-product-1-name', 'Roasted peanuts'], ['#fld-product-1-units', '1,500'], ['#fld-product-1-price', '200'], ['#fld-sellFrom', month], ['#fld-variablePct', '70'], ['#fld-fixedMonth', '1 L']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-worked', /^Worked out: Rs\. 2,72,219\. It is the lower of .*, Rs\. 2,72,219, .*, Rs\. 11,52,000\.$/, 'the limit worked out');
  if (await page.getByTestId('rep-needs').count()) v(`simple mode still asks: ${await page.getByTestId('rep-needs').textContent()}`);
  if (await page.locator('#fld-tl-disbursed, #fld-wcRate, #fld-fixedGrowth').count()) v('simple mode shows an expert field');
  // Property for part, CGTMSE for the rest (OR7): its value asked, then the part guaranteed read back: the loans in all,
  // 20 L and the limit's 2,72,219, less the property's 5 L.
  await page.check('#fld-security-hybrid');
  await expectText(page, v, 'rep-needs', /The collateral: its market value, for the part CGTMSE does not guarantee/, 'hybrid security, the property\'s value not yet typed');
  await leave(page, '#fld-collateral', '5 L');
  await expectText(page, v, 'rep-hybrid', 'CGTMSE guarantees Rs. 17,72,219 of the loans\' Rs. 22,72,219; the property\'s Rs. 5,00,000 backs the rest, set against the term loan first. Its fee is on that part only.', 'hybrid security');
  await page.check('#fld-security-neither');
  // The holiday runs to the first sales until typed, and the period reads back in all (D-UX-174).
  if (await page.inputValue('#fld-tl-moratorium') !== '3') v(`the holiday's box reads ${await page.inputValue('#fld-tl-moratorium')}, want its default 3`);
  await expectText(page, v, 'rep-period', 'Loan period: 4 years 3 months in all: a holiday of 3 months, then 4 years of instalments. Within the 180 months lenders commonly allow a small business.', 'the loan period');
  // The ways to repay compared (OR5): the cheapest first, EMI in use; the stepped way taken stays through the switch.
  const ways = await page.locator('[data-testid^="rep-way-"]:not([data-testid^="rep-way-use-"])').evaluateAll((es) => es.map((e) => e.dataset.testid));
  if (ways.join() !== 'rep-way-monthly,rep-way-emi,rep-way-stepped') v(`the ways to repay read ${ways.join()}`);
  if (!/In use/.test(await page.getByTestId('rep-way-emi').textContent())) v('EMI is not the way in use in simple mode');
  await layout(page, v, 'the report in simple mode, 390 px');
  await page.getByTestId('rep-way-use-stepped').click();
  if (!/In use/.test(await page.getByTestId('rep-way-stepped').textContent())) v('"Use this" did not take the stepped way');
  await openMore(page); await page.check('#fld-mode-expert');
  if (!(await page.isChecked('#fld-tl-repayment-stepped'))) v('expert mode after simple does not show the stepped way taken');
  const got = await Promise.all(['#fld-tl-moratorium', '#fld-tl-instalments', '#fld-monthsToStart', '#fld-fixed'].map((id) => page.inputValue(id)));
  if (got.join('|') !== '3|48|3|12,00,000') v(`expert mode after simple reads ${got.join('|')}, want 3|48|3|12,00,000`);
  await openMore(page); await page.check('#fld-mode-simple');
  if (await page.getByTestId('rep-changed').count()) v('back in simple mode, values are listed as changed that were not');
  await ctx.close();
}

const CMA_FIELDS = 'main input:not([type="radio"]):not(#more-options input):not(#download input):not(#read input):not(#benchmarks input)';
// A choice counts as one field, whatever its options (MV4: fresh or renewal).
const cmaFields = async (page) => await page.locator(CMA_FIELDS).count() + await page.locator('main fieldset:not(#more-options fieldset):has(input[type="radio"])').count();
// Home (HOME1b, D-UX-114): each tool once, in one block with one button, which opens the tool filled with its scene's
// fictional case; each tool says so above its answers and reads as the scene does (site/src/home/story.ts, its figures
// worked by hand in tests/home-story.test.ts).
if (touched('/')) {
  const { ctx, page, v } = await open('/', { scheme: 'light' });
  const blocks = await page.locator('#tools [data-tool]').evaluateAll((els) => els.map((e) => [e.dataset.tool, [...e.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))]));
  if (blocks.map(([id]) => id).join() !== 'dscr,estimate,report,cma') v(`home shows the tool blocks ${blocks.map(([id]) => id).join(', ')}; want dscr, estimate, report, cma, each once`);
  for (const [id, hrefs] of blocks) if (hrefs.length !== 1 || !hrefs[0].endsWith('?case=home')) v(`home's ${id} block has the links ${hrefs.join(', ')}; want one, opening the tool with the case`);
  await ctx.close();
  // HOME1f (D-UX-255): on a phone each scene is one frame that fits the screen at every shot of every beat (scene.ts: the
  // beats start at 0, 1.6, 4, 7 and 9.8 s, the change's cards give way to the years at 8.6 s, and the whole is 12.8 s).
  for (const [w, h] of [[360, 640], [390, 844]]) {
    const fc = await browser.newContext({ viewport: { width: w, height: h } }), fp = await fc.newPage();
    await fp.goto(BASE + '/', { waitUntil: 'load' });
    for (const id of await fp.locator('[data-scene]').evaluateAll((els) => els.map((e) => e.dataset.scene))) {
      await fp.locator(`[data-scene="${id}"]`).evaluate((e) => e.scrollIntoView({ block: 'center' }));
      const runs = await fp.waitForFunction((id) => document.querySelector(`[data-scene="${id}"]`)?.hasAttribute('data-running'), id, { timeout: 8000 }).then(() => true, () => false);
      if (!runs) { v(`at ${w}×${h} the ${id} scene does not start when it is in view`); continue; }
      for (const m of (await fp.evaluate(sceneFrame, [id, [1450, 3850, 6850, 8450, 9650, 12790]])).slice(0, 4)) v(`at ${w}×${h}: ${m}`);
    }
    await fc.close();
  }
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
// and cash running out joins the verdict. On a phone the bar's arrow is "See the answer": it folds the questions and lands
// the answer below the top bar; the button under the questions shows from 1024 px only.
if (touched('/project-report/')) {
  const { ctx, page, v } = await open('/project-report/?case=home', { scheme: 'light' });
  await expectText(page, v, 'rep-status-go', 'check your figures before the download', 'OR11a: the check as its own step');
  await expectText(page, v, 'rep-misses-work', /^Does not work yet: \d+ ratios? short and cash runs out in 20\d\d-\d\d\./, 'OR11a: cash running out in the verdict');
  if (await page.getByTestId('rep-fold').isVisible()) v('OR11a: the button "See the answer" shows on a phone');
  await page.evaluate(() => scrollTo(0, 0));
  const see = page.getByTestId('rep-answer-bar-see');
  if ((await see.getAttribute('aria-label')) !== 'See the answer') v(`OR11a: the bar's arrow is named "${await see.getAttribute('aria-label')}", want "See the answer"`);
  await see.click();
  await page.waitForFunction(() => document.activeElement?.id === 'report-h', null, { timeout: 5000 }).catch(() => v('OR11a: the bar\'s arrow does not take the focus to the answer'));
  if (!(await page.getByTestId('rep-edit').isVisible())) v('OR11a: the bar\'s arrow leaves the questions unfolded on a phone');
  const [top, under] = await page.evaluate(() => [document.querySelector('[data-testid="rep-edit"]').getBoundingClientRect().top, document.querySelector('[data-header]').getBoundingClientRect().bottom]);
  if (top < under - 1) v(`OR11a: the answer lands under the top bar (Edit answers at ${Math.round(top)} px, the bar's foot at ${Math.round(under)} px)`);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/project-report/?case=home`, { waitUntil: 'networkidle' });
  if (!(await page.getByTestId('rep-fold').isVisible())) v('OR11a: no button "See the answer" under the questions at 1280 px');
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
  await page.locator('dialog[open] #fld-cma-existing').waitFor();
  await layout(page, v, 'the CMA\'s sheet, 390 px');
  await page.keyboard.press('Escape');
  await page.locator('#fld-cma-existing').waitFor({ state: 'detached', timeout: 5000 }).catch(() => v('UXR5: Esc leaves the CMA\'s sheet open'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectText(page, v, 'cma-rail', /^Your answersThe limitLimit you have today.*Net sales.*Balance sheet.*Balances at Rs\. [\d,]+.*More options/, 'UXR5, the CMA\'s rail at 1280 px');
  await page.getByTestId('cma-rail-change').click();
  await page.locator('[data-testid="cma-rail-open"] #fld-cma-existing').waitFor({ timeout: 5000 }).catch(() => v('UXR5: the CMA\'s rail does not open to its questions'));
  if (await page.locator('[data-testid="cma-rail-open"] [data-years-strip]').first().isVisible()) v('UXR5: the years run across in the CMA\'s open rail (want cards)');
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
  const fields = await cmaFields(page);
  if (fields !== 127) v(`the CMA page asks ${fields} fields by default; the owner's short CMA is 127 (25 heads × 5 years, the limit now, fresh or renewal)`);
  await expectText(page, v, 'cma-years', /^Years: 2023-24 \(audited\), 2024-25 \(audited\), 2025-26 \(audited\), 2026-27 \(estimate\), 2027-28 \(projection\)\./, 'the CMA years');
  await expectText(page, v, 'cma-status', '3 questions left', 'the empty CMA page');
  await page.getByTestId('cma-example').click();
  await expectText(page, v, 'cma-status', 'All questions answered', 'the CMA example');
  await expectText(page, v, 'cma-key-0', 'Rs. 1,04,00,000', 'the CMA limit');
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
  await expectText(page, v, 'cma-check-dscrAverage', /Meets: 5\.84 over 2026-27 and 2027-28/, 'case K\'s average DSCR');
  await page.getByTestId('cma-viable').click();
  await expectText(page, v, 'cma-move-sales', '8.4%', 'how far case K\'s sales can fall');
  await expectText(page, v, 'cma-text-sales', /to Rs\. 4,76,32,000 \(from Rs\. 5,20,00,000\)/, 'case K\'s sales at the edge');
  await layout(page, v, 'the CMA example, 390 px');
  await expectText(page, v, 'cma-doc-status', '1 question left, for the document', 'the CMA document before its name');
  await leave(page, '#fld-cma-name', 'K Steel Furniture Pvt Ltd');
  await expectText(page, v, 'cma-doc-status', 'All questions answered', 'the CMA document');
  const save = saver(page, v);
  const pdf = await save('cma-download-pdf');
  if (pdf.name !== 'CMA data - K Steel Furniture Pvt Ltd.pdf') v(`the CMA PDF is named "${pdf.name}"`);
  const text = (await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`])).join('\n');
  if (!text.includes('1,04,00,000') || !text.includes('2,96,80,000')) v('the CMA PDF does not read back its limit and its balance sheet');
  if (/DSCR|benchmark|viable/i.test(text)) v('the CMA PDF carries the levels or the plan (MV4 keeps them on the page)');
  const xlsx = (await save('cma-download-xlsx')).bytes;
  const book = await workbook(xlsx).catch((e) => v(`the CMA Excel copy is not read: ${e.message}`)) ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'Summary|Forms II and III|Forms IV to VI|Ratios|Check') v(`the CMA Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))}`);
  const formulas = ((await zipPart(xlsx, 'xl/worksheets/sheet5.xml')) ?? '').match(/<f>/g)?.length ?? 0;
  if (formulas !== 52) v(`the CMA Excel copy's Check sheet holds ${formulas} formulas, want 52`);
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
  for (const [h, xs] of Object.entries(M)) for (const [i, y] of ['a1', 'a2', 'a3', 'est', 'proj'].entries()) await leave(page, `#fld-cma-${y}-${h}`, `${xs[i]} L`);
  await leave(page, '#fld-cma-existing', '60 L');
  await expectText(page, v, 'cma-levels-ask', /whether the limit is fresh or enhanced, or a renewal/, 'case M before fresh or renewal');
  await page.locator('#fld-cma-case-fresh').check();
  await page.locator('#more-options').evaluate((d) => d.open = true);
  await leave(page, '#fld-cma-collateral', '0');
  await expectText(page, v, 'cma-misses', /^Misses 5 of 8 benchmarks: current ratio, total outside liabilities ÷ net worth, average DSCR, interest cover and security cover\.$/, 'case M fresh');
  await expectText(page, v, 'cma-short-currentRatio', /Short by Rs\. 5,60,000 of current assets/, 'case M\'s current ratio');
  await page.getByTestId('cma-viable').click();
  await expectText(page, v, 'cma-plan-steps', /Sales of Rs\. 2,52,48,000 in 2027-28 \(now Rs\. 2,40,00,000\), 5\.2% higher.*Collateral with a market value of Rs\. 3,11,112/, 'case M\'s plan');
  await expectText(page, v, 'cma-plan-verdict', 'With these changes it still misses one of the default benchmark ratios.', 'case M\'s plan without the promoters\' most');
  await leave(page, '#fld-cma-promotersMost', '10 L');
  await expectText(page, v, 'cma-plan-steps', /Capital of Rs\. 5,45,455 more brought in by the end of 2026-27/, 'case M\'s plan with 10 L from the promoters');
  await expectText(page, v, 'cma-plan-verdict', 'With these changes it meets every default benchmark ratio.', 'case M\'s plan with 10 L from the promoters');
  await layout(page, v, 'case M\'s plan, 390 px');
  await page.getByTestId('cma-plan-use').click();
  await expectValue(page, v, '#fld-cma-proj-sales', '2,52,48,000', 'case M\'s plan used');
  await expectValue(page, v, '#fld-cma-est-capital', '25,45,455', 'case M\'s plan used');
  const marked = await page.locator('[data-changed="plan"]').count();
  if (marked !== 12) v(`the plan used marks ${marked} cells, want 12`);
  if (await page.getByTestId('cma-misses').count()) v('case M still misses a level after its plan is used');
  await page.getByTestId('cma-undo').click();
  await expectValue(page, v, '#fld-cma-proj-sales', '2,40,00,000', 'case M\'s plan undone');
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
    await expectText(page, v, 'cma-status', '3 questions left', 'statement K read, nothing ticked');
    if (await cmaFields(page) !== 127) v('reading a statement changed the count of default fields');
    await page.getByTestId('read-a3-sales').check();
    await expectValue(page, v, '#fld-cma-a3-sales', '3,90,00,000', 'one figure ticked');
    if (await filled() !== 1) v(`one tick filled ${await filled()} cells`);
    await page.getByTestId('read-all-a3').click();
    await page.getByTestId('read-all-a2').click();
    if (await filled() !== 50) v(`confirming both years filled ${await filled()} cells, want 50`);
    await expectValue(page, v, '#fld-cma-a2-reserves', '11,20,000', 'the year before confirmed');
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
  if (await page.getByTestId('review-due').count()) v('a source is flagged due for review on 02-10-2026');
  await ctx.close();
}
if (touched('/dscr/')) {
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', at: '2027-10-01T10:00:00+05:30' });
  const due = await page.getByTestId('review-due').allTextContents();
  if (!due.includes('Due for review since 30-09-2027.')) v(`dscr.json's passed review-by date is not flagged on 01-10-2027 (seen: ${due.join(' | ') || 'none'})`);
  await ctx.close();
}

// Interaction data (UD1, D-TECH-37): the steps only, never what is typed. Case S typed on the front door, Make it work,
// a plan's round seen, More options opened, a PDF and an Excel copy, a field marked wrong, then leaving: every batch has the
// Worker's shape, holds each step, and holds none of the typed figures in any form. Built without the Worker's address
// (as now), a page sends nothing.
if (touched('/dscr/')) {
  const { check } = await import('../worker/src/event-shape.ts');
  const events = [];
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light', events });
  const typed = { '#fld-fd-profit': '4.5 L', '#fld-fd-growth': '0', '#fld-fd-amount': '12 L', '#fld-fd-rate': '12.25', '#fld-fd-years': '5' };
  await page.check('#fld-fd-borrower-firm');
  for (const [sel, x] of Object.entries(typed)) await leave(page, sel, x);
  await page.getByTestId('dscr-viable').click();
  await page.check('#dscr-own-180000');
  await page.getByTestId('dscr-plan-from-mix').click();
  await page.getByTestId('dscr-plan-use').click();
  await page.getByTestId('dscr-edit').click();
  await page.locator('dialog[open]').getByText('Use More options').click();
  await openMore(page);
  for (const kind of ['pdf', 'xlsx']) {
    const saved = page.waitForEvent('download');
    await page.getByTestId(`download-${kind}`).click();
    await saved;
  }
  await leave(page, '#fld-fd-amount', '1,23,45,678');
  await leave(page, '#fld-fd-rate', 'twelve');
  await page.waitForTimeout(100);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  const batches = events.map((b) => { try { return JSON.parse(b); } catch { return b; } });
  for (const b of batches) { const r = check(b); if (!r.ok) v(`UD1: a batch the Worker would refuse (${r.why}): ${String(JSON.stringify(b)).slice(0, 120)}`); }
  const steps = batches.flatMap((b) => b.ev ?? []).map((e) => (e.f ? `${e.e} ${e.f}` : e.e));
  for (const want of ['open', 'field fld-fd-borrower', 'field fld-fd-amount', 'result dscr-status-ready', 'tap dscr-viable', 'tap dscr-plan-use', 'tap dscr-edit',
    'more more-options', 'download pdf', 'download xlsx', 'error fld-fd-rate']) if (!steps.includes(want)) v(`UD1: no "${want}" in the batches (seen: ${steps.join(', ').slice(-300)})`);
  if (!steps.at(-1)?.startsWith('leave error-fld-')) v(`UD1: leaving does not name the last step, an error (seen: ${steps.at(-1)})`);
  // The figures as typed, in digits, and as the page shows them; the times are left out, being the page's own.
  const said = events.join('\n').replace(/"t":\d+/g, '');
  for (const x of ['4.5 L', '450000', '4,50,000', '12 L', '1200000', '12,00,000', '12.25', '180000', '1,80,000', '12345678', '1,23,45,678'])
    if (said.includes(x)) v(`UD1: the typed or shown figure ${x} is in a batch`);
  if (await page.getByTestId('counted').count()) v('UD1: the footer says steps are counted on a build without the Worker');
  await ctx.close();
  // A build without the Worker's address sends nothing.
  const { ctx: c2, page: p2, v: v2 } = await open('/dscr/', { scheme: 'dark' });
  let sent = 0;
  p2.on('request', (r) => { if (r.method() === 'POST') sent++; });
  await leave(p2, '#fld-fd-amount', '12 L');
  await p2.evaluate(() => dispatchEvent(new Event('pagehide')));
  await p2.waitForTimeout(200);
  if (sent) v2(`UD1: ${sent} requests sent while the Worker is not live`);
  await c2.close();
}

// Q1: in WhatsApp's own browser the downloads carry the way out to the phone's: on Android a link to the same page.
if (touched('/estimate/')) {
  const UA = 'Mozilla/5.0 (Linux; Android 13; SM-A145F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.21.80';
  const { ctx, page, v } = await open('/estimate/', { userAgent: UA });
  await page.check('#fld-work-renovate');
  await page.check('#fld-home-flat');
  await page.selectOption('#fld-city', 'pune');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('#fld-bhk-2');
  await page.click('#fld-level-1');
  const href = await page.getByTestId('pl-in-app').locator('a').getAttribute('href', { timeout: 3000 }).catch(() => null);
  if (href !== 'intent://' + new URL(BASE).host + '/estimate/#Intent;scheme=http;end') v(`Q1: in WhatsApp the downloads' way out reads ${href}`);
  await ctx.close();
  const plain = await open('/estimate/');
  if (await plain.page.getByTestId('pl-in-app').count()) plain.v('Q1: the in-app line shows in a phone\'s own browser');
  await plain.ctx.close();
}

// Answers kept in the tab (UXR2, D-UX-157 to D-UX-162): each tool, typed into, reloaded and opened from home's fictional
// case keeps its filled fields; Clear all empties the draft. A field is filled when it holds text, a choice or a tick.
const filledCount = (page) => page.evaluate(() => [...document.querySelectorAll('main input, main select, main textarea')]
  .filter((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value.trim() !== '')).length);
// What the tab holds (D-UX-173): only the five drafts (the estimate's two islands keep one each, D-UX-171), each small and
// holding no document; nothing in localStorage but the theme and the report's mode (preferences, not answers).
const DRAFT_KEY = /^draft:(dscr|cma|report|plan|quote):v1$/;
const stored = (page) => page.evaluate(() => ({ s: Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k) ?? '']), l: Object.keys(localStorage) }));
const KEPT = [
  { path: '/dscr/', key: 'dscr', clear: ['dscr-clear'] },
  { path: '/cma/', key: 'cma', clear: ['cma-clear'] },
  { path: '/project-report/', key: 'report', clear: ['rep-clear'] },
  { path: '/estimate/', key: 'plan', fill: async (page) => { await page.check('#fld-work-renovate'); await page.check('#fld-home-flat'); await page.selectOption('#fld-city', 'pune'); } },
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
  if (!held.s.some(([k]) => k === `draft:${t.key}:v1`)) v(`UXR2: typing kept no draft:${t.key}:v1`);
  for (const [k, val] of held.s) {
    if (k === 'seeded') continue;
    if (!DRAFT_KEY.test(k)) v(`UXR2: the tab holds ${k}, not a draft`);
    else if (val.length > 20000 || /data:|blob:|%PDF/.test(val)) v(`UXR2: ${k} holds more than typed answers (${val.length} characters)`);
  }
  if (held.l.some((k) => k !== 'app-theme' && k !== 'report-mode')) v(`UXR2: localStorage holds ${held.l.join(', ')}`);
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
    if ((await stored(page)).s.some(([k]) => k === `draft:${t.key}:v1`)) v(`UXR2: Clear all left draft:${t.key}:v1 behind`);
  }
  await ctx.close();
}

// UXR5's "Done when" (UXR5b, the UXR1 report): on all four tools nothing stands before the first question but the intro and
// the start line (S16, P11, P12); one closed More options (S19); the worked example fills and says it is fictional; Clear all
// takes it in one tap, with an undo; and the same four downloads (P10). The report's downloads wait for its check (OR8).
const SAME = [['/dscr/', 'dscr', ''], ['/cma/', 'cma', 'cma-'], ['/project-report/', 'rep', 'rep-'], ['/estimate/', 'pl', 'pl-']];
for (const [path, pre, dl] of SAME.filter(([p]) => touched(p))) for (const width of [390, 1280]) {
  const { ctx, page, v } = await open(path);
  if (width !== 390) await page.setViewportSize({ width, height: 900 });
  const before = await page.evaluate((pre) => {
    const tool = document.querySelector('main [data-tool]'), q = [...tool.querySelectorAll('fieldset, label, input, select')].find((e) => e.checkVisibility());
    const sec = q?.closest('section'), out = [];
    for (const el of tool.querySelectorAll('p, h2, h3, button, a, summary, ul')) {
      if (!q || q.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) break;
      if (el.contains(q) || !el.checkVisibility() || el.closest(`[data-testid="${pre}-start"]`) || el.matches('[data-testid="tool-kind"], [data-testid="kept-line"], h1 + p')) continue;
      if (sec?.contains(el) && el.matches('h2, h3')) continue;
      out.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`);
    }
    return q ? out : ['no question'];
  }, pre);
  if (before.length) v(`UXR5 at ${width} px: before the first question stands ${before.join(' | ')}`);
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

// The design team's measured checks (DT1, docs/DESIGN.md): every page at 360 and 1280 px, light and dark, 320 px, reduced motion.
const design = await designChecks({ browser, BASE, pages, quick, violations });
const load = await loadCheck({ browser, BASE, pages, quick, violations });
const forbidden = await forbiddenChecks({ browser, BASE, pages, motion: touched('/'), violations });
await browser.close();
server.close();
console.log(`site check: ${pages.length} pages at 390 px, light and dark: ${violations.length} violations${quick ? ` (--quick: ${pages.join(' ')}; the full check before a PR)` : ''}`);
console.log(`design checks: ${design.lines} findings measured (each held in scripts/design-baseline.json), ${design.tokens.rawColour} raw colour classes, ${design.tokens.arbitraryValue} arbitrary values${design.lower.length ? `; lower the baseline: ${design.lower.join(', ')}` : ''}${design.fixed ? `; ${design.fixed} known findings fixed, take them out of the baseline` : ''}`);
console.log(`load measure: ${load.pages} pages against scripts/load-baseline.json, ${load.rose} counts rose, ${load.fell} fell${load.fonts ? '' : '; other fonts here than the baseline\'s, so the answer\'s place and the out-of-sight count are not compared'} (docs/LOAD-MEASURE.md)`);
console.log(`FinSight's rules: ${forbidden.pages} page${forbidden.pages === 1 ? '' : 's'} in the new look (docs/DESIGN.md), F1 to F19; ${forbidden.weight ? `home weighs ${forbidden.weight} KB as it loads (cap ${WEIGHT_CAP} KB)` : 'no motion, frame or weight check (home not touched)'}`);
console.log(`downloads on a slow phone (CPU ×4): ${timings.length} timed, slowest ${Math.max(0, ...timings.map((t) => t[1]))} ms (cap ${SLOW_MS} ms)`);
for (const x of violations) console.log(`  - ${x}`);
// In CI each violation is also an annotation, readable where the job's log is not (UX4).
if (process.env.GITHUB_ACTIONS) for (const x of violations) console.log(`::error title=site check::${String(x).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
process.exit(violations.length ? 1 : 0);
