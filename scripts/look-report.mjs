/**
 * The look, for Rahul to read (CHECKS1, D-TECH-113; D-TECH-110): what a page looks and reads like, printed and never a
 * gate. This script always ends with 0 and is no part of `npm run verify` or of CI: taste is judged by eye, and a page
 * that changes shape changes these lines without failing anything.
 *
 *   npm run look [/dscr/ ...] [--text]      after `npm run build`
 *
 * It prints the load measure's table (scripts/load-measure.mjs: words, long sentences, abbreviations, controls, where the
 * answer stands, styles, colours, figures out of sight; --text adds what each count saw); for each tool with its answer
 * on the page, the words shown with it, how many screens under it the download stands and what stands before the first
 * question; home's weight as it loads; and home's scenes on two phones, held at every shot of every beat.
 */
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';
import { openAt, STATES } from './design-checks.mjs';
import { builtPages, loadTable } from './load-measure.mjs';
import { unfinished } from './forbidden-checks.mjs';

/**
 * Runs in the page (HOME1f, D-UX-255): below 1024 px a tool's scene is one frame that fits the screen under the header.
 * The scene is held at each time in `times` (ms; every shot of every beat) and is looked at for being no taller than the screen
 * less the header, show every line of text it shows whole inside its frame and none over another, and scale no layer
 * below 0.9 to fit (--fit, home.ts). A line counts as shown at an opacity of half or more, its ancestors' and their
 * `filter: opacity()` included (the camera, scene.ts). Returns what it sees.
 */
function sceneFrame([id, times]) {
  const root = document.querySelector(`[data-scene="${id}"]`), out = [];
  if (!root) return [`there is no ${id} scene`];
  const header = document.querySelector('[data-header]'), room = innerHeight - (header ? header.getBoundingClientRect().height : 0);
  const canvas = root.querySelector('[data-canvas]'), anims = root.getAnimations({ subtree: true });
  const shown = (e) => {
    let o = 1;
    for (let x = e; x && x !== root.parentElement; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (s.visibility !== 'visible' && x === e) return 0;
      o *= parseFloat(s.opacity);
      const f = /opacity\(([\d.]+)(%?)\)/.exec(s.filter);
      if (f) o *= parseFloat(f[1]) / (f[2] ? 100 : 1);
    }
    return o;
  };
  const say = (n) => `"${n.textContent.trim().slice(0, 28)}"`;
  for (const t of times) {
    for (const a of anims) { a.pause(); a.currentTime = t; }
    const h = root.getBoundingClientRect().height;
    if (h > room + 0.5) out.push(`${id} at ${t} ms is ${Math.round(h)} px tall; the screen under the header has ${Math.round(room)} px`);
    for (const l of root.querySelectorAll('[data-panel], [data-doc]')) {
      const k = parseFloat(getComputedStyle(l).getPropertyValue('--fit') || '1');
      if (k < 0.9) out.push(`${id}'s ${l.matches('[data-doc]') ? 'document' : 'panel'} is scaled to ${k.toFixed(2)} to fit its frame (0.9 at least)`);
    }
    const frame = canvas?.parentElement?.getBoundingClientRect(), lines = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim() && !n.parentElement.closest('.sr-only') ? 1 : 2 });
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (shown(n.parentElement) < 0.5) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const b of r.getClientRects()) if (b.width > 1 && b.height > 1) lines.push({ n, b, inFrame: canvas?.contains(n) });
    }
    for (const { n, b, inFrame } of lines) if (inFrame && frame && (b.left < frame.left - 1 || b.right > frame.right + 1 || b.top < frame.top - 1 || b.bottom > frame.bottom + 1)) out.push(`${id} at ${t} ms: ${say(n)} is cut off by the frame`);
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const A = lines[i].b, B = lines[j].b;
      if (lines[i].n === lines[j].n) continue;
      const x = Math.min(A.right, B.right) - Math.max(A.left, B.left), y = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (x > 2 && y > 0.3 * Math.min(A.height, B.height)) out.push(`${id} at ${t} ms: ${say(lines[i].n)} and ${say(lines[j].n)} overlap`);
    }
  }
  return [...new Set(out)];
}

