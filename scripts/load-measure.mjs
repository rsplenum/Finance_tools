/**
 * The load measure (UX2, UX2b; D-UX-61, D-UX-62, D-UX-63). The paper, with what each count stands for in the reader's head,
 * its source, what it misses and how it could be gamed: docs/LOAD-MEASURE.md. Opens each built page at 360 by 780 px, light,
 * as it loads, in its answer state (the `result` state of scripts/design-checks.mjs, or as it loads on a page without
 * one) and in its plan state, and takes its counts. Each page marks its answer `data-answer` (words, not only a figure)
 * and a sticky echo of it `data-answer-echo`. The site check fails when a count differs from scripts/load-baseline.json:
 * a rise needs a decision, a fall a lower baseline in the same commit.
 *
 *   node scripts/load-measure.mjs [/dscr/ ...] [--text] [--no-effects]   the counts as a table, the aims under it
 *   node scripts/load-measure.mjs --lower [/dscr/ ...]                   writes the counts that fell, and new pages
 *   node scripts/load-measure.mjs --raise /dscr/ controls D-UX-63        writes one count that rose, with its decision
 * --text also prints what the counts saw: the long sentences, the abbreviations, the text styles, the colours and the
 * controls whose figures move out of sight (the writer's and the critic's input). --no-effects skips the slowest count.
 * Run after `npm run build`.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { DIST, serveDist } from './serve-dist.mjs';
import { openAt, STATES } from './design-checks.mjs';

const LONG = 25; // words: GOV.UK, "Use clear language" (try to split a longer sentence)

/** Runs in the page: every count that reads the page as it stands. `after`: measured where a state's last step left the reader. */
function inPage({ after, open, text, limit = 25 }) {
  const main = document.querySelector('main') ?? document.body;
  const box = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
  const shown = (el) => !!el && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !!box(el);
  // A radio or checkbox drawn as a card hides its input: its label shows it.
  const shownControl = (el) => shown(el) || [...(el.labels ?? [])].some(shown);
  const words = (t) => t.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w));
  const range = document.createRange();
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
  // The answer, marked on the page; the state ends on the last question shown above it, brought into view as typing it
  // would; where none shows (the estimate folds its questions once answered), where the state's last step left the screen.
  const marks = [...main.querySelectorAll('[data-answer]')].filter(shown), ans = marks[0];
  if (after && ans) {
    const last = questions.filter((q) => q.compareDocumentPosition(ans) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
    const at = last && (shown(last) ? last : [...last.labels].find(shown));
    at?.scrollIntoView({ block: 'nearest' });
  }
  const H = innerHeight, Y = scrollY;

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
  const hueAt = (c) => {
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
    return Math.round((Math.atan2(B, A) * 180 / Math.PI + 360) % 360);
  };
  const hue = (c) => { const h = hueAt(c); if (h !== undefined && !hues.has(h)) hues.set(h, c); };
  for (const el of [main, ...main.querySelectorAll('*')]) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el);
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) hue(s.color);
    hue(s.backgroundColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s[`border${side}Width`]) > 0) hue(s[`border${side}Color`]);
    if (el instanceof SVGElement) { hue(s.fill); hue(s.stroke); }
  }
  // Codes per meaning (docs/DESIGN-MATHS.md §2): each colour that means something is a token; each way it is drawn (text,
  // ground, rule, mark) is a code. One meaning wants one code, and two meanings never share a hue, so the count is the
  // codes past the first for each meaning in use, plus each pair of meanings in use whose hues lie within 15 degrees.
  const rgb = (c) => { cv.fillStyle = '#000'; cv.fillStyle = c.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')').replace(/^rgba\(([^,]+,[^,]+,[^,]+),[^)]+\)/, 'rgb($1)'); cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  // Its colour must not ease from one token to the next (the page eases colour), so each reading is the token's own.
  const probe = document.createElement('span'); probe.style.transition = 'none'; main.append(probe);
  const MEANING = { act: ['link', 'accent', 'accent-hover'], good: ['good', 'good-tint'], warn: ['warn', 'warn-tint'], bad: ['bad', 'bad-tint'], marigold: ['marigold'], margin: ['margin'], 'spark-1': ['spark-1'], 'spark-2': ['spark-2'], 'spark-3': ['spark-3'],
    ...Object.fromEntries(['living', 'bedroom', 'kitchen', 'bath', 'pooja', 'study', 'utility', 'store', 'passage', 'walls'].map((r) => [`share-${r}`, [`share-${r}`]])) };
  const tokens = Object.entries(MEANING).flatMap(([m, ts]) => ts.map((t) => { probe.style.color = `var(--${t})`; const c = getComputedStyle(probe).color; return c && c !== 'rgba(0, 0, 0, 0)' ? { m, c, v: rgb(c) } : null; }).filter(Boolean));
  probe.remove();
  const used = new Map();
  const code = (c, kind) => {
    if (!c || c === 'none' || c === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(c)) return;
    const v = rgb(c), t = tokens.find((x) => x.v.every((n, i) => Math.abs(n - v[i]) <= 2));
    if (t) (used.get(t.m) ?? used.set(t.m, new Set()).get(t.m)).add(kind);
  };
  for (const el of [main, ...main.querySelectorAll('*')]) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el);
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) code(s.color, 'text');
    code(s.backgroundColor, 'ground');
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s[`border${side}Width`]) > 0) code(s[`border${side}Color`], 'rule');
    if (el instanceof SVGElement) { code(s.fill, 'mark'); code(s.stroke, 'mark'); }
  }
  const mh = [...used.keys()].map((m) => [m, hueAt(tokens.find((x) => x.m === m).c)]).filter(([, h]) => h !== undefined);
  const shared = mh.flatMap(([a, ha], i) => mh.slice(i + 1).filter(([, hb]) => Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb)) <= 15).map(([b]) => `${a} and ${b}`));
  const codes = [...used.values()].reduce((n, k) => n + k.size - 1, 0) + shared.length;

  const sorted = [...hues.keys()].sort((a, b) => a - b), families = [];
  for (const h of sorted) { const f = families.at(-1); if (f && h - f.at(-1) <= 15) f.push(h); else families.push([h]); }
  if (families.length > 1 && sorted[0] + 360 - sorted.at(-1) <= 15) families[0].push(...families.pop());

  // The answer: how far down the page, and how far from where the state's last step left the reader (nil when it or an echo of it is in view).
  const ar = ans ? ans.getBoundingClientRect() : null;
  const e = document.querySelector('[data-answer-echo]'), er = e && shown(e) ? e.getBoundingClientRect() : null;
  const inView = (r) => r && r.top < H && r.bottom > 0;
  const gap = !after || !ar ? null : inView(er) || inView(ar) ? 0 : Math.round(ar.top >= H ? ar.top - H : -ar.bottom);
  return {
    before, firstTop: Math.round(firstTop), wordsShown: nodes.reduce((s, x) => s + words(x.t).length, 0), long: long.length,
    abbr: abbr.length, questions: questions.length, controls: choices,
    answerTop: ar ? Math.round(ar.top + Y) : null, gap, marks: marks.length, answerWords: ans ? words(ans.textContent.replace(/[\d.,]+/g, ' ').replace(/\bRs\b/g, '')).length : 0, styles: styles.size, colours: families.length, codes,
    seen: text ? { long: long.map((s) => `${words(s).length}: ${s.slice(0, 160)}`), abbr, styles: [...styles].map(([k, n]) => `${k} (${n})`),
      colours: families.map((f) => `${f[0]}-${f.at(-1)}deg ${hues.get(f[0])}`),
      codes: [...[...used].map(([m, k]) => `${m}: ${[...k].join(', ')}`), ...shared.map((x) => `one hue: ${x}`)] } : undefined,
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

/** The counts, their names in the table, and the aim each prints beside it from its source (docs/LOAD-MEASURE.md §5): printed, never failed. */
export const COUNTS = [
  ['before', 'Words before Q1', 40], ['shown', 'Words shown'], ['all', 'Words in all'], ['plan', 'Words in all, with the plan'], ['long', 'Long sentences', 0],
  ['abbr', 'Abbreviations'], ['questions', 'Questions'], ['controls', 'Controls'], ['answerAt', 'Answer at (screens)', 1],
  ['gap', 'From last step to answer (px)'], ['styles', 'Text styles'], ['colours', 'Colours'], ['codes', 'Extra codes', 0], ['outOfSight', 'Out of sight', 0],
];
/** The counts that hang on where text wraps, so on the fonts: compared only where the fonts match the baseline's (CI's runner may differ from the sessions'). */
const LAYOUT = ['answerAt', 'gap', 'outOfSight'];
/** The fonts, as the width of one line in the page's body text at 16 px. */
async function fontProbe(browser, BASE) {
  const { ctx, page } = await openAt(browser, `${BASE}/404.html`);
  const w = await page.evaluate(() => { const s = document.createElement('span'); s.textContent = 'Short by Rs. 4,19,502 of cash to pay the loan'; document.querySelector('main').append(s); const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 100) / 100; });
  await ctx.close();
  return w;
}
export const BASELINE = fileURLToPath(new URL('./load-baseline.json', import.meta.url));
const DECISIONS = fileURLToPath(new URL('../docs/DECISIONS.md', import.meta.url));

