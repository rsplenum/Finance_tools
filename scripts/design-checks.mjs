/**
 * Design checks (DT1, D-UX-58), measured as text; each rule, the friction it removes and its evidence: docs/DESIGN.md,
 * "Measured checks". The site check runs `designChecks` on every built page at 360 px and at 1280 px, light and dark:
 * axe-core (WCAG 2.2 A and AA); the edges of fields at 3:1 and a visible focus at 3:1 (WCAG 1.4.11, 2.4.7); targets of
 * 24 by 24 px (2.5.8) and, at 360 px, fields and buttons filled with the accent 44 px tall; every control reached by Tab (2.1.1) and, once focused, not hidden under a sticky band (2.4.11); no
 * sideways scroll at 320 px (1.4.10); nothing moving under reduced motion (2.3.3). `tokenCounts` counts the raw colour
 * classes and arbitrary values in site/src: a ratchet against scripts/design-baseline.json until UX2 to UX4 bring both to
 * nil. A count held in the baseline may fall, never grow; when it falls, lower the baseline in the same commit.
 * `measure` is also what scripts/design-review.mjs prints for each state of a page.
 */
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const AXE = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const BASELINE = fileURLToPath(new URL('./design-baseline.json', import.meta.url));
const SRC = fileURLToPath(new URL('../site/src/', import.meta.url));
export const WIDTHS = { phone: { width: 360, height: 780 }, desktop: { width: 1280, height: 900 } };

/** Raw palette colours (`text-slate-600`, `bg-white`) and arbitrary values (`text-[11px]`, `bg-[#eda100]`) in site/src. */
export async function tokenCounts() {
  const raw = /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|accent|decoration|placeholder|caret|shadow)(?:-[trblxy])?-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d+)?(?:\/\d+)?\b/g;
  // A value in brackets; a variant in brackets (`has-[:focus-visible]:`) is a selector, not a value.
  const arbitrary = /(?<![\w-])-?[a-z][\w-]*-\[[^\]\s'"`]+\](?!:)/g;
  let rawColour = 0, arbitraryValue = 0;
  for (const f of await readdir(SRC, { recursive: true })) {
    if (!/\.(tsx|ts|astro|css)$/.test(f)) continue;
    const s = await readFile(SRC + f, 'utf8');
    rawColour += s.match(raw)?.length ?? 0;
    arbitraryValue += s.match(arbitrary)?.length ?? 0;
  }
  return { rawColour, arbitraryValue };
}

