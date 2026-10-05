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
 * Run after `npm run build`. CHROMIUM_PATH overrides the browser Playwright would use.
 */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { docxLines, docxPart, pdfPages, workbook } from './read-doc.mjs';

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

// D-BIZ-03: the brand notice, word for word as rule 4 of docs/TRADEMARKS.md gives it, read below on the planning estimate
// and in its six downloads; and, by rule 1, no logo or product image: site/public and the built site hold no image but the favicon.
const TM = await readFile(fileURLToPath(new URL('../docs/TRADEMARKS.md', import.meta.url)), 'utf8');
const NOTICE = TM.slice(TM.indexOf('4. This notice')).split('\n').find((l) => l.trim().startsWith('> '))?.trim().slice(2) ?? '(rule 4 not found)';
const SHORT = NOTICE.split(/(?<=\.) /).slice(0, 2).join(' '); // its first two sentences: the bill names brands but shows none of our prices (D-BIZ-05)
for (const [dir, label] of [[fileURLToPath(new URL('../site/public/', import.meta.url)), 'site/public'], [DIST, 'the built site']]) {
  const images = (await readdir(dir, { recursive: true })).filter((f) => /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)$/i.test(f) && f !== 'favicon.svg');
  if (images.length) violations.push(`${label} holds an image besides the favicon (docs/TRADEMARKS.md, rule 1: no logos or product photos): ${images.join(', ')}`);
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/** Opens a page at 390 px. `stored` is a saved theme choice; `blockScripts` loads the page without its script files. */
async function open(path, { scheme = 'light', stored, blockScripts = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  if (stored) await ctx.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('app-theme', v); sessionStorage.setItem('seeded', '1'); } }, stored);
  if (blockScripts) await ctx.route('**/*.js', (r) => r.abort());
  const page = await ctx.newPage();
  // A fixed day, so the front door's "this month" (October 2026) and the documents' dates never depend on when this runs.
  await page.clock.setFixedTime(new Date('2026-10-02T10:00:00+05:30'));
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
  if (!fits(got)) v(`${step}: ${name} says "${got}", want "${want}"`);
}
/** The same for what a field holds. */
async function expectValue(page, v, sel, want, step) {
  let got = await page.inputValue(sel);
  for (let i = 0; got !== want && i < 30; i++) { await page.waitForTimeout(100); got = await page.inputValue(sel); }
  if (got !== want) v(`${step}: ${sel} holds "${got}", want "${want}"`);
}
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

