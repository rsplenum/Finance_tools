/**
 * Home's motion (HOME1b, D-UX-115; docs/DESIGN-MOTION.md): draw, settle, pulse, stagger and type, each run once.
 * - The hero's "how it works" (How.astro) plays on each visit: the boxes settle one after another, the lines draw, and one
 *   marigold pulse runs from your answers to the papers, all within 2.7 s.
 * - Each tool's terminal intro (Intro.astro) plays once when it first comes into view: the command typed, the inputs
 *   resolving, the bars read against the level, the verdict stamped, the change and its passing result, within 5 s;
 *   "Show it all" ends every intro at once. The HTML is the finished state: a played intro drops every animation and stands as is.
 * - The DSCR's explainer (Explainer.astro, HOME1c, D-UX-120) plays its five beats once in view, about 8.5 s (F9 widened for
 *   it), and its one button reads "Show it all" while it plays and "Play it again" after. Its wires stand still without motion.
 * - The closing desk's dashes fall onto their rows once, as it comes into view.
 * SVG strokes take the Web Animations API, since a class-triggered transition leaves them where they began (GOTCHAS,
 * AG3). Under reduced motion Base.astro leaves out the `js` mark, and nothing here runs: everything stands finished.
 */
export function start() {
  const motion = document.documentElement.classList.contains('js');
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]')) field(c, motion);
  for (const b of document.querySelectorAll<HTMLElement>('[data-explain]')) wired(b);
  if (!motion) return;
  for (const h of document.querySelectorAll<HTMLElement>('[data-how]')) how(h);
  intros();
}

const ease = (p: number) => 1 - (1 - p) ** 3;
/** Comes to rest with a small spring: past the line by a little, then back onto it. */
const spring = (p: number) => { const c = 1.25, q = p - 1; return 1 + (c + 1) * q ** 3 + c * q ** 2; };
const clamp = (p: number) => Math.min(1, Math.max(0, p));
const OUT = 'cubic-bezier(0.2, 0.7, 0.3, 1)';

// ---- The closing's dashes ----

const FALL = 2400; // ms for the dashes to drift in and fall onto their rows
const ROW = 28, COL = 16; // the ledger's rows and the dashes' places along them, px
interface Dash { sx: number; sy: number; sa: number; tx: number; ty: number; c: number; d: number }