/** Runs in the page: the edges of fields, target sizes, and (on a phone) fields and filled buttons 44 px tall. */
function inPage(phone) {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  cv.canvas.width = cv.canvas.height = 1;
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
  const lum = ([r, g, b]) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
    .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const over = (c, b) => c.slice(0, 3).map((x, j) => x * c[3] / 255 + b[j] * (1 - c[3] / 255)); // a see-through edge as it shows
  const ratio = (a, b) => { const [x, y] = [lum(over(a, b)), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 128) return c; } return rgba('Canvas'); };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && el.checkVisibility({ visibilityProperty: true }) && getComputedStyle(el).clipPath !== 'inset(50%)'; }; // not in a closed <details>, not sr-only
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
  const FIELD = 'input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]):not([type=file]), select, textarea';
  const TARGET = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])';
  const out = { edges: [], small: [], short: [] };
  // WCAG 1.4.11: a field is known by its edge, so the edge (or its own fill) stands 3:1 against what is behind it.
  for (const el of document.querySelectorAll(FIELD)) {
    if (!shown(el) || el.disabled) continue;
    const s = getComputedStyle(el), behind = bgOf(el.parentElement), fill = rgba(s.backgroundColor);
    const edge = parseFloat(s.borderBottomWidth) > 0 ? ratio(rgba(s.borderBottomColor), behind) : 0;
    const filled = fill[3] > 128 ? ratio(fill, behind) : 0;
    if (Math.max(edge, filled) < 3) out.edges.push(`${name(el)} edge ${edge.toFixed(2)}:1`);
  }
  // The target is the label when a radio or a tick box sits inside one (its whole card is clickable).
  const targets = [...document.querySelectorAll(TARGET)].filter((el) => shown(el) && !el.disabled).map((el) => {
    const box = (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label')) || el;
    // WCAG 2.5.8's exception: a link inside a sentence.
    const inline = el.matches('a') && getComputedStyle(el).display === 'inline' && [...el.parentElement.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim());
    return { el, r: box.getBoundingClientRect(), inline };
  });
  const near = (c, r) => Math.hypot(Math.max(r.left - c.x, 0, c.x - r.right), Math.max(r.top - c.y, 0, c.y - r.bottom));
  for (const t of targets) {
    const { r } = t;
    if (t.inline || (r.width >= 24 && r.height >= 24)) continue;
    // ...or the spacing exception: a 24 px circle on its centre touches no other target and no other small target's circle.
    const c = { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    const clash = targets.some((u) => u !== t && !u.el.contains(t.el) && !t.el.contains(u.el) && (near(c, u.r) < 12
      || ((u.r.width < 24 || u.r.height < 24) && !u.inline && Math.hypot(c.x - (u.r.left + u.r.right) / 2, c.y - (u.r.top + u.r.bottom) / 2) < 24)));
    if (clash) out.small.push(`${name(t.el)} ${Math.round(r.width)}×${Math.round(r.height)} px`);
  }
  if (phone) {
    // The main controls: fields, and buttons filled with the accent (the main action, docs/DESIGN.md).
    const probe = document.body.appendChild(Object.assign(document.createElement('i'), { style: 'background: var(--accent)' }));
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    for (const el of document.querySelectorAll(`${FIELD}, button`)) {
      if (!shown(el) || el.disabled) continue;
      if (el.matches('button') && getComputedStyle(el).backgroundColor !== accent) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) out.short.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)} px`);
    }
  }
  return out;
}

/** Runs in the page under reduced motion: anything that still moves. */
function moving() {
  const sec = (v) => Math.max(...v.split(',').map((x) => parseFloat(x) * (x.trim().endsWith('ms') ? 0.001 : 1)));
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if ((s.transitionProperty !== 'none' && sec(s.transitionDuration) > 0.01) || (s.animationName !== 'none' && sec(s.animationDuration) > 0.01)) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')}`);
  }
  if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') out.push('html scrolls smoothly');
  return out;
}

/**
 * Tabs through the page from the top: each control it reaches must show a focus of 3:1 against what is behind it (an
 * outline, a ring, or the browser's own); each shown control must be reached (a radio group by any one of its radios).
 */
