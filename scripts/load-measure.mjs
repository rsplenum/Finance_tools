/**
 * The load measure, a prototype (UX2, D-UX-61). The paper, with what each count stands for in the reader's head, its
 * source, what it misses and how it could be gamed: docs/LOAD-MEASURE.md. Opens each built page at 360 by 780 px, light,
 * as it loads and in its answer state (the default path filled, from scripts/design-checks.mjs STATES), and prints its
 * twelve counts as one table row a page. It fails nothing yet: UX2b makes it a ratchet in the site check.
 *
 *   node scripts/load-measure.mjs [/dscr/ ...] [--text] [--no-effects]
 * --text also prints what the counts saw: the long sentences, the abbreviations, the text styles, the colours and the
 * controls whose figures move out of sight (the writer's and the critic's input). --no-effects skips the slowest count.
 * Run after `npm run build`.
 */
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';
import { openAt, STATES } from './design-checks.mjs';

/** Each page: the state that answers (none on a page without questions), its answer, and an echo of it that stays in view. */
export const PAGES = {
  '/': { answer: 'main a[href^="/"]' },
  '/dscr/': { state: 'result', answer: '[data-testid=dscr-verdict]', echo: '[data-testid=answer-bar]' },
  '/cma/': { state: 'result', answer: '[data-testid=cma-status]' },
  '/estimate/': { state: 'result', answer: '[data-testid=pl-total]', echo: '[data-testid=pl-sticky-total]' },
  '/project-report/': { state: 'result', answer: '[data-testid=rep-status]' },
  '/404.html': { answer: 'main a[href="/"]' },
};
const LONG = 25; // words: GOV.UK, "Use clear language" (try to split a longer sentence)

/** Runs in the page: every count that reads the page as it stands. `after`: measured where a state's last step left the reader. */
function inPage({ answer, echo, after, open, text, limit = 25 }) {
  const main = document.querySelector('main') ?? document.body;
  const H = innerHeight, Y = scrollY;
  const box = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
  const shown = (el) => !!el && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !!box(el);
  // A radio or checkbox drawn as a card hides its input: its label shows it.
  const shownControl = (el) => shown(el) || [...(el.labels ?? [])].some(shown);
  const words = (t) => t.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w));
  const range = document.createRange();

  // Opening every closed part counts the words behind a tap too; they close again after.
  const closed = open ? [...main.querySelectorAll('details:not([open])')] : [];
  for (const d of closed) d.open = true;
  const nodes = [];
  const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    if (!t || !shown(n.parentElement)) continue;
    range.selectNodeContents(n);
    nodes.push({ n, t, top: range.getBoundingClientRect().top + Y });
  }
  for (const d of closed) d.open = false;
  if (open) return { wordsAll: nodes.reduce((s, x) => s + words(x.t).length, 0) };

  // Questions: fields, a radio group once, a row of pressed buttons once.
  const FIELD = 'input:not([type=hidden],[type=button],[type=submit],[type=reset]), select, textarea, button[aria-pressed]';
  const seen = new Set(), questions = [];
  for (const el of main.querySelectorAll(FIELD)) {
    if (!shownControl(el)) continue;
    const key = el.type === 'radio' ? `r:${el.name}` : el.matches('[aria-pressed]') ? el.parentElement : el;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(el);
  }
  const controls = [...main.querySelectorAll('a[href], button, summary, ' + FIELD)].filter(shownControl);
  const choices = new Set(controls.map((el) => (el.type === 'radio' ? `r:${el.name}` : el))).size;

  // Before the first question (or the first control, on a page without questions).
  const first = questions[0] ?? controls[0];
  const firstTop = first ? ((box(first) ?? box(first.labels?.[0]))?.top ?? Infinity) + Y : Infinity;
  const before = nodes.filter((x) => x.top < firstTop).reduce((s, x) => s + words(x.t).length, 0);

  // Sentences: the text of each block, split where a sentence ends.
  const blocks = new Map();
  const blockOf = (el) => { for (let e = el; e && e !== main; e = e.parentElement) if (!getComputedStyle(e).display.startsWith('inline')) return e; return main; };
  for (const x of nodes) { const b = blockOf(x.n.parentElement); blocks.set(b, `${blocks.get(b) ?? ''} ${x.t}`); }
  const sentences = [...blocks.values()].flatMap((t) => t.trim().split(/(?<=[.!?])\s+(?=[A-Z"'(])/));
  const long = sentences.filter((s) => words(s).length > limit);
  const all = nodes.map((x) => x.t).join(' ');
  const abbr = [...new Set((all.match(/\b[A-Z][A-Z0-9]*[A-Z][A-Z0-9]*s?\b/g) ?? []).map((a) => a.replace(/s$/, '')))].filter((a) => !/^[IVXLC]+$/.test(a)).sort();

  // Visual codes: text styles (size and weight), and colours that are not grey, merged within 15 degrees of hue.
  const styles = new Map();
  for (const x of nodes) { const s = getComputedStyle(x.n.parentElement); const k = `${parseFloat(s.fontSize)}px ${+s.fontWeight >= 600 ? 'bold' : 'regular'}`; styles.set(k, (styles.get(k) ?? 0) + 1); }
  const hues = new Map();
  // Tailwind 4 gives oklch(); a canvas turns any colour, its see-through part taken off, into sRGB.
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const hue = (c) => {
    if (!c || c === 'none' || c === 'transparent') return;
    const al = c.match(/\/\s*([\d.]+)(%?)\s*\)$/) ?? c.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    if (al && (al[2] === '%' ? al[1] / 100 : +al[1]) < 0.05) return;
    cv.fillStyle = '#000';
    cv.fillStyle = c.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')').replace(/^rgba\(([^,]+,[^,]+,[^,]+),[^)]+\)/, 'rgb($1)');
    cv.fillRect(0, 0, 1, 1);
    // OKLCH from sRGB (Ottosson, 2020): a grey, a slate or a pale tint (which here always sits under a stronger colour of the same meaning) has a chroma under 0.07.
    const [r, g, b] = [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    const [l, m, q] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
    if (Math.hypot(A, B) < 0.07) return;
    const h = Math.round((Math.atan2(B, A) * 180 / Math.PI + 360) % 360);
    if (!hues.has(h)) hues.set(h, c);
  };
  for (const el of [main, ...main.querySelectorAll('*')]) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el);
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) hue(s.color);
    hue(s.backgroundColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s[`border${side}Width`]) > 0) hue(s[`border${side}Color`]);
    if (el instanceof SVGElement) { hue(s.fill); hue(s.stroke); }
  }
  const sorted = [...hues.keys()].sort((a, b) => a - b), families = [];
  for (const h of sorted) { const f = families.at(-1); if (f && h - f.at(-1) <= 15) f.push(h); else families.push([h]); }
  if (families.length > 1 && sorted[0] + 360 - sorted.at(-1) <= 15) families[0].push(...families.pop());

  // The answer: how far down the page, and how far from where the state's last step left the reader (nil when it or an echo of it is in view).
  const ans = document.querySelector(answer);
  const ar = ans && shown(ans) ? ans.getBoundingClientRect() : null;
  const e = echo && document.querySelector(echo), er = e && shown(e) ? e.getBoundingClientRect() : null;
  const inView = (r) => r && r.top < H && r.bottom > 0;
  const gap = !after || !ar ? null : inView(er) || inView(ar) ? 0 : Math.round(ar.top >= H ? ar.top - H : -ar.bottom);
  return {
    before, firstTop: Math.round(firstTop), wordsShown: nodes.reduce((s, x) => s + words(x.t).length, 0), long: long.length,
    abbr: abbr.length, questions: questions.length, controls: choices,
    answerTop: ar ? Math.round(ar.top + Y) : null, gap, styles: styles.size, colours: families.length,
    seen: text ? { long: long.map((s) => `${words(s).length}: ${s.slice(0, 160)}`), abbr, styles: [...styles].map(([k, n]) => `${k} (${n})`),
      colours: families.map((f) => `${f[0]}-${f.at(-1)}deg ${hues.get(f[0])}`) } : undefined,
  };
}