/** Runs in the page: with the answer shown, the words on the screen, the download's distance under the answer, and what stands before the first question. */
function answerLook() {
  const main = document.querySelector('main'), ans = main.querySelector('[data-answer]');
  const dl = [...main.querySelectorAll('[data-testid$="download-pdf"], #download, #pl-download')].find((e) => e.checkVisibility());
  const tool = main.querySelector('[data-tool]') ?? main, q = [...tool.querySelectorAll('fieldset, label, input, select')].find((e) => e.checkVisibility());
  const before = [];
  for (const el of tool.querySelectorAll('p, h2, h3, button, a, summary, ul')) {
    if (!q || q.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) break;
    if (!el.contains(q) && el.checkVisibility()) before.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`);
  }
  return {
    words: (main.innerText.match(/\S+/g) ?? []).length,
    screens: ans && dl ? (dl.getBoundingClientRect().top - ans.getBoundingClientRect().top) / innerHeight : null,
    before,
  };
}

const say = (line) => console.log(line);
async function main() {
  const args = process.argv.slice(2), only = args.filter((a) => a.startsWith('/'));
  const { BASE, server } = await serveDist();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pages = (await builtPages()).filter((p) => !only.length || only.includes(p));
  say('The look: for reading, never a gate.\n');
  say(await loadTable({ browser, BASE, pages, text: args.includes('--text') }));
  for (const path of pages.filter((p) => STATES[p]?.result)) {
    const first = await openAt(browser, BASE + path);
    const { before } = await first.page.evaluate(answerLook);
    await first.ctx.close();
    const { ctx, page } = await openAt(browser, BASE + path);
    await STATES[path].result(page);
    await page.waitForTimeout(500);
    const { words, screens } = await page.evaluate(answerLook);
    await ctx.close();
    say(`\n${path} on a phone: ${words} words shown with the answer; the download ${screens === null ? 'is not on the page yet' : `stands ${screens.toFixed(1)} screens under the answer`}; before the first question: ${before.join(' | ') || 'nothing'}`);
  }
  if (pages.includes('/')) {
    const wc = await browser.newContext({ viewport: { width: 1280, height: 900 } }), wp = await wc.newPage(), sizes = [];
    wp.on('response', (r) => sizes.push(r.body().then((b) => b.length, () => 0)));
    await wp.goto(BASE + '/', { waitUntil: 'networkidle' });
    await wp.waitForTimeout(3000);
    say(`\n/ weighs ${Math.round((await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024)} KB as it loads (the honest speed measure is scripts/speed.mjs)`);
    await wc.close();
    // Each scene held at every shot of every beat (scene.ts: the beats start at 0, 5, 11, 18 and 26.5 s; the whole is 32.5 s).
    for (const [w, h] of [[360, 640], [390, 844]]) {
      const fc = await browser.newContext({ viewport: { width: w, height: h } }), fp = await fc.newPage();
      await fp.goto(BASE + '/', { waitUntil: 'load' });
      const seen = [];
      for (const id of await fp.locator('[data-scene]').evaluateAll((els) => els.map((e) => e.dataset.scene))) {
        await fp.locator(`[data-scene="${id}"]`).evaluate((e) => e.scrollIntoView({ block: 'center' }));
        const runs = await fp.waitForFunction((id) => document.querySelector(`[data-scene="${id}"]`)?.hasAttribute('data-running'), id, { timeout: 8000 }).then(() => true, () => false);
        if (!runs) { seen.push(`the ${id} scene does not start when it is in view`); continue; }
        seen.push(...(await fp.evaluate(sceneFrame, [id, [4850, 10850, 17850, 21850, 26350, 32490]])).slice(0, 4));
      }
      await fp.waitForTimeout(1000);
      seen.push(...(await fp.evaluate(unfinished)).filter((x) => !/has not played|animations/.test(x)).slice(0, 3));
      say(`\n/ at ${w}×${h}, its scenes held at each shot: ${seen.length ? '\n  ' + seen.join('\n  ') : 'each fits the screen, whole and unscaled'}`);
      await fc.close();
    }
  }
  await browser.close();
  server.close();
}

// Never a gate: whatever happens, say it and end with 0.
await main().catch((e) => console.log(`the look report stopped: ${e.message}`));
process.exit(0);