async function keyboard(page) {
  const all = await page.evaluate(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && el.checkVisibility({ visibilityProperty: true }) && getComputedStyle(el).clipPath !== 'inset(50%)'; }; // not in a closed <details>, not sr-only
    const els = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => shown(el) && !el.disabled && el.tabIndex >= 0);
    els.forEach((el, i) => { el.dataset.dcKey = el.type === 'radio' && el.name ? `radio:${el.name}` : String(i); });
    for (const el of document.querySelectorAll('body *')) if (/sticky|fixed/.test(getComputedStyle(el).position)) el.dataset.dcBand = '';
    // Tab from the top of the page, wherever the state's last step left the focus.
    const start = document.body.insertBefore(Object.assign(document.createElement('span'), { tabIndex: -1, id: 'dc-start' }), document.body.firstChild);
    start.focus();
    return [...new Set(els.map((el) => el.dataset.dcKey))];
  });
  const reached = new Set(), unseen = [];
  let last = '';
  for (let i = 0; i < all.length * 3 + 30; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      cv.canvas.width = cv.canvas.height = 1;
      const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
      const lum = ([r, g, b]) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, j) => s + x * [0.2126, 0.7152, 0.0722][j], 0);
      const ratio = (a, b) => { const [x, y] = [lum(over(a, b)), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const over = (c, b) => c.slice(0, 3).map((x, j) => x * c[3] / 255 + b[j] * (1 - c[3] / 255)); // a see-through ring as it shows
      const bgOf = (e) => { for (; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 128) return c; } return rgba('Canvas'); };
      const s = getComputedStyle(el), behind = bgOf(el.parentElement);
      let best = 0;
      if (s.outlineStyle === 'auto') best = 3; // the browser's own two-colour ring
      else if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) best = ratio(rgba(s.outlineColor), behind);
      for (const m of s.boxShadow === 'none' ? [] : s.boxShadow.matchAll(/((?:rgba?|oklab|oklch|lab|lch|color)\([^)]*\)|#[0-9a-f]+)[^,]*?(\d+(?:\.\d+)?)px(?=\s*(?:,|$))/gi)) {
        if (parseFloat(m[2]) >= 1) best = Math.max(best, ratio(rgba(m[1]), behind));
      }
      // WCAG 2.4.11: the focused control not wholly hidden by a sticky or fixed band (the answer bar).
      // A control drawn above the band (the skip link, on top while focused) is not under it.
      const r = el.getBoundingClientRect(), onTop = el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      const hidden = !onTop && [...document.querySelectorAll('[data-dc-band]')].some((b) => {
        if (b.contains(el)) return false;
        const q = b.getBoundingClientRect();
        return q.height > 0 && r.top >= q.top && r.bottom <= q.bottom && r.left >= q.left && r.right <= q.right;
      });
      return { hidden, key: el.dataset.dcKey ?? '', what: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`, best };
    });
    if (!f) { if (reached.size) break; continue; } // past the last control
    if (f.key && f.key === last) continue; // a month or date field takes Tab once per part
    if (f.key && reached.has(f.key)) break; // back round to the first control
    last = f.key;
    if (f.key) reached.add(f.key);
    if (f.best < 3) unseen.push(`${f.what} focus ${f.best.toFixed(2)}:1`);
    if (f.hidden) unseen.push(`${f.what} hidden under a sticky band`);
  }
  await page.evaluate(() => { document.getElementById('dc-start')?.remove(); for (const el of document.querySelectorAll('[data-dc-band]')) delete el.dataset.dcBand; });
  const missed = all.filter((k) => !reached.has(k));
  const names = missed.length ? await page.evaluate((ks) => ks.map((k) => {
    const el = document.querySelector(k.startsWith('radio:') ? `input[name="${k.slice(6)}"]` : `[data-dc-key="${k}"]`);
    return `${el?.tagName.toLowerCase()}${el?.id ? `#${el.id}` : ''} "${(el?.textContent || '').trim().slice(0, 30)}"`;
  }), missed) : [];
  return { unseen, missed: names };
}

/** Every measure for the page as it stands, as lines `check: what`; the caller sets the width, the scheme and the state. */
export async function measure(page, { phone, keys = true } = {}) {
  const lines = [];
  await page.evaluate(AXE);
  // axe runs from the page's top, the fonts in: its target-size counts a control cut by the window's edge as small, so where a
  // state happened to scroll decided the result (#fld-home-flat 10 px above the edge, one CI run in several; D-TECH-43).
  const axe = await page.evaluate(async () => {
    await document.fonts.ready;
    const y = scrollY;
    scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const found = (await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'],
    })).violations.map((x) => `${x.id} (${x.impact}, ${x.nodes.length}): ${x.nodes[0]?.target.join(' ')}`);
    scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return found;
  });
  for (const x of axe) lines.push(`axe: ${x}`);
  const m = await page.evaluate(inPage, phone);
  for (const x of m.edges) lines.push(`field edge below 3:1: ${x}`);
  for (const x of m.small) lines.push(`target below 24 px: ${x}`);
  for (const x of m.short) lines.push(`below 44 px on a phone: ${x}`);
  if (keys) {
    const k = await keyboard(page);
    for (const x of k.unseen) lines.push(`focus not seen: ${x}`);
    for (const x of k.missed) lines.push(`not reached by Tab: ${x}`);
  }
  return lines;
}

const leave = async (page, sel, value) => { await page.fill(sel, value); await page.press(sel, 'Tab'); };
const frontDoor = async (page, [profit, growth, amount, rate, years]) => {
  await page.check('#fld-fd-borrower-firm');
  for (const [id, v] of [['profit', profit], ['growth', growth], ['amount', amount], ['rate', rate], ['years', years]]) if (v !== undefined) await leave(page, `#fld-fd-${id}`, v);
};
// The planning estimate's six questions (scripts/site-check.mjs: a 2BHK of 1,000 sq ft in Pune); the last, the level, left out when `level` is false.
const sixQuestions = async (page, level = true) => {
  await page.check('#fld-work-renovate');
  await page.check('#fld-home-flat');
  await page.selectOption('#fld-city', 'pune');
  await leave(page, '#fld-carpet', '1,000');
  await page.check('#fld-bhk-2');
  if (level) await page.click('#fld-level-1');
};
// Fictional case R (tests/plan.test.ts, scripts/site-check.mjs), every fact but the repayment unless `repayment`.
const caseR = async (page, repayment = true) => {
  await page.check('#fld-borrower-firm');
  await page.locator('#more-options summary').click();
  await page.check('#fld-salesBy-typed');
  for (const [id, value] of [['#fld-cost-building', '10 L'], ['#fld-cost-machinery', '20 L'], ['#fld-cost-furniture', '2 L'], ['#fld-cost-preliminary', '1 L'],
    ['#fld-tl-amount', '25 L'], ['#fld-tl-rate', '10'], ['#fld-tl-disbursed', '2026-04'], ['#fld-tl-moratorium', '0'], ['#fld-tl-instalments', '60'], ['#fld-monthsToStart', '0'],
    ['#fld-sales', '1.2 Cr'], ['#fld-salesGrowth', '10'], ['#fld-variablePct', '65'], ['#fld-fixed', '18 L'], ['#fld-fixedGrowth', '5'], ['#fld-wcLimit', '5 L'], ['#fld-wcRate', '11']])
    await leave(page, id, value);
  if (repayment) await page.check('#fld-tl-repayment-monthly');
  await page.locator('#more-options summary').click();
};

/**
 * Each page's states, in the order a user meets them (docs/DESIGN.md, "States"). A state is a function that brings a
 * freshly opened page to it. The design review drives them all; the site check measures those in SITE_STATES too.
 */
/** Fictional case M, in lakh, oldest year first (tests/cma-plan.test.ts, worked by hand there). */
const CASE_M = { sales: [150, 165, 180, 200, 240], otherIncome: [0, 0, 0, 0, 0], materials: [103, 114, 126, 140, 170], otherDirect: [15, 17, 18, 20, 25],
  employees: [9, 10, 11, 12, 14], sga: [6, 7, 7, 8, 10], depreciation: [5, 5, 5, 5, 5], wcInterest: [7.5, 8, 8.5, 9, 12.5], tlInterest: [4.5, 4, 3.5, 3, 2.5],
  tax: [0, 0, 0.25, 0.75, 0.25], drawings: [0, 0, 0.75, 1.25, 0.75], capital: [20, 20, 20, 20, 20], reserves: [4, 4, 4, 5, 5], promoterLoans: [10, 10, 10, 10, 10],
  termLoans: [36, 32, 28, 24, 20], tlDue12: [4, 4, 4, 4, 4], bankWc: [55, 60, 65, 70, 80], creditors: [24, 26, 28, 30, 34], otherCl: [2, 2, 2, 2, 2],
  netBlock: [55, 50, 45, 40, 35], nonCurrent: [10, 10, 10, 10, 10], stock: [32, 35, 38, 40, 48], debtors: [24, 26, 28, 30, 36], cash: [3, 3, 3, 3, 2], otherCa: [27, 30, 33, 38, 40] };

export const STATES = {
  '/dscr/': {
    empty: async () => {},
    partly: async (page) => frontDoor(page, ['5 L']),
    // A fact missing: everything but the rate, so the result says what it still needs.
    provisional: async (page) => frontDoor(page, ['5 L', '10', '10 L', undefined, '5']),
    error: async (page) => { await frontDoor(page, ['seventy']); },
    // Fictional case S (tests/dscr-plan.test.ts): short of the target, then Make it viable opened.
    short: async (page) => { await frontDoor(page, ['4.5 L', '0', '12 L', '12', '5']); },
    plan: async (page) => { await frontDoor(page, ['4.5 L', '0', '12 L', '12', '5']); await page.getByTestId('dscr-viable').click(); },
    // A case that meets the target, then the download with the borrower and the lender named.
    result: async (page) => frontDoor(page, ['5 L', '10', '10 L', '12', '5']),
    download: async (page) => {
      await frontDoor(page, ['5 L', '10', '10 L', '12', '5']);
      // All eight inputs once: the EMIs already paid and the depreciation too, so their read-backs are measured.
      await leave(page, '#fld-fd-emis', '5,000');
      await leave(page, '#fld-fd-depreciation', '40,000');
      await leave(page, '#fld-borrower', 'Asha Traders');
      await leave(page, '#fld-lender', 'A bank');
      await page.locator('#download').scrollIntoViewIfNeeded();
    },
  },
  // CMA data (UX1): fictional case K is the worked example (tests/cma.test.ts).
  '/cma/': {
    empty: async () => {},
    partly: async (page) => leave(page, '#fld-cma-a1-sales', '300 L'),
    // The sales of every year and fresh, but no other head: the result says what it still needs.
    provisional: async (page) => {
      for (const [y, v] of [['a1', '300 L'], ['a2', '340 L'], ['a3', '390 L'], ['est', '450 L'], ['proj', '520 L']]) await leave(page, `#fld-cma-${y}-sales`, v);
      await page.check('#fld-cma-case-fresh');
    },
    error: async (page) => leave(page, '#fld-cma-a1-sales', 'seventy'),
    // Fictional case M (tests/cma-plan.test.ts), fresh, the collateral left empty: it misses four levels and the security
    // cover, 1.17 on its own assets, waits for the collateral (DESIGN-LESSONS 11: the case that breaks, UX5c).
    missed: async (page) => {
      for (const [h, xs] of Object.entries(CASE_M)) for (const [i, y] of ['a1', 'a2', 'a3', 'est', 'proj'].entries()) await leave(page, `#fld-cma-${y}-${h}`, `${xs[i]} L`);
      await leave(page, '#fld-cma-existing', '60 L');
      await page.check('#fld-cma-case-fresh');
    },
    result: async (page) => page.getByTestId('cma-example').click(),
    plan: async (page) => { await page.getByTestId('cma-example').click(); await page.getByTestId('cma-viable').click(); },
    download: async (page) => {
      await page.getByTestId('cma-example').click();
      await leave(page, '#fld-cma-name', 'K Steel Furniture Pvt Ltd');
      await page.locator('#download').scrollIntoViewIfNeeded();
    },
  },
  // The planning estimate first, then the typed quotation, its second path (UX1).
  '/estimate/': {
    empty: async () => {},
    partly: async (page) => { await page.check('#fld-work-renovate'); await page.check('#fld-home-flat'); },
    provisional: async (page) => sixQuestions(page, false),
    error: async (page) => { await page.check('#fld-work-renovate'); await page.check('#fld-home-flat'); await leave(page, '#fld-carpet', 'seventy'); },
    result: async (page) => sixQuestions(page),
    // A section opened and a line's drawer with its choices: the controls beside the figure they change.
    plan: async (page) => {
      await sixQuestions(page);
      await page.getByTestId('pl-card-flooring').locator('summary').first().click();
      await page.getByTestId('pl-open-living:floor:floor-skirting').click();
    },
    download: async (page) => {
      await sixQuestions(page);
      await leave(page, '#fld-pl-owner', 'Asha Rao');
      await leave(page, '#fld-pl-property', 'Flat 4, Example Towers, Pune');
      await page.locator('#fld-pl-property').scrollIntoViewIfNeeded();
    },
    // The typed quotation (scripts/site-check.mjs, P2): two lines, GST at 18%, no contingency yet.
    typed: async (page) => {
      await page.locator('#typed-path > summary').click();
      await page.check('#fld-kind-construction');
      await leave(page, '#fld-area', '1,200');
      await page.selectOption('#fld-item-1-head', 'earthwork');
      await leave(page, '#fld-item-1-description', 'Excavation for foundations');
      await leave(page, '#fld-item-1-quantity', '45');
      await leave(page, '#fld-item-1-rate', '350');
      await page.check('#fld-gst-add');
      await leave(page, '#fld-gstPct', '18');
    },
  },
  // The project report on fictional case R (UX1).
  '/project-report/': {
    empty: async () => {},
    partly: async (page) => { await page.check('#fld-borrower-firm'); await leave(page, '#fld-cost-building', '10 L'); },
    provisional: async (page) => caseR(page, false),
    error: async (page) => { await page.check('#fld-borrower-firm'); await leave(page, '#fld-tl-amount', 'seventy'); },
    result: async (page) => caseR(page),
    // Case R with its sales cut to 70 lakh (tests/viable.test.ts): it misses a lender's levels (DESIGN-LESSONS 11, UX5c).
    missed: async (page) => { await caseR(page); await page.locator('#more-options summary').click(); await leave(page, '#fld-sales', '70 L'); await page.locator('#more-options summary').click(); },
    plan: async (page) => { await caseR(page); await page.getByTestId('rep-viable').click(); },
    download: async (page) => {
      await caseR(page);
      await leave(page, '#fld-rep-name', 'Asha Packaging');
      await leave(page, '#fld-rep-activity', 'Manufacture of corrugated boxes');
      await page.locator('#download').scrollIntoViewIfNeeded();
    },
  },
  '/': { page: async () => {} },
};

/** After a state's last step the focus is still on a control, never dropped to the page (WCAG 2.4.3; DESIGN-LESSONS lesson 1, recurred on /cma/ and /project-report/ in UX1). */
export async function lostFocus(page, state) {
  if (state === 'empty' || state === 'page') return [];
  // Two frames first: a control that removes itself moves the focus on the next frame.
  return await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return document.activeElement === document.body || !document.activeElement; }) ? ['focus: dropped to the page after the last step (WCAG 2.4.3)'] : [];
}

