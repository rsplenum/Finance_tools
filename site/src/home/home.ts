/**
 * Home's motion (HOME1b, D-UX-115; docs/DESIGN-MOTION.md): draw, settle, pulse, stagger and type, each run once.
 * - The hero's "how it works" (How.astro) plays on each visit: the boxes settle one after another, the lines draw, and one
 *   marigold pulse runs from your answers to the papers, all within 2.7 s.
 * - Each tool's scene in look C (Scene.astro, scene.ts; HOME1d, HOME1e) loads after the page and plays its five beats once
 *   when it first comes into view, within 12.8 s; without motion it only draws its wires, finished.
 * - The closing desk's dashes fall onto their rows once, as it comes into view.
 * SVG strokes take the Web Animations API, since a class-triggered transition leaves them where they began (GOTCHAS,
 * AG3). Under reduced motion Base.astro leaves out the `js` mark, and nothing here runs: everything stands finished.
 */
export function start() {
  const motion = document.documentElement.classList.contains('js');
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]')) field(c, motion);
  scenes(motion);
  if (!motion) return;
  for (const h of document.querySelectorAll<HTMLElement>('[data-how]')) how(h);
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

// ---- The diagram ----

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

/** Each tool's scene: its code loads after the page, and it plays once when its top first comes into view (D-UX-125). */
function scenes(motion: boolean) {
  for (const root of document.querySelectorAll<HTMLElement>('[data-scene]')) {
    if (!motion) { void import('./scene').then((m) => m.scene(root).still()); continue; }
    const seen = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      void import('./scene').then((m) => m.scene(root).play());
    }, { rootMargin: '0px 0px -20% 0px' });
    seen.observe(root);
  }
}
