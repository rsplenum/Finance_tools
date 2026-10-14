/**
 * FinSight's rules (AG1, AG2; D-UX-67, D-UX-72; docs/DESIGN.md, "FinSight's rules"; the brief:
 * docs/design-reference/finsight.md), held on every page in the new look (`look="new"` in site/src/Base.astro). Each item a script can see is
 * tested here, at 360 and 1280 px; F3's cards, F8's underlines and the like are read off the page as it stands, F9 waits
 * for the motion to stop. The page's weight is printed and capped. Called by scripts/site-check.mjs.
 */
import { readFile } from 'node:fs/promises';
import { openAt } from './design-checks.mjs';

/** The pages in the new look; UX3 and UX4 add the tool pages. */
export const NEW_LOOK = ['/'];
/** F13: our order, the borrower's path (docs/design-reference/finsight.md, rule 10). */
export const ORDER = ['hero', 'story', 'tools', 'uses', 'figures', 'try', 'checked', 'closing'];
/**
 * F15: the page's weight as it loads, before compression (HTML, styles, scripts, the fonts), in KB: 157 measured 14-10-2026
 * (D-UX-72), AG1's 124 with Anek (27 KB, one weight cut to the signs the pages use) and the four line drawings. The cap
 * leaves 13 KB for AG3's story; a heavier page lowers something else first.
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

/** The headings and counted figures, the running animations and a picture of each field, to compare over time. */
const still = (page) => page.evaluate(() => ({
  typed: [...document.querySelectorAll('h1, h2, [data-count]')].map((e) => e.textContent),
  running: document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.constructor.name} on <${a.effect?.target?.tagName?.toLowerCase()}>`),
  fields: [...document.querySelectorAll('canvas[data-field], canvas[data-gather]')].map((c) => c.toDataURL().length + ':' + c.toDataURL().slice(-64)),
}));

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
    weight = Math.round((await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024);
    if (first.typed.join('|') !== settled.typed.join('|')) v('F10 a heading\'s words or a counted figure are not in the page from the start');
    if (await page.locator('[data-typed]').count()) v('F10 a heading still types itself');
    if (settled.running.length) v(`F9 still moving 6 s after load: ${[...new Set(settled.running)].join(', ')}`);
    if (settled.fields.join() !== later.fields.join()) v('F9 a field of dashes still moves 6 s after load');
    for (const h of hosts) if (h !== BASE) v(`F14 a request to ${h}`);
    if (path === '/' && weight > WEIGHT_CAP) v(`F15 the page weighs ${weight} KB as it loads (cap ${WEIGHT_CAP} KB)`);
    await ctx.close();
    // Under reduced motion nothing moves at all.
    const rm = await openAt(browser, BASE + path, { width: 'desktop', reducedMotion: 'reduce' });
    const a = await still(rm.page);
    await rm.page.waitForTimeout(800);
    const b = await still(rm.page);
    if (b.running.length || a.fields.join() !== b.fields.join()) v('F9 something moves under reduced motion');
    await rm.ctx.close();
  }
  return { pages: NEW_LOOK.length, weight };
}
