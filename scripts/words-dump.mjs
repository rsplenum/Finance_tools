/**
 * What a reader meets on a page, as text (WORDS1): each page's shown text at 360 px, as it loads and in its answer state,
 * one line a text node, with the word count the load measure takes. `node scripts/words-dump.mjs <out dir> [/dscr/ ...]`
 * writes <page>.load.txt, <page>.answer.txt and a full-page picture of each; prints one line a page. After `npm run build`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';
import { openAt, STATES } from './design-checks.mjs';

const [out, ...rest] = process.argv.slice(2);
const pages = rest.length ? rest : ['/', '/dscr/', '/cma/', '/estimate/', '/project-report/'];
function shownText() {
  const main = document.querySelector('main') ?? document.body;
  const lines = [];
  const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(), el = n.parentElement;
    if (!t || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 1 && r.height > 1) lines.push(t);
  }
  return lines;
}
const count = (lines) => lines.reduce((s, t) => s + t.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length, 0);
await mkdir(out, { recursive: true });
const { BASE, server } = await serveDist();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const path of pages) {
  const name = path === '/' ? 'home' : path.replaceAll('/', '');
  const got = {};
  for (const when of ['load', 'answer']) {
    const state = when === 'answer' ? STATES[path]?.result : null;
    if (when === 'answer' && !state) continue;
    const { ctx, page } = await openAt(browser, `${BASE}${path}`, { reducedMotion: 'reduce' });
    if (state) await state(page);
    await page.waitForTimeout(300);
    const lines = await page.evaluate(shownText);
    got[when] = count(lines);
    // The record's own codes, anywhere in the page, opened or closed: none may reach the screen.
    const codes = await page.evaluate(() => [...new Set(document.body.textContent.match(/\bD-[A-Z]+-\d+/g) ?? [])]);
    if (codes.length) got[`${when} codes`] = codes;
    await writeFile(`${out}/${name}.${when}.txt`, lines.join('\n') + '\n');
    await page.screenshot({ path: `${out}/${name}.${when}.png`, fullPage: true });
    await ctx.close();
  }
  console.log(path, JSON.stringify(got));
}
await browser.close();
server.close();