/** The field: dashes drift in, fall and settle into ledger rows behind the words, once it is in view; at rest without motion. */
function field(canvas: HTMLCanvasElement, motion: boolean) {
  const ctx = canvas.getContext('2d'), host = canvas.parentElement;
  if (!ctx || !host) return;
  let dashes: Dash[] = [], w = 0, h = 0, born = 0, done = !motion;
  const layout = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = r.width; h = r.height;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // No dash comes to rest on the words or within 12 px of them (nothing behind text; axe cannot see a canvas).
    const words = [...host.querySelectorAll('h2, p, a, button')].map((el) => el.getBoundingClientRect())
      .map((b) => ({ x0: b.left - r.left - 12, x1: b.right - r.left + 12, y0: b.top - r.top - 12, y1: b.bottom - r.top + 12 }));
    const free = (x: number, y: number) => !words.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
    const n = Math.round(Math.min(420, (w * h) / 2600)), cx = w / 2, cy = h / 2, slots: { x: number; y: number }[] = [];
    for (let y = ROW * 0.75; y < h - 8; y += ROW) for (let x = COL / 2; x < w - 4; x += COL) {
      const k = Math.min(1, Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2))); // emptier in the middle, where the words are
      if (free(x, y) && rnd() < 0.08 + 0.5 * k * k) slots.push({ x, y });
    }
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    dashes = slots.slice(0, n).map(({ x, y }) => ({ tx: x, ty: y, sx: x + (rnd() - 0.5) * 60, sy: y - 50 - rnd() * 130, sa: (rnd() - 0.5) * 2.4, c: rnd() < 0.78 ? 1 : 3, d: rnd() * 0.35 }));
  };
  const frame = (t: number) => {
    const p = clamp(t / FALL), look = getComputedStyle(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8;
    for (const c of [1, 3]) {
      ctx.strokeStyle = look.getPropertyValue(`--spark-${c}`).trim();
      ctx.beginPath();
      for (const d of dashes) {
        const q = clamp((p - d.d) / 0.65), e = ease(q), len = 5;
        if (d.c !== c || q <= 0) continue;
        const x = d.sx + (d.tx - d.sx) * e, y = d.sy + (d.ty - d.sy) * spring(q), a = d.sa * (1 - e);
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const paint = () => frame(done ? FALL : performance.now() - born);
  const tick = () => { paint(); if (performance.now() - born < FALL) requestAnimationFrame(tick); else { done = true; paint(); } };
  layout();
  paint();
  if (motion) {
    const seen = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { seen.disconnect(); born = performance.now(); requestAnimationFrame(tick); } });
    seen.observe(canvas);
  }
  let size = '';
  new ResizeObserver(() => { const r = canvas.getBoundingClientRect(), now = `${Math.round(r.width)}x${Math.round(r.height)}`; if (now === size) return; const first = !size; size = now; if (first) return; layout(); if (done) paint(); }).observe(canvas);
  new MutationObserver(() => { if (done) paint(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// ---- Shared by the diagram and the intros ----

/** A run of animations that ends in the HTML's own state: once all are over (or cut short), each is dropped. */
function run(host: HTMLElement) {
  const anims: Animation[] = [], stops: (() => void)[] = [];
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    host.setAttribute('data-played', '');
    for (const s of stops) s();
    for (const a of anims) a.cancel();
  };
  const add = (el: Element, keys: Keyframe[], at: number, ms: number, easing = OUT, fill: FillMode = 'both') => {
    const a = el.animate(keys, { delay: at, duration: ms, easing, fill });
    anims.push(a);
    return a;
  };
  const settled = () => Promise.all(anims.map((a) => a.finished)).then(end, () => undefined);
  return { add, end, settled, stops };
}

/** Settle: a block arrives from a little above with a small overshoot, then rests (DESIGN-MOTION). */
const SETTLE: Keyframe[] = [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(3px)', offset: 0.7 }, { opacity: 1, transform: 'none' }];

// ---- The hero's "how it works" ----

/** Plays the diagram once: the boxes settle in turn, the lines draw, the pulse runs (2.7 s). */
function how(host: HTMLElement) {
  const r = run(host);
  for (const svg of host.querySelectorAll('svg')) {
    const [a, b, c] = svg.querySelectorAll('[data-box]'), lines = svg.querySelectorAll('[data-draw]'), pulse = svg.querySelector<SVGElement>('[data-pulse]');
    const draw = (el: Element, at: number, ms: number) => r.add(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], at, ms);
    for (const el of [a, b, c]) (el as SVGElement).style.transformBox = 'fill-box';
    r.add(a, SETTLE, 0, 600);
    draw(lines[0], 300, 600); draw(lines[1], 850, 150);
    r.add(b, SETTLE, 800, 600);
    draw(lines[2], 1100, 600); draw(lines[3], 1650, 150);
    if (pulse) {
      const [x, y] = (pulse.dataset.to ?? '0,0').split(',').map(Number);
      r.add(pulse, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: `translate(${x}px, ${y}px)`, offset: 0.92 }, { opacity: 0, transform: `translate(${x}px, ${y}px)` }], 1500, 800, 'ease-in-out');
    }
    r.add(c, SETTLE, 2100, 600);
  }
  void r.settled();
}

// ---- The terminal intros ----

const GLYPHS = '0123456789';
/**
 * The intro's steps, in ms: typing per character and its cap, the inputs' and bars' stagger (DESIGN-MOTION's 100), a bar's
 * growth and its mark, a figure's scramble, the stamp's settle and the cursor's two blinks. A step starts as the one before
 * it ends, or a little before (`lead`), so the longest case (the DSCR's seven inputs and 6 + 8 bars) ends by 4.8 s.
 */
const T = { char: 24, type: 360, kv: 100, scramble: 280, first: 60, bar: 100, grow: 280, mark: 120, stamp: 480, cursor: 2000 };
const LEAD = { kv: 140, chart: 100, stamp: 280, sum: 100 };
/** Nothing in an intro is still moving after this, from its start (F9, D-UX-115); a longer case is squeezed to fit. */
const WHOLE = 4800;

type Step = { el: HTMLElement; kind: 'type' | 'kv' | 'chart' | 'row' | 'bar' | 'mark' | 'scr' | 'stamp' | 'cursor'; at: number; ms: number };
/** Lays out one intro's timeline from its HTML: when each line, input, bar and mark starts, and the total. */
function timeline(screen: HTMLElement) {
  const steps: Step[] = [];
  let end = 0, lead = 0;
  for (const el of screen.children as HTMLCollectionOf<HTMLElement>) {
    const t = Math.max(0, end - lead);
    lead = 0;
    if (el.tagName === 'DL') {
      const dts = [...el.querySelectorAll<HTMLElement>('dt')];
      dts.forEach((dt, k) => steps.push({ el: dt, kind: 'kv', at: t + T.kv * k, ms: 200 }, { el: dt.nextElementSibling as HTMLElement, kind: 'scr', at: t + T.kv * k, ms: T.scramble }));
      end = t + T.kv * (dts.length - 1) + T.scramble; lead = LEAD.kv;
    } else if (el.matches('[data-chart]')) {
      const [head, ...rows] = el.querySelectorAll<HTMLElement>('[data-row]');
      steps.push({ el, kind: 'chart', at: t, ms: 1 }, { el: head, kind: 'row', at: t, ms: 200 });
      rows.forEach((row, k) => {
        const at = t + T.first + T.bar * k, bar = row.querySelector<HTMLElement>('[data-bar]'), mark = row.querySelector<HTMLElement>('[data-mark]');
        steps.push({ el: row, kind: 'row', at, ms: 160 });
        if (bar) steps.push({ el: bar, kind: 'bar', at, ms: T.grow });
        if (mark) steps.push({ el: mark, kind: 'mark', at: at + T.grow, ms: T.mark });
      });
      end = t + T.first + T.bar * (rows.length - 1) + T.grow + T.mark; lead = LEAD.chart;
    } else if (el.querySelector('[data-stamp]')) {
      const at = Math.max(0, end - LEAD.sum);
      steps.push({ el: el.querySelector<HTMLElement>('[data-stamp]')!, kind: 'stamp', at, ms: T.stamp });
      end = at + T.stamp; lead = LEAD.stamp;
    } else if (el.matches('[data-scr]')) {
      steps.push({ el, kind: 'scr', at: t, ms: T.scramble });
      end = t + T.scramble;
    } else {
      const ms = Math.min(T.type, (el.querySelector('[data-type]')?.textContent?.length ?? 0) * T.char), cursor = el.querySelector<HTMLElement>('[data-cursor]');
      steps.push({ el, kind: 'type', at: t, ms });
      if (cursor) steps.push({ el: cursor, kind: 'cursor', at: t, ms });
      end = t + ms;
    }
  }
  const k = end > WHOLE ? WHOLE / end : 1;
  for (const s of steps) { s.at *= k; s.ms *= k; }
  return { steps, total: end * k };
}

/** Scramble then settle: a figure's digits run through others and settle left to right, over the real one, which reads whole. */
function scramble(el: HTMLElement, at: number, ms: number, r: ReturnType<typeof run>) {
  const val = el.querySelector<HTMLElement>('[data-val]');
  const text = val?.textContent ?? '';
  if (!val || !/\d/.test(text)) return;
  const over = document.createElement('span');
  over.setAttribute('aria-hidden', 'true');
  over.className = 'absolute inset-0';
  r.add(val, [{ opacity: 0 }, { opacity: 0, offset: 0.999 }, { opacity: 1 }], at, ms, 'linear');
  let raf = 0, born = 0, last = -1;
  const step = (now: number) => {
    born ||= now;
    const p = (now - born) / ms, f = Math.floor((now - born) / 50);
    if (p >= 1) { over.remove(); return; }
    if (f !== last) {
      last = f;
      const done = Math.floor(p * text.length);
      over.textContent = [...text].map((c, i) => (i < done || !/\d/.test(c) ? c : GLYPHS[(Math.random() * 10) | 0])).join('');
    }
    raf = requestAnimationFrame(step);
  };
  const go = setTimeout(() => { el.append(over); raf = requestAnimationFrame(step); }, at);
  r.stops.push(() => { clearTimeout(go); cancelAnimationFrame(raf); over.remove(); });
}

/** Plays one intro from its start; "Show it all" calls `all`, which ends every intro at once. */
function play(box: HTMLElement, all: () => void) {
  const screen = box.querySelector<HTMLElement>('[data-screen]'), show = box.querySelector<HTMLButtonElement>('[data-show]');
  if (!screen) return () => undefined;
  const r = run(box), { steps } = timeline(screen);
  for (const { el, kind, at, ms } of steps) {
    if (kind === 'type') {
      const text = el.querySelector('[data-type]'), n = text?.textContent?.length ?? 1;
      r.add(el, [{ opacity: 1 }, { opacity: 1 }], at, ms);
      if (text) r.add(text, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], at, ms, `steps(${n}, end)`);
    } else if (kind === 'cursor') {
      const n = el.previousElementSibling?.textContent?.length ?? 0;
      r.add(el, [{ transform: 'none' }, { transform: `translateX(${n}ch)` }], at, ms, `steps(${n}, end)`);
      // Rides the typing, then blinks twice, once a second, and goes (at most three blinks, D-UX-115).
      r.add(el, [{ opacity: 1, easing: 'step-end' }, { opacity: 0, offset: (ms + 500) / (ms + T.cursor), easing: 'step-end' }, { opacity: 1, offset: (ms + 1000) / (ms + T.cursor), easing: 'step-end' }, { opacity: 0, offset: (ms + 1500) / (ms + T.cursor) }, { opacity: 0 }], at, ms + T.cursor, 'linear');
    } else if (kind === 'kv' || kind === 'chart' || kind === 'row') {
      r.add(el, [{ opacity: 0 }, { opacity: 1 }], at, kind === 'chart' ? 1 : Math.min(ms, 200));
    } else if (kind === 'scr') {
      r.add(el, [{ opacity: 0 }, { opacity: 1 }], at, 120);
      scramble(el, at, ms, r);
    } else if (kind === 'bar') {
      r.add(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], at, ms);
    } else if (kind === 'mark') {
      r.add(el, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], at, ms);
    } else if (kind === 'stamp') {
      r.add(el, [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(0.96)', offset: 0.6 }, { opacity: 1, transform: 'none' }], at, ms);
    }
  }
  if (show) {
    show.hidden = false;
    show.addEventListener('click', all, { once: true });
    // The header keeps its height (h-16), so the page does not move; the focus, if on the button, goes to the screen.
    r.stops.push(() => { if (document.activeElement === show) screen.focus(); show.hidden = true; });
  }
  void r.settled();
  return r.end;
}

/** Each intro plays once, when its top first comes into view; "Show it all" and printing show them all finished. */
function intros() {
  const boxes = [...document.querySelectorAll<HTMLElement>('[data-intro]')], ends: (() => void)[] = [];
  const all = () => { seen.disconnect(); for (const e of ends) e(); for (const b of boxes) b.setAttribute('data-played', ''); };
  // A page may ask the explainers to wait for their button (the HOME1c comparison: `data-start="click"` on <html>).
  const click = document.documentElement.dataset.start === 'click';
  const seen = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const box = e.target as HTMLElement;
      seen.unobserve(box);
      ends.push(box.hasAttribute('data-explain') ? explainer(box, all, true) : play(box, all));
    }
  }, { rootMargin: '0px 0px -15% 0px' });
  for (const b of boxes) {
    if (click && b.hasAttribute('data-explain')) ends.push(explainer(b, all, false));
    else seen.observe(b);
  }
  addEventListener('beforeprint', all);
}