{
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  await openMore(page);
  // The page opens with the assumptions answered (D-UX-08): the start questions chosen, the loan asked at once, the target
  // filled in, and the preview listing what it assumes.
  if (!(await page.isChecked('#fld-source-plan')) || !(await page.isChecked('#fld-method-common'))) v('the start questions are not answered from the assumptions');
  await page.locator('#fld-loanAmount').waitFor({ timeout: 3000 }).catch(() => v('the loan is not asked at once'));
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'the assumed target');
  // The method and the target read as one line (P1f).
  await expectText(page, v, 'assumed-method', 'How DSCR is worked out, and the target: Common term-loan DSCR; average 1.50, lowest year 1.20', 'the assumptions listed');

  // The loan amount field, kept from P0: read back in figures and words while typing; long words wrap.
  const field = page.locator('#fld-loanAmount');
  for (const [typed, want] of [['70 L', 'Rs. 70,00,000 (Rupees Seventy Lakh Only)'], ['1.2 Cr', 'Rs. 1,20,00,000 (Rupees One Crore Twenty Lakh Only)'], ['seventy', 'Not understood. Try 70 L, 1.2 Cr or 70,00,000.']]) {
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
  await expectText(page, v, 'dscr-status', 'Provisional: 1 still needed', 'case A without a target');
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
  await expectText(page, v, 'dscr-status', 'Complete, on 6 assumptions', 'case A with the examples');
  await expectText(page, v, 'dscr-verdict', 'Below the target: the lowest year, 2027-28, is 1.16 against 1.20; the average is 1.45 against 1.50.', 'case A with the examples');
  await expectText(page, v, 'dscr-largest', 'The largest loan on these terms is Rs. 11,59,646, limited by the lowest year, 2027-28.', 'case A with the examples');
  await expectText(page, v, 'use-amount', 'Use Rs. 11,59,646', 'case A with the examples');
  await expectText(page, v, 'dscr-fewest', 'Even 14 instalments, the most the projections cover (to 2029-30), miss the target: the average is below the target. Add later years to try a longer repayment.', 'case A with the examples');
  await expectText(page, v, 'answer-bar', 'Average 1.45 · lowest 1.16 in 2027-28 · below the target · complete, on 6 assumptions ↓', 'case A with the examples');

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
  if (filled !== '11,59,646') v(`"Use Rs. 11,59,646" shows "${filled}" in the loan amount until the next paint`);
  await expectText(page, v, 'amount-read', 'Rs. 11,59,646 (Rupees Eleven Lakh Fifty Nine Thousand Six Hundred and Forty Six Only)', 'after taking the largest loan');
  await expectText(page, v, 'dscr-verdict', 'Meets the target: the lowest year, 2027-28, is 1.20 against 1.20; the average is 1.50 against 1.50.', 'after taking the largest loan');
  if (await page.getByTestId('use-amount').count()) v('the largest loan is still offered after it was taken');

  // A figure that is not understood is flagged and listed as still needed, never taken as zero.
  await leave(page, '#fld-pbdit-2028-29', 'lots');
  await page.waitForSelector('#fld-pbdit-2028-29[aria-invalid="true"]', { timeout: 3000 }).catch(() => v('"lots" in a figure is not flagged'));
  await expectText(page, v, 'dscr-status', 'Provisional: 1 still needed', 'a figure not understood');
  const missing = await page.getByTestId('dscr-needs').locator('li').allTextContents();
  if (missing.join('|') !== 'Profit before interest, depreciation and tax for 2028-29') v(`a figure not understood: still needed ${JSON.stringify(missing)}`);
  if (await page.getByTestId('dscr-average').count()) v('figures shown while a figure is not understood');

  // Who the borrower is sets the tax for every year in one tap.
  await page.check('#fld-borrowerType-company');
  await expectText(page, v, 'tax-by', 'Worked out each year for a company: 25.168%.', "the company's tax");
  if (await page.locator('#fld-taxPct-2026-27').count()) v('a tax rate is still asked after saying who the borrower is');
  // Clear all asks first, then takes the page back to where it opened: the assumptions, and nothing typed.
  await page.getByTestId('clear-all').click();
  await page.getByTestId('clear-yes').click();
  await expectValue(page, v, '#fld-loanAmount', '', 'Clear all empties the loan');
  if (!(await page.isChecked('#fld-source-plan'))) v('Clear all did not go back to the assumptions');
  await expectValue(page, v, '#fld-targetAverage', '1.50', 'Clear all restores the assumed target');
  await ctx.close();
}

