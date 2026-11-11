/**
 * What a page must never do to a reader, whatever its look (CHECKS1, D-TECH-113): keep moving past 5 s or under reduced
 * motion (WCAG 2.2.2), leave its content unshown under reduced motion or after a scroll, fetch from another host (the
 * claim "nothing leaves your browser"), or send Tab against the eye (WCAG 2.4.3). The look itself (fonts, sizes, boxes,
 * the order of sections) is judged by eye and is no part of any check. Called by scripts/site-check.mjs on every built
 * page; home's weight is printed, never capped (the honest speed measure is scripts/speed.mjs).
 */
import { openAt } from './design-checks.mjs';

/** The headings and counted figures, the running animations and a picture of each field, to compare over time. */
const still = (page) => page.evaluate(() => ({
  running: document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.constructor.name} on <${a.effect?.target?.tagName?.toLowerCase()}>`),
  fields: [...document.querySelectorAll('canvas[data-field]')].map((c) => c.toDataURL().length + ':' + c.toDataURL().slice(-64)),
}));

/**
 * Tab against the eye: in the page's order, a control that comes next yet sits to the left in the same row, or above in
 * the same column, was moved by CSS `order` or a grid (WCAG 2.4.3). A control pinned to the screen (sticky or fixed, as
 * the tool pages' answer bar at the foot) has no place in the flow to compare, so it is left out. Runs in the page.
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

/**
 * Runs in the page: a part that animates in (home's diagram and scenes) and is not whole. Under reduced motion the HTML
 * stands as it is, so every line, bar and mark must show whole and nothing may wait behind "Show it all". Empty when the
 * page has no such part. The look report uses it too, after a scene has played.
 */
export function unfinished() {
  const out = [], js = document.documentElement.classList.contains('js');
  for (const box of document.querySelectorAll('[data-intro], [data-how], [data-scene]')) {
    const id = box.dataset.intro ?? (box.dataset.scene ? `${box.dataset.scene} scene` : 'how it works');
    if (js && !box.hasAttribute('data-played')) out.push(`${id} has not played`);
    if (box.getAnimations({ subtree: true }).length) out.push(`${id} still holds ${box.getAnimations({ subtree: true }).length} animations`);
    const part = [...box.querySelectorAll('[data-ln], [data-kv], [data-row], [data-mark], [data-bar], [data-box], [data-draw], [data-card], [data-dl], [data-file]')].find((e) => {
      const s = getComputedStyle(e);
      return s.opacity !== '1' || (e.matches('[data-bar]') && s.transform !== 'none') || (e.matches('[data-draw]') && parseFloat(s.strokeDashoffset) > 0.001);
    });
    if (part) out.push(`${id}: <${part.tagName.toLowerCase()}> "${(part.textContent ?? '').trim().slice(0, 30)}" is not whole`);
    if ([...box.querySelectorAll('[data-show]')].some((b) => !b.hidden)) out.push(`${id} still offers "Show it all"`);
  }
  return out;
}

/** `pages` are the built pages to read; `motion` false (the site check's --quick without home) skips the checks that wait on motion. */
export async function forbiddenChecks({ browser, BASE, pages, motion = true, violations }) {
  let weight = 0;
  for (const path of pages) {
    const v = (m) => violations.push(`${path}: ${m}`);
    if (motion) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage(), hosts = new Set(), sizes = [];
      page.on('request', (r) => hosts.add(new URL(r.url()).origin));
      page.on('response', (r) => sizes.push(r.body().then((b) => b.length, () => 0)));
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(6000);
      const settled = await still(page);
      await page.waitForTimeout(1000);
      const later = await still(page);
      if (path === '/') weight = Math.round((await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024);
      if (settled.running.length) v(`still moving 6 s after load: ${[...new Set(settled.running)].join(', ')} (WCAG 2.2.2)`);
      if (settled.fields.join() !== later.fields.join()) v('a field of dashes still moves 6 s after load (WCAG 2.2.2)');
      for (const h of hosts) if (h !== BASE) v(`a request to ${h}: nothing is fetched from another host`);
      await ctx.close();
      // Under reduced motion nothing moves at all, and what would have animated in stands whole.
      const rm = await openAt(browser, BASE + path, { width: 'desktop', reducedMotion: 'reduce' });
      const a = await still(rm.page);
      await rm.page.waitForTimeout(800);
      const b = await still(rm.page);
      if (b.running.length || a.fields.join() !== b.fields.join()) v('something moves under reduced motion');
      for (const x of (await rm.page.evaluate(unfinished)).slice(0, 3)) v(`not all there under reduced motion: ${x}`);
      await rm.ctx.close();
    }
    // Tab follows the eye at 360 and where the wide layouts start and widen.
    for (const w of [360, 1024, 1280]) {
      const oc = await browser.newContext({ viewport: { width: w, height: 900 } });
      const op = await oc.newPage();
      await op.goto(BASE + path, { waitUntil: 'load' });
      await op.waitForTimeout(300);
      for (const m of (await op.evaluate(tabAgainstEye)).slice(0, 3)) v(`Tab runs against the eye at ${w} px: ${m} (WCAG 2.4.3)`);
      await oc.close();
    }
    if (!motion) continue;
    // On a phone and on a short screen (1280 at 400%), scrolled through: every block that waits to settle or land shows
    // (one that waits for a share of its height never shows on a short screen), and no two figures in a chart overlap.
    // A page whose scenes play as they come into view is given their 32.5 s; any other is read as soon as its blocks show, or after 14 s.
    for (const [w, h] of [[360, 740], [320, 256]]) {
      const sc = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await sc.newPage();
      await p.goto(BASE + path);
      {
        await p.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
        });
        if (await p.locator('[data-scene]').count()) await p.waitForTimeout(34000);
        else await p.waitForFunction(() => [...document.querySelectorAll('[data-settle], [data-at]')].every((e) => getComputedStyle(e).opacity === '1'), null, { timeout: 14000 }).catch(() => {});
        const r = await p.evaluate(() => {
          const hidden = [...document.querySelectorAll('[data-settle], [data-at]')].filter((e) => getComputedStyle(e).opacity !== '1')
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
        for (const x of r.hidden.slice(0, 3)) v(`still hidden after scrolling through at ${w}×${h}: ${x}`);
        for (const x of r.overlaps.slice(0, 3)) v(`chart figures overlap at ${w}×${h}: ${x}`);
      }
      await sc.close();
    }
  }
  return { pages: pages.length, weight };
}