// ---- The explainers (HOME1c) ----

/** The five beats' starts and the end, in ms (the owner's script, HOME1c, D-UX-120): inputs, calculation, the weakest
 *  year, the change, the outcome. Nothing moves after END (F9, widened from 5 s for the explainers). */
const BEAT = [0, 1200, 2600, 4200, 5800], END = 8400;
/** A spring for what lands: past its place by a little, then back (the short's "springs throughout"). */
const SPRING = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const R = 8; // the wires' corner, px

/** Where an element sits in the stage, px. */
const boxOf = (el: Element, stage: Element) => {
  const a = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height, cx: a.left - s.left + a.width / 2, cy: a.top - s.top + a.height / 2 };
};
/** The text's own extent in a cell that may be wider than it. */
const inkOf = (el: Element, stage: Element) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const a = r.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height, cx: a.left - s.left + a.width / 2, cy: a.top - s.top + a.height / 2 };
};

/** The spine: each row of inputs runs down into the hub, and the hub out to each year. Drawn still, and again on resize. */
function wires(box: HTMLElement) {
  const stage = box.querySelector<HTMLElement>('[data-stage]'), svg = box.querySelector<SVGSVGElement>('[data-wires]'), hub = box.querySelector('[data-hub]');
  if (!stage || !svg || !hub) return null;
  const h = boxOf(hub, stage), x0 = h.cx;
  const rows: ReturnType<typeof boxOf>[] = [];
  for (const dt of box.querySelectorAll('[data-inputs] dt')) { const b = boxOf(dt, stage); if (!rows.some((x) => Math.abs(x.cy - b.cy) < 2)) rows.push(b); }
  const years = [...box.querySelectorAll('[data-year]')].map((y) => boxOf(y, stage));
  const ins = rows.map((b) => `M ${b.x - 6} ${b.cy} H ${x0 + R} Q ${x0} ${b.cy} ${x0} ${b.cy + R} V ${h.y}`);
  const outs = years.map((b) => `M ${x0} ${h.y + h.h} V ${b.cy - R} Q ${x0} ${b.cy} ${x0 + R} ${b.cy} H ${b.x - 6}`);
  svg.replaceChildren(...[...ins.map((d) => ['in', d]), ...outs.map((d) => ['out', d])].map(([k, d]) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.5');
    p.setAttribute('class', 'text-on-desk-muted/60'); p.dataset.wire = k;
    return p;
  }));
  return { ins, outs, x0, hub: h, rows };
}
function wired(box: HTMLElement) {
  wires(box);
  let w = 0;
  new ResizeObserver(([e]) => {
    if (Math.round(e.contentRect.width) === w) return;
    w = Math.round(e.contentRect.width);
    if (box.hasAttribute('data-played')) wires(box);
  }).observe(box);
}