// The same filled page in dark mode.
{
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
{
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
  await expectText(page, v, 'dscr-status', 'Provisional: 2 still needed', 'a first year with interest only');
  if (!(await page.isChecked('#fld-start-2026-27'))) v("the figures do not start in the loan's first year as assumed");
  await expectText(page, v, 'assumed-start', 'The first year of the figures: The year the loan is first drawn', 'the start assumption listed');
  await expectText(page, v, page.getByTestId('start-question').locator('p').first(), 'No instalment falls in 2026-27, only interest of Rs. 72,000. If operations start later, start your figures there: the interest before then is taken as paid from the project cost, not from profits.', 'the question about the first year');
  await page.check('#fld-start-2027-28');
  await expectText(page, v, 'dscr-status', 'Complete, on 6 assumptions', 'figures starting in 2027-28');
  if (await page.getByTestId('assumed-start').count()) v('the start assumption is still listed after choosing 2027-28');
  await expectText(page, v, 'dscr-before-start', 'Left out: 2026-27, before your figures start. Its interest (Rs. 72,000) is taken as paid from the project cost (capitalised), not from profits.', 'figures starting in 2027-28');
  await expectValue(page, v, '#fld-pbdit-2027-28', '7,50,000', 'each figure stays under its year');
  if (await page.locator('#fld-pbdit-2026-27').count()) v('2026-27 is still asked after the figures start in 2027-28');
  await layout(page, v, 'figures starting in 2027-28');
  await page.check('#fld-start-2026-27');
  await expectText(page, v, 'dscr-status', 'Provisional: 2 still needed', 'figures starting in 2026-27');
  await ctx.close();
}

// A few answers instead of every year: profit grows from one figure and one rate; the rest are one figure or None.
{
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
  await expectText(page, v, 'dscr-status', 'Complete, on 8 assumptions', 'a few answers');
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
{
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
  await expectText(page, v, 'dscr-status', 'Complete, on 9 assumptions', 'the quick path');
  await expectText(page, v, 'dscr-average', '1.16', 'the quick path');
  await expectText(page, v, 'dscr-lowest', '0.84', 'the quick path');
  await expectText(page, v, 'assumed-tax', 'Tax rate: 31.2%', 'the quick path');
  // Four figures typed for the business, whatever the number of years, beside the assumed tax rate.
  const inputs = await page.locator('#figures input[type="text"]').count();
  if (inputs !== 5) v(`${inputs} fields in the figures on the quick path; want 5 (4 typed and the assumed tax rate)`);
  await layout(page, v, 'the quick path, 390 px');

  // The statement to download, at 390 px. Without the borrower's name and the lender it is provisional, and says so.
  await expectText(page, v, 'doc-status', 'Provisional: 2 still needed', 'the download before its facts');
  const own = await page.getByTestId('doc-needs').locator('li').allTextContents();
  if (own.join('|') !== "The borrower's name|The lender") v(`the download asks for ${JSON.stringify(own)}`);
  const save = async (id) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByTestId(id).click()]);
    const path = await file.path();
    return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
  };
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
  await expectText(page, v, 'doc-status', 'Complete', 'the download with its facts');
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
  const ONLY_ON_THE_PAGE = ['Assumed until changed', 'Below the target', 'The largest loan', 'The fewest instalments', 'target', 'checked', 'How the figures are built', 'Status'];
  for (const not of ONLY_ON_THE_PAGE) if (pages.join('\n').includes(not)) v(`the PDF says "${not}"`);
  const xlsx = await save('download-xlsx');
  if (xlsx.name !== 'DSCR statement - Asha Traders.xlsx') v(`the Excel copy is named "${xlsx.name}"`);
  const book = await workbook(xlsx.bytes).catch((e) => v(`the Excel copy is not read: ${e.message}`)) ?? [];
  const cash = book[0]?.data.find((r) => r[0] === 'Cash available (A)')?.filter((c) => c !== null);
  if (book.map((x) => x.sheet).join('|') !== 'DSCR statement|Basis|Repayment schedule' || JSON.stringify(cash) !== JSON.stringify(['Cash available (A)', 400392, 422624, 445488, 473072, 1741576]))
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
{
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
  await expectText(page, v, 'assumed-proprietorTax', "A proprietor's tax: The new regime's slab rates, on the business's profit as the only income", "a proprietor's tax");
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
{
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
  await expectText(page, v, 'dscr-status', 'Provisional: 1 still needed', 'own figures before None');
  await page.check('#fld-nonCash-none');
  await leave(page, '#fld-targetAverage', '1.5');
  await expectText(page, v, 'dscr-status', 'Complete, on 2 assumptions', 'own figures');
  await expectText(page, v, 'dscr-average', '1.23', 'own figures');
  await expectText(page, v, 'dscr-lowest', '1.14', 'own figures');
  await expectText(page, v, 'dscr-not-counted', 'Not counted: 2026-27 (no term-loan instalment).', 'own figures');
  await expectText(page, v, 'dscr-verdict', 'Below the target: the lowest year, 2027-28, is 1.14 against 1.20; the average is 1.23 against 1.50.', 'own figures');
  await layout(page, v, 'own figures filled');
  await ctx.close();
}

// The front door (P1f, D-UX-10): eight fields, More options closed on load, and the results without opening it. A textbook
// EMI: Rs. 10,00,000 at 12% for one year is Rs. 88,848.79 a month; 12 of them less the loan is Rs. 66,185 of interest.
{
  const { ctx, page, v } = await open('/dscr/', { scheme: 'light' });
  if (await page.locator('#more-options').evaluate((d) => d.open)) v('More options is open on load');
  const texts = await page.locator('#front-door input[type="text"]').count(), radios = await page.locator('#front-door fieldset').count();
  if (texts + radios > 8) v(`the front door asks ${texts + radios} fields (${texts} typed, ${radios} choices); the owner's list is 8`);
  await expectText(page, v, 'fd-loan-note', 'The loan is taken as drawn in October 2026 and repaid by EMI every month, with no moratorium. Change it under More options.', 'the front door');
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
  await expectText(page, v, 'assumed-method', 'How DSCR is worked out, and the target: Common term-loan DSCR; average 1.50, lowest year 1.20', 'the method and the target in one line');
  await expectText(page, v, 'part-2026-27', '6 of 12 instalments', 'the first part-year');
  await layout(page, v, 'the front door filled, 390 px');
  await ctx.close();
}

// The planning estimate (E1, E3, A3, A8, V1): six questions and no other field, then the answer first; a line for every
// section, ten on for a renovation and ten for interiors with Furniture and Soft furnishings (D-UX-19); a slider and what
// it changed, the strip, Compare, the rooms (a size and a level of one's own) and the item drawer; the downloads read
// back. A 2BHK of 1,000 sq ft in Pune at Basic, worked by hand in tests/architect.test.ts and tests/library.test.ts: the
// living room's floor is 303.03 sq ft of tiles at Rs. 111.65 = Rs. 33,833.
for (const scheme of ['light', 'dark']) {
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
  const total = ((await page.getByTestId('pl-total').textContent()) ?? '').trim();
  if (!/^Rs\. [\d,]+$/.test(total)) v(`the estimate's total reads "${total}"`);
  await expectText(page, v, 'pl-sticky-total', total, 'the total in the bar at the bottom');
  // L1: the level's range by its choices, in one line under the total.
  await expectText(page, v, 'pl-range', /^At Basic, the choices run from Rs\. [\d,]+ to Rs\. [\d,]+: the cheapest in each item to the dearest\. \d+ of the \d+ items offer a choice\.$/, 'the level\'s range under the total');
  if ((await page.getByTestId('pl-strip-1').getAttribute('aria-label')) !== `Basic: ${total}` || (await page.getByTestId('pl-strip-1').getAttribute('aria-pressed')) !== 'true')
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
  await expectText(page, v, 'pl-rates', /^A planning estimate: rates as reported on \d\d-\d\d-\d{4} for Pune; \d+ of \d+ lines checked against their pages$/, 'the rates as reported, in one line by the total');

  // The downloads, at the package as answered.
  await expectText(page, v, 'pl-doc-status', 'Provisional: 2 still needed', 'the planning estimate before its facts');
  await leave(page, '#fld-pl-owner', 'Asha Rao');
  await leave(page, '#fld-pl-property', 'Flat 4, Example Towers, Pune');
  await expectText(page, v, 'pl-doc-status', 'Complete', 'the planning estimate with its facts');
  const save = async (id) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByTestId(id).click()]);
    const path = await file.path();
    return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
  };
  const pdf = await save('pl-download-pdf');
  if (pdf.name !== 'Planning estimate - Asha Rao.pdf') v(`the planning estimate PDF is named "${pdf.name}"`);
  const pdfText = (await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]));
  const figure = total.replace('Rs. ', '');
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
  await expectText(page, v, 'pl-room-bad-living', 'Type both sides. Until then the planned size is used.', 'one side of a room typed');
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
  await page.getByTestId('pl-change').click();
  await page.check('#fld-work-interiors');
  await page.getByTestId('pl-done').click();
  const onI = await page.locator('[data-testid^="pl-card-"] input[role="switch"]:checked').count();
  const movable = await Promise.all(['appliances', 'smart', 'furniture', 'furnishings'].map((x) => page.isChecked(`#fld-on-${x}`)));
  if (onI !== 10 || movable.includes(false)) v(`interiors show ${onI} sections on, Appliances, Smart home, Furniture and Soft furnishings ${movable.join('/')}`);
  await expectText(page, v, 'pl-split', /^Fixed works Rs\. [\d,]+ · Movable items Rs\. [\d,]+ · Appliances Rs\. [\d,]+$/, 'the movable items apart');
  await layout(page, v, 'the estimate as interiors, 390 px');
  // A new house (A3, D-UX-23): the second question asks the floors and the area is the built-up area, still six
  // questions; eighteen sections with thirteen on (E5: Outside works and Water), the structure the same at every level;
  // the PDF titled for construction, with its stages.
  await page.getByTestId('pl-change').click();
  await page.check('#fld-work-build');
  const asked = await page.locator('#six-questions [data-question]').count(), floorsAsked = await page.locator('#fld-floors-2').count();
  if (asked !== 6 || floorsAsked !== 1 || (await page.locator('#fld-home-flat').count())) v(`a new house asks ${asked} questions (want 6), the floors ${floorsAsked ? '' : 'not '}among them`);
  await page.check('#fld-floors-2');
  await leave(page, '#fld-carpet', '2,000');
  await page.check('#fld-bhk-3');
  await page.getByTestId('pl-done').click();
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
  await ctx.close();
}