/** Runs in the page: watch the text that changes after a control moves, from where the control stands in the middle of the screen. */
function watch() {
  window.__moved = new Set();
  window.__obs?.disconnect();
  window.__obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') window.__moved.add(m.target);
      for (const n of m.addedNodes) {
        if (n.nodeType === 3) window.__moved.add(n);
        else if (n.nodeType === 1) { const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); for (let t = w.nextNode(); t; t = w.nextNode()) window.__moved.add(t); }
      }
    }
  });
  window.__obs.observe(document.querySelector('main') ?? document.body, { subtree: true, childList: true, characterData: true });
}
/** Runs in the page: of the figures that moved (outside the control, its label and its own read-back), how many and how many in view. */
async function moved(el) {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__obs.disconnect();
  el.scrollIntoView({ block: 'center' });
  const own = [el, ...(el.labels ?? []), ...(el.getAttribute('aria-describedby') ?? '').split(' ').map((id) => id && document.getElementById(id))]
    .concat(['said', 'hint', 'error'].map((s) => el.id && document.getElementById(`${el.id}-${s}`))).filter(Boolean);
  let figures = 0, inView = 0;
  const range = document.createRange();
  for (const n of window.__moved) {
    if (!n.isConnected || !/\d/.test(n.textContent) || own.some((o) => o.contains(n))) continue;
    const p = n.parentElement;
    if (!p.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    figures++;
    if (r.top < innerHeight && r.bottom > 0) inView++;
  }
  return { figures, inView };
}

/** Moves each control of the answer state once and back: the controls whose figures all move out of the reader's view. */
async function effects(page) {
  const handles = await page.$$('main input:not([type=hidden],[type=button],[type=submit],[type=reset],[type=month],[type=date]), main select, main button[aria-pressed=true]');
  const out = [], groups = new Set();
  let tried = 0;
  for (const h of handles) {
    const c = await h.evaluate((el) => ({
      type: el.type, tag: el.tagName, id: el.id, name: el.name, value: el.value, checked: el.checked, min: +el.min, max: +el.max, step: +el.step || 1,
      shown: el.checkVisibility() || [...(el.labels ?? [])].some((l) => l.checkVisibility()), label: (el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 40),
    }));
    if (!c.shown) continue;
    let change, undo;
    if (c.type === 'radio' || c.tag === 'BUTTON') {
      const key = c.type === 'radio' ? c.name : await h.evaluate((el) => { el.parentElement.dataset.lm ??= Math.random(); return el.parentElement.dataset.lm; });
      if (groups.has(key)) continue;
      groups.add(key);
      const other = c.type === 'radio' ? await page.$(`main input[type=radio][name="${c.name}"]:not(:checked):not(:disabled)`) : await h.evaluateHandle((el) => el.parentElement.querySelector('button[aria-pressed=false]'));
      if (!other || !(await other.asElement())) continue;
      change = () => other.evaluate((el) => el.click());
      undo = () => h.evaluate((el) => el.click());
    } else if (c.type === 'checkbox') {
      change = undo = () => h.evaluate((el) => el.click());
    } else if (c.tag === 'SELECT') {
      const next = await h.evaluate((el) => [...el.options].find((o) => !o.selected && !o.disabled)?.value);
      if (next === undefined) continue;
      change = () => h.selectOption(next);
      undo = () => h.selectOption(c.value);
    } else if (c.type === 'range') {
      const to = Math.min(c.max, +c.value + Math.max(c.step, Math.round((c.max - c.min) / 5 / c.step) * c.step));
      const set = (v) => h.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(v));
      change = () => set(to === +c.value ? c.min : to);
      undo = () => set(c.value);
    } else {
      // A typed figure doubled ("5 L" to "10 L"); a field with no figure in it (a name, an empty one) changes none.
      if (!/\d/.test(c.value) || /^\d{4}-\d{2}/.test(c.value)) continue;
      const doubled = c.value.replace(/\d[\d,]*(\.\d+)?/, (m) => String(+m.replace(/,/g, '') * 2));
      change = async () => { await h.fill(doubled); await h.press('Tab'); };
      undo = async () => { await h.fill(c.value); await h.press('Tab'); };
    }
    await h.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.evaluate(watch);
    await change();
    const m = await h.evaluate(moved);
    await undo();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (!m.figures) continue;
    tried++;
    if (!m.inView) out.push(`${c.label} (${m.figures} figures moved, none in view)`);
  }
  return { tried, out };
}

