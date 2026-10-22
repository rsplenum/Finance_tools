/**
 * Home's motion (HOME1b, D-UX-115; docs/DESIGN-MOTION.md): draw, settle, pulse, stagger and type, each run once.
 * - The hero's "how it works" (How.astro) plays on each visit: the boxes settle one after another, the lines draw, and one
 *   marigold pulse runs from your answers to the papers, all within 2.7 s.
 * - Each tool's terminal intro (Intro.astro) plays once when it first comes into view: the command typed, the inputs
 *   resolving, the bars read against the level, the verdict stamped, the change and its passing result, within 5 s;
 *   "Show it all" ends every intro at once. The HTML is the finished state: a played intro drops every animation and stands as is.
 * - The closing desk's dashes fall onto their rows once, as it comes into view.
 * SVG strokes take the Web Animations API, since a class-triggered transition leaves them where they began (GOTCHAS,
 * AG3). Under reduced motion Base.astro leaves out the `js` mark, and nothing here runs: everything stands finished.
 */
export function start() {
  const motion = document.documentElement.classList.contains('js');
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]')) field(c, motion);
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
  const add = (el: Element, keys: Keyframe[], at: number, ms: number, easing = OUT) => {
    const a = el.animate(keys, { delay: at, duration: ms, easing, fill: 'both' });
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
  const seen = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { seen.unobserve(e.target); ends.push(play(e.target as HTMLElement, all)); }
  }, { rootMargin: '0px 0px -15% 0px' });
  for (const b of boxes) seen.observe(b);
  addEventListener('beforeprint', all);
}
