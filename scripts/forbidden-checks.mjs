/**
 * FinSight's rules (AG1, AG2; D-UX-67, D-UX-72; docs/DESIGN.md, "FinSight's rules"; the brief:
 * docs/design-reference/finsight.md), held on every page in the new look (`look="new"` in site/src/Base.astro). Each item a script can see is
 * tested here, at 360 and 1280 px; F3's cards, F8's underlines and the like are read off the page as it stands, F9 waits
 * for the motion to stop. The page's weight is printed and capped. Called by scripts/site-check.mjs.
 */
import { readFile } from 'node:fs/promises';
import { openAt } from './design-checks.mjs';

/** The pages in the new look: home, from UX3 the DSCR and CMA pages, from UX4 the estimate; the report next. */
export const NEW_LOOK = ['/', '/dscr/', '/cma/', '/estimate/', '/project-report/', '/404.html'];
/** F13: our order, the borrower's path (docs/design-reference/finsight.md, rule 10). */
export const ORDER = ['hero', 'story', 'tools', 'uses', 'figures', 'try', 'closing'];
/**
 * F15: the page's weight as it loads, before compression (HTML, styles, scripts, the fonts), in KB: 160 measured 14-10-2026
 * (D-UX-72), AG1's 124 with Anek (27 KB, one weight cut to the signs the pages use) and the line drawings; 166 with
 * AG3b's three trailers, the two later ones fetched only as the reader nears them (D-UX-78); 168 with AG3c's trailers
 * beside their text (D-UX-81). A heavier page lowers
 * something else first.
 */
export const WEIGHT_CAP = 170;

const SITE = await readFile(new URL('../site/src/site.ts', import.meta.url), 'utf8');
const TOOLS = [...SITE.matchAll(/status: 'Ready', href: '([^']+)'/g)].map((m) => m[1]);