/**
 * Sets up one explainer: plays it now (`now`) or leaves it finished, and its one button stops it ("Show it all", which ends
 * every intro) or plays it again. Returns what ends it.
 */
function explainer(box: HTMLElement, all: () => void, now: boolean) {
  const show = box.querySelector<HTMLButtonElement>('[data-show]');
  let end = () => undefined as void;
  const label = (t: string) => { if (show) show.textContent = t; };
  const go = () => { box.removeAttribute('data-played'); label('Show it all'); end = explain(box, () => label('Play it again')); };
  if (show) {
    show.hidden = false;
    show.addEventListener('click', () => (box.hasAttribute('data-played') ? go() : all()));
  }
  if (now) go();
  else { box.setAttribute('data-played', ''); label('Play it'); }
  return () => end();
}

/** Plays the five beats once; `done` runs when it ends, played through or cut short. */
function explain(box: HTMLElement, done: () => void) {
  const stage = box.querySelector<HTMLElement>('[data-stage]')!, r = run(box), w = wires(box);
  r.stops.push(done);
  if (!w) { r.end(); return r.end; }
  // A part's later moves fill forwards only: a later animation that filled backwards would hold it at its own start from 0.
  const had = new WeakSet<Element>(), add = r.add;
  r.add = (el, keys, at, ms, easing = OUT) => { const f: FillMode = had.has(el) ? 'forwards' : 'both'; had.add(el); return add(el, keys, at, ms, easing, f); };
  const css = getComputedStyle(box), ink = css.getPropertyValue('--on-desk').trim(), red = css.getPropertyValue('--bad').trim(), gold = css.getPropertyValue('--marigold').trim();
  const $ = <T extends Element = HTMLElement>(q: string, at: Element = box) => [...at.querySelectorAll<T & HTMLElement>(q)];
  const show = (el: Element, at: number, ms = 200) => r.add(el, [{ opacity: 0 }, { opacity: 1 }], at, ms);
  const settle = (el: Element, at: number) => r.add(el, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], at, 500, SPRING);
  // Measured before any animation holds a part at its start: the slot's width, the brackets' places, the rows and cells.
  const fix = $('[data-fix]')[0], to = $('[data-to]')[0], slot = to?.scrollWidth ?? 0, fixH = fix?.getBoundingClientRect().height ?? 0, fixBox = fix && inkOf(fix, stage);
  const years = $('[data-year]'), cells = years.map((y) => boxOf(y.querySelector('[data-cell]')!, stage)), rowsAt = years.map((y) => boxOf(y, stage));
  const was = years.filter((y) => y.querySelector('[data-old]'));
  const [sumWas, sumNow] = $('[data-sum]');
  const weak = [Number(box.dataset.weakWas), Number(box.dataset.weakNow)];
  const caps = $('[data-captions] li');
  // Captions: each shows from its beat to the next; the last stays.
  caps.forEach((c, k) => {
    const from = BEAT[k], until = BEAT[k + 1] ?? END, ms = until - from, f = 200 / ms;
    r.add(c, k === caps.length - 1 ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0 }, { opacity: 1, offset: f }, { opacity: 1, offset: 1 - f }, { opacity: 0 }], from, k === caps.length - 1 ? 200 : ms, 'linear');
  });

  // 1 · The inputs settle in turn, their wires draw down into the hub, one pulse runs it, and the hub rings.
  $('[data-inputs] > *').forEach((el, k) => show(el, BEAT[0] + 45 * k, 260));
  const wire = (p: SVGPathElement, at: number, ms: number) => { const n = p.getTotalLength(); r.add(p, [{ strokeDasharray: `${n}`, strokeDashoffset: n }, { strokeDasharray: `${n}`, strokeDashoffset: 0 }], at, ms); };
  $<SVGPathElement>('[data-wire="in"]').forEach((p, k) => wire(p, 350 + 40 * k, 600));
  const hub = $('[data-hub]')[0];
  settle(hub, 700);
  for (const el of $('[data-x]').filter((e) => e.matches('p'))) show(el, 800, 300);
  const pulse = $('[data-pulse]')[0], ring = (at: number) => r.add(hub, [{ boxShadow: `0 0 0 0 ${gold}` }, { boxShadow: '0 0 0 12px transparent' }], at, 500, 'ease-out');
  const run1 = (d: string, at: number, ms: number) => {
    const dot = pulse.cloneNode() as HTMLElement;
    dot.style.offsetPath = `path("${d}")`; dot.style.offsetRotate = '0deg';
    stage.append(dot);
    r.stops.push(() => dot.remove());
    r.add(dot, [{ offsetDistance: '0%', opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { offsetDistance: '100%', opacity: 0 }], at, ms, 'ease-in-out');
  };
  run1(w.ins[0], 750, 550);
  ring(1250);

  // 2 · The wires fan out to the years; each year's bar grows to its reading as typed, its figure settling.
  $<SVGPathElement>('[data-wire="out"]').forEach((p, k) => wire(p, BEAT[1] + 100 + 30 * k, 450));
  show($('[data-row]:not([data-year])')[0], BEAT[1] + 150);
  const neutral = { backgroundColor: ink };
  was.forEach((y, k) => {
    const at = BEAT[1] + 300 + 110 * k, bar = y.querySelector('[data-bar]')!, kk = Number((bar as HTMLElement).dataset.k);
    show(y, at, 160);
    r.add(bar, [{ transform: 'scaleX(0)', ...neutral }, { transform: `scaleX(${kk})`, ...neutral }], at, 450, SPRING);
  });

  // 3 · The lens reads each year down the column, each judged as it passes, and comes back to the weakest; red brackets.
  const lens = $('[data-lens]')[0], brackets = $('[data-brackets]')[0];
  const lensAt = (c: { cx: number; cy: number }) => `translate(${c.cx - 18}px, ${c.cy - 18}px)`;
  const stops = was.map((y) => cells[years.indexOf(y)]), step = 150, t3 = BEAT[2] + 100;
  const wk = Math.max(0, weak[0]);
  r.add(lens, [{ opacity: 0, transform: lensAt(stops[0]) }, { opacity: 1, transform: lensAt(stops[0]) }], t3, 200);
  stops.forEach((c, k) => {
    if (k) r.add(lens, [{ opacity: 1, transform: lensAt(stops[k - 1]) }, { opacity: 1, transform: lensAt(c) }], t3 + 200 + step * (k - 1), step, 'ease-in-out');
    const y = was[k], misses = !y.querySelector('[data-bar]')!.hasAttribute('data-meets'), at = t3 + 200 + step * k;
    r.add(y.querySelector('[data-old]')!, [{ opacity: 1, color: ink }, { opacity: 1, color: misses ? red : ink }], at, 120);
    r.add(y.querySelector('[data-om]')!, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], at, 160);
    if (misses) r.add(y.querySelector('[data-bar]')!, [{ backgroundColor: ink, transform: `scaleX(${(y.querySelector('[data-bar]') as HTMLElement).dataset.k})` }, { backgroundColor: red, transform: `scaleX(${(y.querySelector('[data-bar]') as HTMLElement).dataset.k})` }], at, 160);
  });
  const back = t3 + 200 + step * stops.length;
  r.add(lens, [{ opacity: 1, transform: lensAt(stops.at(-1)!) }, { opacity: 1, transform: lensAt(cells[wk]) }], back, 400, SPRING);
  const frame = (b: { x: number; y: number; w: number; h: number }, pad = 4) => ({ transform: `translate(${b.x - pad}px, ${b.y - pad}px)`, width: `${b.w + 2 * pad}px`, height: `${b.h + 2 * pad}px` });
  const wide = (b: ReturnType<typeof frame>) => ({ ...b, opacity: 0 });
  const rw = rowsAt[wk], loose = { x: rw.x - 10, y: rw.y - 8, w: rw.w + 20, h: rw.h + 16 };
  const t3b = back + 350;
  r.add(brackets, [{ ...wide(frame(loose)), color: red }, { ...frame(rw), opacity: 1, color: red }], t3b, 350, SPRING);
  r.add(lens, [{ opacity: 1, transform: lensAt(cells[wk]) }, { opacity: 0, transform: lensAt(cells[wk]) }], BEAT[3], 250);
  settle(sumWas, t3b + 250);

  // 4 · The brackets move to the input the change moves; its old value lifts and the new one springs into the slot; a pulse
  //     runs the new value through the hub to the years.
  if (fix && fixBox && to) {
    const b = { x: fixBox.x, y: fixBox.y, w: fixBox.w, h: fixBox.h };
    r.add(brackets, [{ ...frame(rw), opacity: 1, color: red }, { ...frame(b), opacity: 1, color: gold }], BEAT[3] + 100, 500, SPRING);
    const old = fix.querySelector('[data-was]')!, nu = fix.querySelector('[data-now]')!, lift = BEAT[3] + 650;
    r.add(old, [{ color: ink, transform: 'none' }, { color: ink, transform: 'translateY(-6px)', offset: 0.4 }, { transform: 'none' }], lift, 450);
    r.add(fix, [{ minHeight: `${fixH}px` }, { minHeight: `${fixH}px` }], 0, END); // the final line count held: nothing below moves
    r.add(to, [{ maxWidth: '0px' }, { maxWidth: `${slot}px` }], lift + 200, 300);
    r.add(nu, [{ opacity: 0, transform: 'translateY(-16px)' }, { opacity: 1, transform: 'none' }], lift + 350, 550, SPRING);
    const near = w.rows.reduce((a, x, k) => (Math.abs(x.cy - fixBox.cy) < Math.abs(w.rows[a].cy - fixBox.cy) ? k : a), 0), d = w.ins[near];
    run1(`${d} L ${w.x0} ${w.hub.y + w.hub.h} V ${rowsAt.at(-1)!.cy}`, lift + 900, 650);
    ring(lift + 1200);
  }

  // 5 · Each bar springs to the new reading, leaving a tick where it stood; each figure gives way to the new one; the lens
  //     goes to the year that now decides, marigold brackets, the sum and the verdict.
  years.forEach((y, k) => {
    const at = BEAT[4] + 90 * k, bar = y.querySelector<HTMLElement>('[data-bar]')!, kk = Number(bar.dataset.k), oldEl = y.querySelector('[data-old]');
    const from = { transform: `scaleX(${kk})`, backgroundColor: oldEl && !bar.hasAttribute('data-meets') ? red : ink };
    r.add(bar, [from, { transform: 'scaleX(1)', backgroundColor: bar.classList.contains('bg-bad') ? red : ink }], at, 600, SPRING);
    if (!oldEl) show(y, at, 160);
    for (const g of $('[data-ghost]', y)) show(g, at, 300);
    if (oldEl) r.add(oldEl, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], at + 200, 250);
    for (const el of $('[data-val], [data-mark]', y)) r.add(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], at + 300, 300, SPRING);
  });
  const nk = Math.max(0, weak[1]), t5 = BEAT[4] + 90 * years.length + 500;
  r.add(brackets, [{ ...frame(fixBox ?? rw), opacity: 1, color: gold }, { ...frame(fixBox ?? rw), opacity: 0, color: gold }], BEAT[4], 250);
  r.add(lens, [{ opacity: 0, transform: lensAt(cells[nk]) }, { opacity: 1, transform: lensAt(cells[nk]) }], t5, 200);
  const rn = rowsAt[nk];
  r.add(brackets, [{ ...wide(frame({ x: rn.x - 10, y: rn.y - 8, w: rn.w + 20, h: rn.h + 16 })), color: gold }, { ...frame(rn), opacity: 1, color: gold }], t5 + 250, 350, SPRING);
  settle(sumNow, t5 + 450);
  r.add(lens, [{ opacity: 1, transform: lensAt(cells[nk]) }, { opacity: 0, transform: lensAt(cells[nk]) }], END - 700, 300);
  r.add(brackets, [{ ...frame(rn), opacity: 1, color: gold }, { ...frame(rn), opacity: 0, color: gold }], END - 400, 400);
  for (const s of [sumWas, sumNow]) {
    const st = s.querySelector('[data-stamp]');
    if (st) r.add(st, [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(0.96)', offset: 0.6 }, { opacity: 1, transform: 'none' }], (s === sumWas ? t3b + 450 : t5 + 650), 480);
  }
  void r.settled();
  return r.end;
}