/** Every built page, as the site check lists them. */
export async function builtPages() {
  return (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html'))
    .map((f) => '/' + f.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1')).sort();
}

const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** One page's counts (nil where a count does not apply), its first question's place in screens, a defect in its marks, and what the counts saw. */
export async function countPage(browser, BASE, path, { text = false, effectsToo = true } = {}) {
  const state = STATES[path]?.result, plan = STATES[path]?.plan;
  // Each page is read still, under reduced motion: as a reader finds it once its motion has played (a heading typed in
  // full, a block risen into view; AG1, D-UX-67), not half drawn at the moment of loading.
  const open = () => openAt(browser, `${BASE}${path}`, { reducedMotion: 'reduce' });
  // As it loads: the words before the first question and the questions asked.
  let { ctx, page } = await open();
  const atLoad = await page.evaluate(inPage, {});
  if (state) {
    await ctx.close();
    ({ ctx, page } = await open());
    await state(page);
    await frames(page);
  }
  const at = await page.evaluate(inPage, { after: !!state, text, limit: LONG });
  const { wordsAll } = await page.evaluate(inPage, { open: true });
  const eff = state && effectsToo ? await effects(page) : null;
  await ctx.close();
  // The plan: text that shows only after a button, counted with every closed part opened (count 3's guard).
  let wordsPlan = null;
  if (plan) {
    ({ ctx, page } = await open());
    await plan(page);
    await frames(page);
    ({ wordsAll: wordsPlan } = await page.evaluate(inPage, { open: true }));
    await ctx.close();
  }
  const screens = (px) => (px === null ? null : Math.round(px / 78) / 10);
  const counts = {
    before: atLoad.before, shown: at.wordsShown, all: wordsAll, plan: wordsPlan, long: at.long, abbr: at.abbr, questions: atLoad.questions,
    controls: at.controls, answerAt: screens(at.answerTop), gap: at.gap, styles: at.styles, colours: at.colours, codes: at.codes, outOfSight: eff ? eff.out.length : null,
  };
  const defect = at.marks !== 1 ? `${at.marks} answers marked data-answer in view of the page (want 1)` : !at.answerWords ? 'the answer marked data-answer holds no words, only a figure' : null;
  const seen = text ? `\n${path}\n  long sentences: ${at.seen.long.join('\n    ') || 'none'}\n  abbreviations: ${at.seen.abbr.join(', ')}\n  text styles: ${at.seen.styles.join(', ')}\n  colours: ${at.seen.colours.join(', ')}\n  codes: ${at.seen.codes.join('; ') || 'none'}${eff ? `\n  out of sight: ${eff.out.join('; ') || 'none'}` : ''}` : '';
  return { counts, q1At: screens(atLoad.firstTop === null || !isFinite(atLoad.firstTop) ? null : atLoad.firstTop), moving: eff?.tried ?? null, defect, seen };
}

/**
 * The site check's part: every built page against scripts/load-baseline.json. A count that rose, a count that fell, a page
 * without a baseline and a page whose answer is not marked are violations, each with the command that settles it.
 */
export async function loadCheck({ browser, BASE, pages, violations }) {
  const base = JSON.parse(await readFile(BASELINE, 'utf8'));
  const fonts = (await fontProbe(browser, BASE)) === base.fontProbe;
  let rose = 0, fell = 0;
  for (const path of pages) {
    const { counts, defect } = await countPage(browser, BASE, path);
    if (defect) violations.push(`load: ${path}: ${defect}`);
    const was = base.pages[path];
    if (!was) { violations.push(`load: ${path} has no baseline (npm run load -- --lower ${path})`); continue; }
    for (const [k, name] of COUNTS) {
      const [now, then] = [counts[k], was[k]];
      if (now === then || (!fonts && LAYOUT.includes(k))) continue;
      if (now === null || then === null || now > then) {
        rose++;
        violations.push(`load: ${path} ${name} rose from ${then ?? 'none'} to ${now ?? 'none'} (cut it, or a line in docs/DECISIONS.md and npm run load -- --raise ${path} ${k} <D-id>)`);
      } else {
        fell++;
        violations.push(`load: ${path} ${name} fell from ${then} to ${now}: lower the baseline in this commit (npm run load -- --lower ${path})`);
      }
    }
  }
  for (const path of Object.keys(base.pages)) if (!pages.includes(path)) violations.push(`load: ${path} is in the baseline but not built (take it out of scripts/load-baseline.json)`);
  return { pages: pages.length, rose, fell, fonts };
}

async function main() {
  const args = process.argv.slice(2);
  const text = args.includes('--text'), skipEffects = args.includes('--no-effects'), lower = args.includes('--lower'), raise = args.indexOf('--raise');
  const [rPage, rCount, rWhy] = raise >= 0 ? args.slice(raise + 1, raise + 4) : [];
  if (raise >= 0) {
    if (!COUNTS.some(([k]) => k === rCount)) throw new Error(`--raise <page> <count> <D-id>: the count is one of ${COUNTS.map(([k]) => k).join(', ')}`);
    if (!/^D-[A-Z]+-\d+$/.test(rWhy ?? '') || !(await readFile(DECISIONS, 'utf8')).includes(`| ${rWhy} |`)) throw new Error(`--raise: ${rWhy} is not a decision in docs/DECISIONS.md; write its line first`);
  }
  const only = raise >= 0 ? [rPage] : args.filter((a) => a.startsWith('/') && !a.startsWith('//'));
  const { BASE, server } = await serveDist();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pages = (await builtPages()).filter((p) => !only.length || only.includes(p));
  const rows = [], notes = [], measured = {};
  for (const path of pages) {
    const r = await countPage(browser, BASE, path, { text, effectsToo: !skipEffects });
    measured[path] = r.counts;
    const c = r.counts, show = (v) => v ?? '-';
    rows.push([path, `${c.before} (${show(r.q1At)})`, ...COUNTS.slice(1).map(([k]) => (k === 'outOfSight' && c[k] !== null ? `${c[k]} of ${r.moving}` : show(c[k])))]);
    if (r.defect) notes.push(`\n${path}: ${r.defect}`);
    if (text) notes.push(r.seen);
  }
  await browser.close();
  server.close();
  const head = ['Page', ...COUNTS.map(([k, name]) => (k === 'before' ? 'Words before Q1 (Q1 at, screens)' : name))];
  console.log(`| ${head.join(' | ')} |\n|${head.map((_, i) => (i ? '---:' : '---')).join('|')}|`);
  for (const r of rows) console.log(`| ${r.join(' | ')} |`);
  console.log(`| Aim | ${COUNTS.map(([, , aim]) => aim ?? '').join(' | ')} |`);
  if (notes.length) console.log(notes.join('\n'));
  if (!lower && raise < 0) return;
  const base = JSON.parse(await readFile(BASELINE, 'utf8').catch(() => '{"pages":{},"raised":[]}'));
  const { BASE: B2, server: s2 } = await serveDist(), b2 = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const probe = await fontProbe(b2, B2);
  await b2.close();
  s2.close();
  if (base.fontProbe === undefined) base.fontProbe = probe;
  else if (base.fontProbe !== probe) throw new Error(`the fonts here differ from the baseline's (a line ${probe} px wide, not ${base.fontProbe}): write the baseline where it was written, a session's container`);
  const changed = [];
  if (raise >= 0) {
    const [then, now] = [base.pages[rPage]?.[rCount], measured[rPage]?.[rCount]];
    if (!(now > then || (then === null && now !== null))) throw new Error(`--raise: ${rPage} ${rCount} is ${now ?? 'none'}, not above ${then ?? 'none'}`);
    base.pages[rPage][rCount] = now;
    base.raised.push({ page: rPage, count: rCount, from: then, to: now, why: rWhy, date: new Date().toISOString().slice(0, 10) });
    changed.push(`${rPage} ${rCount} ${then} → ${now} (${rWhy})`);
  } else {
    if (skipEffects) throw new Error('--lower measures every count: leave out --no-effects');
    for (const [path, counts] of Object.entries(measured)) {
      if (!base.pages[path]) { base.pages[path] = counts; changed.push(`${path} added`); continue; }
      for (const [k] of COUNTS) {
        const [then, now] = [base.pages[path][k], counts[k]];
        // A count new to the measure takes its first reading.
        if (then === undefined || (now !== null && then !== null && now < then)) { base.pages[path][k] = now; changed.push(`${path} ${k} ${then} → ${now}`); }
      }
    }
  }
  base.pages = Object.fromEntries(Object.entries(base.pages).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`scripts/load-baseline.json: ${changed.join(', ') || 'nothing to change'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