// V1 (D-UX-32): short by default. Before any tap, the words shown with the answer stay within a budget of 400 for a flat's
// interiors and a new G+1 house (before V1, about 810 and 1,360); only the flags that can change the decision show, and
// no field but the document's own facts. T1 (D-UX-34): a line's and a section's Why?, closed, drawn only once its section is
// opened, so none before any tap: what it is, why it costs what it does, what to check, with sources still as reported.
{
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
    await expectText(page, v, 'pl-total', /^Rs\. [\d,]+$/, label);
    await expectText(page, v, 'pl-range', /^At (Standard|Luxury), the choices run from Rs\. [\d,]+ to Rs\. [\d,]+: /, `${label}: the level's range`);
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
    const reported = `Sources: .+${why.own ? '; and our own rule' : ''}\\. (As reported, not yet checked|Checked against (its page|their pages))\\.$`;
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
{
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
  await expectText(page, v, 'est-status', 'Provisional: 1 still needed', 'the estimate before contingency');
  await page.check('#fld-contingency-none');
  await expectText(page, v, 'est-status', 'Complete', 'the estimate');
  for (const [id, want] of [['est-works', '2,81,750'], ['est-gst', '50,715'], ['est-total', '3,32,465'], ['est-per-sqft', 'Rs. 277'], ['item-2-amount', 'Rs. 2,66,000']])
    await expectText(page, v, id, want, 'the estimate');
  await layout(page, v, 'the estimate filled, 390 px');
  await expectText(page, v, 'est-doc-status', 'Provisional: 2 still needed', 'the estimate before its facts');
  await leave(page, '#fld-est-borrower', 'Asha Traders');
  await leave(page, '#fld-est-property', 'Plot 12, Example Nagar, Pune');
  await expectText(page, v, 'est-doc-status', 'Complete', 'the estimate with its facts');
  const save = async (id) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByTestId(id).click()]);
    const path = await file.path();
    return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
  };
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
{
  const { ctx, page, v } = await open('/project-report/', { scheme: 'light' });
  await page.check('#fld-borrower-firm');
  for (const [id, value] of [['#fld-cost-building', '10 L'], ['#fld-cost-machinery', '20 L'], ['#fld-cost-furniture', '2 L'], ['#fld-cost-preliminary', '1 L'],
    ['#fld-tl-amount', '25 L'], ['#fld-tl-rate', '10'], ['#fld-tl-disbursed', '2026-04'], ['#fld-tl-moratorium', '0'], ['#fld-tl-instalments', '60'],
    ['#fld-sales', '1.2 Cr'], ['#fld-salesGrowth', '10'], ['#fld-variablePct', '65'], ['#fld-fixed', '18 L'], ['#fld-fixedGrowth', '5'], ['#fld-wcLimit', '5 L'], ['#fld-wcRate', '11']])
    await leave(page, id, value);
  await expectText(page, v, 'rep-status', 'Provisional: 1 still needed', 'the report before the repayment');
  await page.check('#fld-tl-repayment-monthly');
  await expectText(page, v, 'rep-status', 'Complete', 'the report');
  await expectText(page, v, 'rep-key-0', 'Rs. 37,86,301', 'the cost of the project');
  const cells = async (table, label) => (await page.getByTestId(table).locator('tr', { has: page.locator('th', { hasText: label }) }).first().locator('td').allTextContents());
  for (const [table, label, want] of [['rep-pl', 'Profit after tax', '11,54,407'], ['rep-bs', 'Total liabilities', '55,81,804'], ['rep-bs', 'Total assets', '55,81,804'], ['rep-dscr', 'DSCR (A ÷ B)', '2.51']]) {
    if (table !== 'rep-dscr') await page.getByTestId(table).evaluate((t) => t.closest('details').open = true);
    const got = await cells(table, label);
    if (got[0] !== want) v(`the report's ${table} "${label}" shows ${JSON.stringify(got.slice(0, 2))}, want ${want} first`);
  }
  await layout(page, v, 'the report filled, 390 px');
  await expectText(page, v, 'rep-doc-status', 'Provisional: 3 still needed', 'the report before its facts');
  await leave(page, '#fld-rep-name', 'Asha Packaging');
  await leave(page, '#fld-rep-activity', 'Manufacture of corrugated boxes');
  await leave(page, '#fld-rep-address', 'Plot 4, Example MIDC, Pune');
  await expectText(page, v, 'rep-doc-status', 'Complete', 'the report with its facts');
  const save = async (id) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByTestId(id).click()]);
    const path = await file.path();
    return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
  };
  const pdf = await save('rep-download-pdf');
  if (pdf.name !== 'Project report - Asha Packaging.pdf') v(`the report PDF is named "${pdf.name}"`);
  const pages = await pdfPages(pdf.bytes).catch((e) => [`(not read: ${e.message})`]);
  if (!pages[0].includes('Total cost of the project 37,86,301') || !pages.join('\n').includes('Total assets 55,81,804')) v('the report PDF does not read back its cost and its balance sheet');
  const book = await workbook((await save('rep-download-xlsx')).bytes).catch((e) => v(`the report's Excel copy is not read: ${e.message}`)) ?? [];
  if (book.map((x) => x.sheet).join('|') !== 'Summary|Projections|DSCR and ratios|Annex') v(`the report's Excel copy holds ${JSON.stringify(book.map((x) => x.sheet))}`);
  const { lines, messages } = await docxLines((await save('rep-download-docx')).bytes).catch((e) => ({ lines: [], messages: [{ message: e.message }] }));
  if (messages.length || !lines.some((l) => l.startsWith('Total assets | 55,81,804'))) v(`the report's Word copy reads back ${JSON.stringify(lines.slice(0, 4))} ${JSON.stringify(messages).slice(0, 120)}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`site check: ${pages.length} pages at 390 px, light and dark: ${violations.length} violations`);
for (const x of violations) console.log(`  - ${x}`);
process.exit(violations.length ? 1 : 0);