/** The states the site check measures beside each page as it loads: an error, the plan's sliders, the result and the download row. */
export const SITE_STATES = ['error', 'plan', 'download'];

/** Opens a page as the site check does, at a width and in a scheme. */
export async function openAt(browser, url, { width = 'phone', scheme = 'light', reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: WIDTHS[width] ?? width, colorScheme: scheme, reducedMotion });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-02T10:00:00+05:30'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'), null, { timeout: 10000 }).catch(() => {});
  return { ctx, page };
}

/**
 * The site check's part: every page at 360 px and 1280 px, light and dark, as it loads and in its SITE_STATES, then 320 px and reduced motion, then the
 * token counts. A line already counted in the baseline's `known` (today's defects, the first review's findings) is
 * reported only when its count grows; every other line is a violation.
 */
export async function designChecks({ browser, BASE, pages, violations }) {
  const base = JSON.parse(await readFile(BASELINE, 'utf8'));
  const seen = new Map();
  const note = (key) => seen.set(key, (seen.get(key) ?? 0) + 1);
  for (const path of pages) {
    for (const width of ['phone', 'desktop']) {
      for (const scheme of ['light', 'dark']) {
        const { ctx, page } = await openAt(browser, BASE + path, { width, scheme });
        for (const l of await measure(page, { phone: width === 'phone' })) note(`${path} ${width} ${scheme}: ${l}`);
        await ctx.close();
      }
    }
    for (const state of SITE_STATES.filter((s) => STATES[path]?.[s])) {
      for (const width of ['phone', 'desktop']) {
        for (const scheme of ['light', 'dark']) {
          const { ctx, page } = await openAt(browser, BASE + path, { width, scheme });
          await STATES[path][state](page);
          for (const l of [...await lostFocus(page, state), ...await measure(page, { phone: width === 'phone' })]) note(`${path} ${state} ${width} ${scheme}: ${l}`);
          await ctx.close();
        }
      }
    }
    {
      const { ctx, page } = await openAt(browser, BASE + path, { width: { width: 320, height: 700 } });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (wide > 0) note(`${path} 320 px: scrolls sideways by ${wide} px`);
      await ctx.close();
    }
    {
      const { ctx, page } = await openAt(browser, BASE + path, { reducedMotion: 'reduce' });
      for (const x of await page.evaluate(moving)) note(`${path} reduced motion: still moves: ${x}`);
      await ctx.close();
    }
  }
  const known = base.known ?? {};
  for (const [key, n] of seen) if (n > (known[key] ?? 0)) violations.push(`design: ${key}${n > 1 ? ` (${n} times)` : ''}`);
  const gone = Object.keys(known).filter((k) => !seen.has(k) || seen.get(k) < known[k]);
  const t = await tokenCounts();
  for (const k of ['rawColour', 'arbitraryValue']) if (t[k] > base[k]) violations.push(`design: ${t[k]} ${k === 'rawColour' ? 'raw colour classes' : 'arbitrary values'} in site/src, more than the ${base[k]} allowed (use the tokens in docs/DESIGN.md)`);
  const lower = ['rawColour', 'arbitraryValue'].filter((k) => t[k] < base[k]).map((k) => `${k} ${base[k]} → ${t[k]}`);
  return { lines: seen.size, fixed: gone.length, lower, tokens: t };
}