/** Runs in the page: every item that reads the page as it stands. */
function inPage({ tools, order, phone }) {
  const out = [];
  const shown = (el) => getComputedStyle(el).clipPath !== 'inset(50%)' && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width > 1;
  const px = (el, k) => parseFloat(getComputedStyle(el)[k]);
  const name = (el) => (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  // F1: the text in Figtree, the headings in Anek, both loaded from here.
  if (!getComputedStyle(document.body).fontFamily.startsWith('Figtree') || !document.fonts.check('16px Figtree')) out.push('F1 the page is not set in Figtree');
  for (const h of document.querySelectorAll('h1, h2')) if (!getComputedStyle(h).fontFamily.startsWith('Anek')) out.push(`F1 the heading "${name(h)}" is not in Anek`);
  if (!document.fonts.check('500 16px Anek')) out.push('F1 Anek is not loaded');
  // F17: only paper casts a shadow (a page on the desk: the shadow-paper token).
  for (const el of document.querySelectorAll('main *, footer *')) if (getComputedStyle(el).boxShadow !== 'none' && !el.matches('.shadow-paper') && shown(el)) out.push(`F17 a shadow on something that is not paper: <${el.tagName.toLowerCase()}> "${name(el)}"`);
  // F2: large headings.
  const h1 = document.querySelector('h1');
  if (!h1 || px(h1, 'fontSize') < (phone ? 40 : 64)) out.push(`F2 the h1 is ${h1 ? px(h1, 'fontSize') : 0} px (want ${phone ? 40 : 64} or more)`);
  for (const h of document.querySelectorAll('main h2')) if (px(h, 'fontSize') < (phone ? 26 : 40)) out.push(`F2 the h2 "${name(h)}" is ${px(h, 'fontSize')} px`);
  // F3: no boxed cards; panels are set off by their fill.
  for (const el of document.querySelectorAll('main *, footer *')) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const all = ['Top', 'Right', 'Bottom', 'Left'].every((k) => parseFloat(s[`border${k}Width`]) >= 1 && s[`border${k}Style`] !== 'none');
    if (all && r.width > 40 && r.height > 40 && !el.matches('input, select, textarea, button, a') && shown(el)) out.push(`F3 a bordered box: <${el.tagName.toLowerCase()}> "${name(el)}"`);
  }
  // F4, F5: a filled link or button is a pill, in ink, canvas or the stage's ink; never the accent.
  const probe = document.createElement('i');
  probe.style.background = 'var(--accent)'; document.body.append(probe);
  const accent = getComputedStyle(probe).backgroundColor; probe.remove();
  for (const el of document.querySelectorAll('a, button')) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el), bg = s.backgroundColor, r = el.getBoundingClientRect();
    const filled = bg !== 'transparent' && !/rgba\(.*, 0\)$/.test(bg);
    if (filled && px(el, 'borderTopLeftRadius') < r.height / 2 - 1) out.push(`F4 a filled control that is not a pill: "${name(el)}"`);
    if (filled && r.height < 43.5) out.push(`F4 a filled control ${Math.round(r.height)} px tall (want 44): "${name(el)}"`);
    if (filled && bg === accent) out.push(`F5 a control filled with the accent: "${name(el)}"`);
    // F8: a link that stands alone is not underlined; a link inside a sentence keeps its line.
    const alone = el.tagName === 'A' && (el.parentElement?.textContent ?? '').trim() === (el.textContent ?? '').trim();
    if ((alone || filled) && s.textDecorationLine.includes('underline')) out.push(`F8 an underlined link that stands alone: "${name(el)}"`);
  }
  // F6, F7, F13: the sections run wide and tall, in the reference's order.
  const secs = [...document.querySelectorAll('[data-ag]')];
  if (order && secs.map((s) => s.dataset.ag).join() !== order.join()) out.push(`F13 the sections are ${secs.map((s) => s.dataset.ag).join(', ')}`);
  if (!phone) for (const s of secs) {
    const w = s.clientWidth - px(s, 'paddingLeft') - px(s, 'paddingRight'), h = s.getBoundingClientRect().height / innerHeight;
    if (w < 1100) out.push(`F6 the ${s.dataset.ag} section is ${Math.round(w)} px wide (want 1100 or more at 1280)`);
    if (h < 0.4) out.push(`F7 the ${s.dataset.ag} section is ${h.toFixed(2)} of a screen tall (want 0.4 or more)`);
  }
  // F11: every tool in the top bar, in the first screen.
  const header = document.querySelector('header');
  for (const t of tools) {
    const a = [...(header?.querySelectorAll(`a[href="${t}"]`) ?? [])].find(shown);
    if (!a || a.getBoundingClientRect().bottom > innerHeight) out.push(`F11 ${t} is not in the top bar's first screen`);
  }
  // F12: the foot links every tool and carries the name large.
  const foot = document.querySelector('footer');
  for (const t of tools) if (!foot?.querySelector(`a[href="${t}"]`)) out.push(`F12 the foot does not link ${t}`);
  if (!foot?.querySelector('[data-wordmark]')?.textContent?.trim()) out.push('F12 the foot has no name in large type');
  return out;
}

/**
 * Runs in the page: each tag of the row of what the tools give, its words against its fill as the eye meets them, any fade
 * counted (F18, AG3c). Colours come as oklch, so each is painted on a 1×1 canvas and read back (docs/GOTCHAS.md).
 */