const args = process.argv.slice(2);
const text = args.includes('--text'), skipEffects = args.includes('--no-effects');
const only = args.filter((a) => a.startsWith('/'));
const { BASE, server } = await serveDist();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [], notes = [];
for (const [path, p] of Object.entries(PAGES)) {
  if (only.length && !only.includes(path)) continue;
  // As it loads: the words before the first question and the questions asked.
  let { ctx, page } = await openAt(browser, `${BASE}${path}`);
  const atLoad = await page.evaluate(inPage, { answer: p.answer });
  if (p.state) {
    await ctx.close();
    ({ ctx, page } = await openAt(browser, `${BASE}${path}`));
    await STATES[path][p.state](page);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  const at = await page.evaluate(inPage, { answer: p.answer, echo: p.echo, after: !!p.state, text, limit: LONG });
  const { wordsAll } = await page.evaluate(inPage, { answer: p.answer, open: true });
  const eff = p.state && !skipEffects ? await effects(page) : null;
  await ctx.close();
  const screens = (px) => (px === null ? '-' : (px / 780).toFixed(1));
  rows.push([path, atLoad.before, screens(atLoad.firstTop), at.wordsShown, wordsAll, at.long, at.abbr, atLoad.questions, at.controls,
    screens(at.answerTop), at.gap ?? '-', at.styles, at.colours, eff ? `${eff.out.length} of ${eff.tried}` : '-']);
  if (text) notes.push(`\n${path}\n  long sentences: ${at.seen.long.join('\n    ') || 'none'}\n  abbreviations: ${at.seen.abbr.join(', ')}\n  text styles: ${at.seen.styles.join(', ')}\n  colours: ${at.seen.colours.join(', ')}${eff ? `\n  out of sight: ${eff.out.join('; ') || 'none'}` : ''}`);
}
await browser.close();
server.close();
const head = ['Page', 'Words before Q1', 'Q1 at (screens)', 'Words shown', 'Words in all', 'Long sentences', 'Abbreviations', 'Questions', 'Controls',
  'Answer at (screens)', 'From last step to answer (px)', 'Text styles', 'Colours', 'Out of sight'];
console.log(`| ${head.join(' | ')} |\n|${head.map((_, i) => (i ? '---:' : '---')).join('|')}|`);
for (const r of rows) console.log(`| ${r.join(' | ')} |`);
if (text) console.log(notes.join('\n'));