export function tagContrast() {
  const g = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const rgba = (css) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under, a) => [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a));
  const lum = (c) => c.map((v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return [...document.querySelectorAll('[data-tags] li')].map((li) => {
    // The fade of the tag and of what holds it, down to the first solid ground: the page under the row.
    let op = 1, e = li, ground = null;
    for (; e && !ground; e = e.parentElement) { const s = getComputedStyle(e), bg = rgba(s.backgroundColor); if (e !== li && bg[3] === 1) ground = bg; else op *= parseFloat(s.opacity); }
    ground ??= [255, 255, 255, 1];
    const s = getComputedStyle(li), fill = rgba(s.backgroundColor), ink = rgba(s.color);
    const chip = over(fill, ground, fill[3]), word = over(ink, chip, ink[3]);
    return { t: li.textContent.trim(), r: ratio(over(word, ground, op), over(chip, ground, op)) };
  });
}

/** The headings and counted figures, the running animations and a picture of each field, to compare over time. */
const still = (page) => page.evaluate(() => ({
  typed: [...document.querySelectorAll('h1, h2, [data-count]')].map((e) => e.textContent),
  running: document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.constructor.name} on <${a.effect?.target?.tagName?.toLowerCase()}>`),
  fields: [...document.querySelectorAll('canvas[data-field], canvas[data-gather]')].map((c) => c.toDataURL().length + ':' + c.toDataURL().slice(-64)),
}));

/**
 * Tab against the eye (F19, AG3c): in the page's order, a control that comes next yet sits to the left in the same row,
 * or above in the same column, was moved by CSS `order` or a grid (WCAG 2.4.3). A control pinned to the screen (sticky or
 * fixed, as the tool pages' answer bar at the foot) has no place in the flow to compare, so it is left out (UX3). Runs in the page.
 */
export function tabAgainstEye() {
  const pinned = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) if (/sticky|fixed/.test(getComputedStyle(x).position)) return true; return false; };
  const els = [...document.querySelectorAll('main a[href], main button, main input, main select, main textarea, main [tabindex]')]
    .filter((e) => e.tabIndex >= 0 && !e.closest('[hidden], [inert], details:not([open]) > :not(summary)') && e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && !pinned(e));
  const out = [];
  for (let i = 1; i < els.length; i++) {
    const a = els[i - 1].getBoundingClientRect(), b = els[i].getBoundingClientRect();
    const row = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) / 2;
    const col = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0;
    if ((row && b.right <= a.left) || (col && !row && b.bottom <= a.top)) out.push(`"${els[i - 1].textContent.trim()}" then "${els[i].textContent.trim()}"`);
  }
  return out;
}

export async function forbiddenChecks({ browser, BASE, violations }) {
  let weight = 0;
  for (const path of NEW_LOOK) {
    const v = (m) => violations.push(`${path} FinSight's rules: ${m}`);
    for (const width of ['phone', 'desktop']) {
      const { ctx, page } = await openAt(browser, BASE + path, { width });
      for (const m of await page.evaluate(inPage, { tools: TOOLS, order: path === '/' ? ORDER : null, phone: width === 'phone' })) v(`${m} (${width})`);
      await ctx.close();
    }
    // F9, F10, F14, F15: the motion stops by itself, the words are whole from the start, nothing is fetched from elsewhere.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage(), hosts = new Set(), sizes = [];
    page.on('request', (r) => hosts.add(new URL(r.url()).origin));
    page.on('response', (r) => sizes.push(r.body().then((b) => b.length, () => 0)));
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    const first = await still(page);
    await page.waitForTimeout(6000);
    const settled = await still(page);
    await page.waitForTimeout(1000);
    const later = await still(page);
    const kb = Math.round((await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024);
    if (path === '/') weight = kb;
    if (first.typed.join('|') !== settled.typed.join('|')) v('F10 a heading\'s words or a counted figure are not in the page from the start');
    if (await page.locator('[data-typed]').count()) v('F10 a heading still types itself');
    if (settled.running.length) v(`F9 still moving 6 s after load: ${[...new Set(settled.running)].join(', ')}`);
    if (settled.fields.join() !== later.fields.join()) v('F9 a field of dashes still moves 6 s after load');
    for (const h of hosts) if (h !== BASE) v(`F14 a request to ${h}`);
    if (path === '/' && kb > WEIGHT_CAP) v(`F15 the page weighs ${kb} KB as it loads (cap ${WEIGHT_CAP} KB)`);
    await ctx.close();
    // Under reduced motion nothing moves at all.
    const rm = await openAt(browser, BASE + path, { width: 'desktop', reducedMotion: 'reduce' });
    const a = await still(rm.page);
    await rm.page.waitForTimeout(800);
    const b = await still(rm.page);
    if (b.running.length || a.fields.join() !== b.fields.join()) v('F9 something moves under reduced motion');
    await rm.ctx.close();
    // F18: the tag row reads as it comes into view, light and dark: 150 ms after its top enters the screen each tag's
    // words stand at 4.5:1 on its fill, a fade counted (AG3c; the owner saw them faint while they settled one by one).
    if (path === '/') for (const colorScheme of ['light', 'dark']) {
      const tc = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
      const tp = await tc.newPage();
      await tp.goto(BASE + path);
      await tp.evaluate(() => { const u = document.querySelector('[data-tags]'); if (u) scrollTo({ top: u.getBoundingClientRect().top + scrollY - innerHeight * 0.8, behavior: 'instant' }); });
      await tp.waitForTimeout(150);
      const tags = await tp.evaluate(tagContrast);
      if (!tags.length) v('F18 no tag row ([data-tags] li) to measure');
      for (const t of tags.filter((x) => x.r < 4.5).slice(0, 3)) v(`F18 the tag "${t.t}" reads ${t.r.toFixed(1)}:1 as it comes into view, ${colorScheme} (want 4.5)`);
      await tc.close();
    }
    // F19: Tab follows the eye at 360 and where lg's layouts start and widen (AG3c: the trailers' buttons swapped at lg).
    for (const w of [360, 1024, 1280]) {
      const oc = await browser.newContext({ viewport: { width: w, height: 900 } });
      const op = await oc.newPage();
      await op.goto(BASE + path, { waitUntil: 'load' });
      await op.waitForTimeout(300);
      for (const m of (await op.evaluate(tabAgainstEye)).slice(0, 3)) v(`F19 Tab runs against the eye at ${w} px: ${m}`);
      await oc.close();
    }
    // F9 on a phone and on a short screen (1280 at 400%): scrolled through, every block that settles or lands shows, every
    // line of the story's three trailers is written in strokes, the two that come as the reader nears them included
    // (D-UX-77, D-UX-78), and no two figures in a chart overlap (lesson 6). A block that waits for a share of its height
    // never shows on a short one.
    for (const [w, h] of [[360, 740], [320, 256]]) {
      const sc = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await sc.newPage();
      await p.goto(BASE + path);
      await p.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
      });
      await p.waitForTimeout(5000);
      const r = await p.evaluate(() => {
        const hidden = [...document.querySelectorAll('[data-settle], [data-at]')].filter((e) => getComputedStyle(e).opacity !== '1')
          .concat([...document.querySelectorAll('.js [data-trailer] [data-beat]')].filter((b) => getComputedStyle(b).opacity !== '1'
            || getComputedStyle(b).visibility !== 'visible' || (b.dataset.beat !== 'card' && !b.querySelector('svg path'))
            || [...b.querySelectorAll('path')].some((p) => parseFloat(getComputedStyle(p).strokeDashoffset) > 0.001)))
          .map((e) => `<${e.tagName.toLowerCase()}> "${(e.textContent ?? '').trim().slice(0, 30)}"`);
        const boxes = [...document.querySelectorAll('figure span, figure li')].filter((e) => e.childElementCount === 0 && e.textContent?.trim())
          .map((e) => ({ t: e.textContent.trim(), b: e.getBoundingClientRect() })).filter(({ b }) => b.width > 1 && b.height > 1);
        const overlaps = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i].b, B = boxes[j].b;
          if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 1 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 1) overlaps.push(`${boxes[i].t} and ${boxes[j].t}`);
        }
        return { hidden, overlaps };
      });
      for (const x of r.hidden.slice(0, 3)) v(`F9 still hidden after scrolling through at ${w}×${h}: ${x}`);
      for (const x of r.overlaps.slice(0, 3)) v(`principle 5: chart figures overlap at ${w}×${h}: ${x}`);
      await sc.close();
    }
  }
  return { pages: NEW_LOOK.length, weight };
}
