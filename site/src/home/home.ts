/**
 * The home page's motion in FinSight's three verbs (AG2, D-UX-68, D-UX-72; docs/design-reference/finsight.md): settle (a
 * mark or a block falls onto its line and comes to rest with a small spring), tick (a line drawn when a rule is met) and
 * count (a figure runs to the engine's value, which is in the page from the start). The hero's and the closing's dashes
 * fall into ledger rows; the two ways in gather into what each gives; the story's pages land on the desk. What starts by
 * itself ends within 5 s or follows the reader. The story's three trailers are each written by a pen on its scratch
 * paper once as it comes into view and have "Show it all" (AG3, D-UX-77); the tool drawings draw themselves once
 * (D-UX-73). The pen keeps pace with a reader who scrolls fast, and the pencil is heard only once switched on (AG3b,
 * D-UX-78). Under reduced motion Base.astro leaves out the `js` mark: everything is drawn once, at rest.
 */
export function start() {
  const motion = document.documentElement.classList.contains('js');
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]')) field(c, motion);
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-gather]')) gather(c, motion);
  for (const p of document.querySelectorAll<HTMLElement>('[data-trailer][data-src]')) nearing(p);
  if (!motion) return;
  settling();
  header();
  drawings();
  for (const p of document.querySelectorAll<HTMLElement>('[data-trailer]')) trailer(p);
  sound();
}

const ease = (p: number) => 1 - (1 - p) ** 3;
/** Comes to rest with a small spring: past the line by a little, then back onto it. */
const spring = (p: number) => { const c = 1.25, q = p - 1; return 1 + (c + 1) * q ** 3 + c * q ** 2; };
const clamp = (p: number) => Math.min(1, Math.max(0, p));
const css = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** A canvas sized to its box at the screen's density; `draw` paints it at a moment of its settling (1 at rest). */
function surface(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const fit = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  };
  return { ctx, fit };
}

/** Runs `frame(t)` for `ms` once the canvas is in view, or paints it at rest at once without motion; repaints on resize and theme. */
function play(canvas: HTMLCanvasElement, motion: boolean, ms: number, layout: () => void, frame: (t: number) => void) {
  let born = 0, done = !motion;
  const paint = () => frame(done ? ms : performance.now() - born);
  const tick = () => { paint(); if (performance.now() - born < ms) requestAnimationFrame(tick); else { done = true; paint(); } };
  layout();
  if (!motion) paint();
  else {
    frame(0);
    const seen = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { seen.disconnect(); born = performance.now(); requestAnimationFrame(tick); } }, { threshold: 0.3 });
    seen.observe(canvas);
  }
  let size = '';
  new ResizeObserver(() => { const r = canvas.getBoundingClientRect(), now = `${Math.round(r.width)}x${Math.round(r.height)}`; if (now === size) return; const first = !size; size = now; if (first) return; layout(); if (done) paint(); }).observe(canvas);
  new MutationObserver(() => { if (done) paint(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

interface Dash { sx: number; sy: number; sa: number; tx: number; ty: number; c: number; d: number; ox: number; oy: number; vx: number; vy: number }
const FALL = 2400; // ms for the dashes to drift in and fall onto their rows
const ROW = 28, COL = 16; // the ledger's rows and the dashes' places along them, px
const REACH = 110; // px around the pointer that the dashes are stirred

/** The field: dashes drift in, fall and settle into ledger rows behind the words; the pointer stirs them and they settle back. */
function field(canvas: HTMLCanvasElement, motion: boolean) {
  const s = surface(canvas), host = canvas.parentElement;
  if (!s || !host) return;
  const { ctx } = s, margin = canvas.dataset.field === 'hero';
  let dashes: Dash[] = [], gaps: [number, number][] = [], mx = 0, w = 0, h = 0, settled = !motion, raf = 0, px = -1e4, py = -1e4;
  const layout = () => {
    const r = s.fit();
    w = r.width; h = r.height;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // No dash comes to rest on the words or within 12 px of them (nothing behind text; axe cannot see a canvas).
    const words = [...host.querySelectorAll('h1, h2, p, a, button')].map((el) => el.getBoundingClientRect())
      .map((b) => ({ x0: b.left - r.left - 12, x1: b.right - r.left + 12, y0: b.top - r.top - 12, y1: b.bottom - r.top + 12 }));
    const free = (x: number, y: number) => !words.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
    const n = Math.round(Math.min(420, (w * h) / 2600)), cx = w / 2, cy = h / 2, slots: { x: number; y: number }[] = [];
    for (let y = ROW * 0.75; y < h - 8; y += ROW) for (let x = COL / 2; x < w - 4; x += COL) {
      const k = Math.min(1, Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2))); // emptier in the middle, where the words are
      if (free(x, y) && rnd() < 0.08 + 0.5 * k * k) slots.push({ x, y });
    }
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    dashes = slots.slice(0, n).map(({ x, y }) => ({ tx: x, ty: y, sx: x + (rnd() - 0.5) * 60, sy: y - 50 - rnd() * 130, sa: (rnd() - 0.5) * 2.4, c: rnd() < 0.78 ? 1 : 3, d: rnd() * 0.35, ox: 0, oy: 0, vx: 0, vy: 0 }));
    // The ledger's double margin rule, drawn where no words are.
    mx = Math.min(88, Math.max(32, w * 0.06));
    const cut = words.filter((b) => mx + 4 > b.x0 && mx < b.x1).map((b): [number, number] => [b.y0, b.y1]).sort((a, b) => a[0] - b[0]);
    gaps = []; let y0 = 0;
    for (const [a, b] of cut) { if (a > y0) gaps.push([y0, a]); y0 = Math.max(y0, b); }
    if (y0 < h) gaps.push([y0, h]);
  };
  const frame = (t: number) => {
    const p = clamp(t / FALL), look = getComputedStyle(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const c of [1, 3]) {
      ctx.strokeStyle = look.getPropertyValue(`--spark-${c}`).trim(); ctx.globalAlpha = 0.8;
      ctx.beginPath();
      for (const d of dashes) {
        if (d.c !== c) continue;
        const q = clamp((p - d.d) / 0.65), e = ease(q), len = 5;
        const x = d.sx + (d.tx - d.sx) * e + d.ox, y = d.sy + (d.ty - d.sy) * spring(q) + d.oy, a = d.sa * (1 - e);
        if (q <= 0) continue;
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      ctx.stroke();
    }
    // The margin rule is drawn last, once the rows have settled (the tick of a ruled page).
    const m = clamp((p - 0.75) / 0.25);
    if (margin && m > 0) {
      ctx.strokeStyle = look.getPropertyValue('--spark-2').trim(); ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [a, b] of gaps) for (const x of [mx, mx + 4]) { ctx.moveTo(x, a); ctx.lineTo(x, a + (b - a) * ease(m)); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  // The pointer stirs the dashes near it; a spring brings each back onto its row with a small bounce.
  const stir = () => {
    raf = 0;
    let busy = false;
    for (const d of dashes) {
      const dx = d.tx - px, dy = d.ty - py, r = Math.hypot(dx, dy), push = r < REACH ? ((1 - r / REACH) ** 2 * 18) / (r || 1) : 0;
      const gx = dx * push, gy = dy * push - (r < REACH ? (1 - r / REACH) * 10 : 0);
      d.vx = (d.vx + (gx - d.ox) * 0.12) * 0.72; d.vy = (d.vy + (gy - d.oy) * 0.12) * 0.72;
      d.ox += d.vx; d.oy += d.vy;
      if (Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(gx - d.ox) + Math.abs(gy - d.oy) > 0.05) busy = true;
    }
    frame(FALL);
    if (busy) raf = requestAnimationFrame(stir);
  };
  play(canvas, motion, FALL, layout, (t) => { if (t >= FALL) settled = true; frame(t); });
  if (!motion) return;
  const wake = () => { if (settled && !raf) raf = requestAnimationFrame(stir); };
  host.addEventListener('pointermove', (ev) => { const r = canvas.getBoundingClientRect(); px = ev.clientX - r.left; py = ev.clientY - r.top; wake(); });
  host.addEventListener('pointerleave', () => { px = py = -1e4; wake(); });
}

const GATHER = 3200; // ms for the two ways in to gather and tick

/** The two ways in: for borrowers the dashes rise into the story's bars and the ones that clear the target are ticked in
 *  marigold; for CAs and DSAs they settle into a statement's rows, a single rule under the subtotal and a double rule
 *  under the total. The bars are the engine's DSCR for case S as typed (index.astro). */
function gather(canvas: HTMLCanvasElement, motion: boolean) {
  const s = surface(canvas);
  if (!s) return;
  const { ctx } = s, bars = canvas.dataset.gather === 'bars';
  const values: number[] = bars ? JSON.parse(canvas.dataset.values ?? '[]') : [], target = Number(canvas.dataset.target ?? 0);
  let dashes: Dash[] = [], ticks: { x0: number; x1: number; y: number; double?: boolean }[] = [], line = 0, w = 0, h = 0;
  const layout = () => {
    const r = s.fit();
    w = r.width; h = r.height; dashes = []; ticks = [];
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const put = (tx: number, ty: number, len: number, from: 'below' | 'above') => dashes.push({ tx, ty, sx: rnd() * w, sy: from === 'below' ? h * 0.4 + rnd() * h * 0.6 : rnd() * h * 0.5, sa: (rnd() - 0.5) * 3, c: len, d: rnd() * 0.3, ox: 0, oy: 0, vx: 0, vy: 0 });
    if (bars) {
      const top = Math.max(...values, target) * 1.2, gap = 10, bw = (w - 48 - gap * (values.length - 1)) / values.length, base = h - 4;
      const yOf = (v: number) => base - (v / top) * (h - 12);
      line = yOf(target);
      values.forEach((v, i) => {
        const x = i * (bw + gap), y1 = yOf(v);
        for (let y = base; y >= y1; y -= 6) put(x + bw / 2, y, bw / 2 - 2, 'below');
        if (v >= target) ticks.push({ x0: x, x1: x + bw, y: y1 - 3 });
      });
    } else {
      // A statement: four lines, a subtotal under a single rule, one more line, the total under a single rule and a double one.
      const rows: (number | 'sub' | 'total')[] = [0.52, 0.38, 0.6, 0.44, 'sub', 0.5, 'total'], amount = Math.min(96, w * 0.24), right = w - 4, step = (h - 12) / rows.length;
      rows.forEach((k, i) => {
        const y = 4 + step * (i + 0.5);
        if (typeof k !== 'number') ticks.push({ x0: right - amount, x1: right, y: y - step / 2 });
        for (let x = 6; x < w * (typeof k === 'number' ? k : 0.3); x += 14) put(x, y, 5, 'above');
        for (let x = right - amount + 6; x < right; x += 14) put(x, y, 5, 'above');
        if (k === 'total') ticks.push({ x0: right - amount, x1: right, y: y + step / 2 - 2, double: true });
      });
    }
  };
  const frame = (t: number) => {
    const p = clamp(t / (GATHER * 0.6)), look = getComputedStyle(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    if (bars) {
      ctx.strokeStyle = look.getPropertyValue('--on-desk-muted').trim(); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, line); ctx.lineTo(w, line); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = look.getPropertyValue('--on-desk-muted').trim(); ctx.font = `500 12px ${look.getPropertyValue('--font-heading') || 'sans-serif'}`;
      ctx.textAlign = 'right'; ctx.fillText(canvas.dataset.target ?? '', w, line - 5);
    }
    ctx.strokeStyle = look.getPropertyValue('--on-desk').trim(); ctx.lineWidth = bars ? 3 : 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const d of dashes) {
      const q = clamp((p - d.d) / 0.7), e = ease(q);
      if (q <= 0) continue;
      const x = d.sx + (d.tx - d.sx) * e, y = d.sy + (d.ty - d.sy) * spring(q), a = d.sa * (1 - e);
      ctx.moveTo(x - Math.cos(a) * d.c, y - Math.sin(a) * d.c); ctx.lineTo(x + Math.cos(a) * d.c, y + Math.sin(a) * d.c);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    // Tick: once settled, each line is drawn left to right in turn.
    ticks.forEach((k, i) => {
      const q = clamp((t - GATHER * 0.62 - i * 140) / 360);
      if (q <= 0) return;
      ctx.strokeStyle = look.getPropertyValue(bars ? '--marigold' : '--on-desk').trim(); ctx.lineWidth = bars ? 5 : 1.5;
      ctx.beginPath();
      for (const dy of k.double ? [0, 4] : [0]) { ctx.moveTo(k.x0, k.y + dy); ctx.lineTo(k.x0 + (k.x1 - k.x0) * ease(q), k.y + dy); }
      ctx.stroke();
    });
  };
  play(canvas, motion, GATHER, layout, frame);
}

/** Blocks settle into place once in view; one that takes the focus first shows at once. */
function settling() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('settled'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-settle]').forEach((el) => io.observe(el));
  document.addEventListener('focusin', (e) => {
    const r = (e.target as Element).closest?.<HTMLElement>('[data-settle]:not(.settled)');
    if (r) { r.style.transition = 'none'; r.classList.add('settled'); }
  });
}

/** The top bar steps out of the way while reading down and comes back on the way up (or when it holds the focus). */
function header() {
  const bar = document.querySelector<HTMLElement>('[data-header]');
  if (!bar) return;
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (y > last + 4 && y > 240) bar.dataset.away = '';
    else if (y < last - 4) delete bar.dataset.away;
    last = y;
  }, { passive: true });
}

/**
 * The trailers after the first come as the reader nears them, half a screen ahead (AG3b, D-UX-78), so home's first load stays
 * within F15: each line's strokes are put in beside its words, which then go to screen readers only. If they never come,
 * the words stay in type. Under reduced motion they come the same way and stand written.
 */
const loaded = new WeakMap<HTMLElement, Promise<boolean>>();
function nearing(sheet: HTMLElement) {
  let done: (ok: boolean) => void = () => undefined;
  loaded.set(sheet, new Promise((r) => { done = r; }));
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fetch(sheet.dataset.src ?? '').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((j: { lines: (string | null)[] }) => {
      sheet.querySelectorAll('[data-beat]').forEach((b, i) => {
        const svg = j.lines[i];
        if (svg && b.firstElementChild) { b.firstElementChild.className = 'sr-only'; b.insertAdjacentHTML('beforeend', svg); }
      });
      return true;
    }).catch(() => false).then((ok) => { done(ok); sheet.removeAttribute('data-src'); });
  }, { rootMargin: '0px 0px 50% 0px' });
  io.observe(sheet);
}

/** How fast the reader goes down the page, in px a ms, smoothed; nil once still for 150 ms, or going up. */
const reader = (() => {
  let y = 0, t = 0, v = 0;
  addEventListener('scroll', () => {
    const n = performance.now();
    if (t && n > t) v = 0.6 * v + 0.4 * ((scrollY - y) / (n - t));
    y = scrollY; t = n;
  }, { passive: true });
  return () => (performance.now() - t > 150 ? 0 : Math.max(0, v));
})();

/**
 * Keeps a piece of motion in step with the reader (D-UX-78): at the reader's speed down the page, it plays fast enough to
 * end before it leaves the screen (up to six times its pace), and eases back to its own pace once the reader slows; once
 * scrolled past, it shows whole. `downs` are the pen's strokes on its timeline, for the pencil's sound.
 */
function follow(el: Element, anims: Animation[], end: number, downs?: [number, number][]) {
  let rate = 1;
  const tick = () => {
    const a = anims[0];
    if (!a || anims.some((x) => x.playState === 'idle') || anims.every((x) => x.playState === 'finished')) { pencil.down(el, false); return; }
    const box = el.getBoundingClientRect(), v = reader();
    if (box.bottom < 0) { anims.forEach((x) => x.finish()); pencil.down(el, false); return; }
    const now = Number(a.currentTime ?? 0), leave = v > 0.05 ? box.bottom / v : Infinity;
    const want = Math.min(6, Math.max(1, (end - now) / Math.max(leave, 1)));
    let next = rate + (want - rate) * (want > rate ? 0.5 : 0.08);
    if (Math.abs(want - next) < 0.05) next = want;
    if (next !== rate) { rate = next; anims.forEach((x) => x.updatePlaybackRate(rate)); }
    if (downs) pencil.down(el, downs.some(([f, to]) => now >= f && now < to));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * The pencil's scratch (D-UX-78): made in the page from noise through a band of a pencil's pitch, so no sound file loads;
 * silent until the reader switches it on, and heard only while a pen is down, its loudness a little uneven, as graphite
 * on paper is.
 */
const pencil = (() => {
  let ctx: AudioContext | undefined, gain: GainNode | undefined, band: BiquadFilterNode | undefined, on = false;
  const down = new Set<Element>();
  const begin = () => {
    ctx = new AudioContext();
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 3500; band.Q.value = 0.8;
    gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start();
  };
  return {
    set(v: boolean) { on = v; if (v && !ctx) begin(); void (v ? ctx?.resume() : ctx?.suspend()); },
    down(el: Element, d: boolean) {
      if (d) down.add(el); else down.delete(el);
      if (!on || !ctx || !gain || !band) return;
      gain.gain.setTargetAtTime(down.size ? 0.1 + Math.random() * 0.08 : 0, ctx.currentTime, 0.015);
      band.frequency.setTargetAtTime(2800 + Math.random() * 1600, ctx.currentTime, 0.03);
    },
  };
})();

/** The pencil's switch, off by default; shown only where the page can make the sound. */
function sound() {
  const b = document.querySelector<HTMLButtonElement>('[data-sound]');
  if (!b || !('AudioContext' in window)) return;
  b.hidden = false;
  b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true', state = b.querySelector('[data-state]');
    b.setAttribute('aria-pressed', String(on));
    if (state) state.textContent = ` · ${on ? 'on' : 'off'}`;
    pencil.set(on);
  });
}

/**
 * A story's trailer (AG3, D-UX-77): once the sheet is in view, the pen writes each line letter by letter, stroke after
 * stroke at one speed with a short lift between, a typeset card settles between the shots, a beat of stillness before
 * the last line, and the marigold marker swipes the result; about 5.5 s in all at its own pace, quicker for a reader who
 * scrolls fast (`follow`). "Show it all" finishes it at once, then offers to write it again. Without scripts or under
 * reduced motion it stands written; one whose strokes never came keeps its words in type.
 */
function trailer(sheet: HTMLElement) {
  void (loaded.get(sheet) ?? Promise.resolve(true)).then((ok) => { if (ok) write(sheet); });
}
function write(sheet: HTMLElement) {
  const beats = [...sheet.querySelectorAll<HTMLElement>('[data-beat]')], mark = sheet.querySelector<SVGRectElement>('[data-mark]');
  const btn = sheet.closest('[data-reel]')?.querySelector<HTMLButtonElement>('[data-show]');
  const strokes = (b: HTMLElement) => [...b.querySelectorAll<SVGPathElement>('path')];
  const pens = beats.filter((b) => b.dataset.beat !== 'card');
  let anims: Animation[] = [];
  const hide = () => {
    for (const b of beats) if (b.dataset.beat === 'card') b.style.opacity = '0';
    for (const p of pens.flatMap(strokes)) { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; }
    if (mark) { mark.style.transformBox = 'fill-box'; mark.style.transformOrigin = 'left center'; mark.style.transform = 'scaleX(0)'; }
  };
  const play = () => {
    const all = pens.flatMap(strokes), length = all.reduce((a, p) => a + p.getTotalLength(), 0);
    // The pen's speed: about 3 s of writing; the cards, the gaps, the lifts, the beat and the marker take the rest.
    const lift = 6, speed = length / 3000, settle = { duration: 300, easing: 'ease-out', fill: 'both' as const }, downs: [number, number][] = [];
    let t = 0;
    for (const [k, b] of beats.entries()) {
      if (b.dataset.beat === 'card') {
        if (k === beats.length - 2) t += 300;
        anims.push(b.animate([{ opacity: 0, transform: 'translateY(-0.4rem)' }, { opacity: 1, transform: 'none' }], { ...settle, delay: t }));
        t += 300;
        continue;
      }
      for (const p of strokes(b)) {
        const d = p.getTotalLength() / speed;
        anims.push(p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: d, delay: t, fill: 'both' }));
        downs.push([t, t + d]);
        t += d + lift;
      }
      t += 100;
    }
    if (mark) { anims.push(mark.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 400, delay: t, easing: 'ease-out', fill: 'both' })); t += 400; }
    void Promise.all(anims.map((a) => a.finished)).then(() => say(), () => undefined);
    follow(sheet, anims, t, downs);
    say();
  };
  const done = () => anims.length > 0 && anims.every((a) => a.playState === 'finished');
  const say = () => { if (btn) btn.textContent = done() ? 'Write it again' : 'Show it all'; };
  hide();
  // A third of the sheet, or half a short screen (1280 at 400%) when the sheet is taller than the screen.
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.intersectionRatio >= 0.35 || e.intersectionRect.height >= innerHeight / 2)) { io.disconnect(); play(); }
  }, { threshold: [0, 0.1, 0.2, 0.35] });
  io.observe(sheet);
  if (!btn) return;
  btn.hidden = false;
  say();
  btn.addEventListener('click', () => {
    if (btn.textContent === 'Show it all') { io.disconnect(); if (!anims.length) play(); anims.forEach((a) => a.finish()); say(); return; }
    anims.forEach((a) => a.cancel()); anims = []; play();
  });
}

/**
 * The tool drawings draw themselves once as each comes into view (D-UX-73, D-UX-77): one pen at a constant speed, its
 * strokes in the order the drawing lists them (the ground, then the walls, the roof, the openings, the details), each
 * stroke's time set by its length, about 2 s in all, quicker for a reader who scrolls fast (`follow`, D-UX-78). While it
 * draws, each stroke is dashed by its own length, so it scales with the drawing (a non-scaling stroke dashes in screen
 * units and stops short: docs/GOTCHAS.md); once drawn, the one path is put back. One already in view when the page opens
 * stays drawn; without scripts or under reduced motion each stands finished.
 */
function drawings() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      const svg = e.target as SVGSVGElement;
      if (svg.dataset.split) {
        if (!e.isIntersecting) continue;
        io.unobserve(svg);
        const anims = [...svg.querySelectorAll<SVGElement>('[data-stroke]')].map((p) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
          { duration: Number(p.dataset.d), delay: Number(p.dataset.t), easing: 'linear', fill: 'both' }));
        void Promise.all(anims.map((a) => a.finished)).then(() => {
          svg.querySelectorAll('[data-stroke]').forEach((p) => p.remove());
          svg.querySelectorAll<SVGElement>('[data-whole]').forEach((p) => p.style.removeProperty('display'));
        }, () => undefined);
        follow(svg, anims, Number(svg.dataset.split));
        continue;
      }
      if (e.isIntersecting) { io.unobserve(svg); continue; }
      const scale = svg.clientWidth / svg.viewBox.baseVal.width, width = `${(1.6 / (scale || 1)).toFixed(3)}`;
      const strokes: SVGGeometryElement[] = [];
      for (const whole of svg.querySelectorAll<SVGGeometryElement>('path, circle')) {
        const parts = whole.tagName === 'path' ? (whole.getAttribute('d') ?? '').split(/(?=M)/) : [null];
        for (const part of parts) {
          const p = whole.cloneNode() as SVGGeometryElement;
          if (part) p.setAttribute('d', part);
          p.removeAttribute('vector-effect'); p.setAttribute('stroke-width', width); p.setAttribute('pathLength', '1'); p.dataset.stroke = '';
          p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1';
          whole.before(p); strokes.push(p);
        }
        whole.dataset.whole = ''; whole.style.display = 'none';
      }
      // One pen: each stroke after the last, at the same speed, with a short lift between.
      const lengths = strokes.map((p) => p.getTotalLength()), lift = Math.min(0.03, 0.6 / strokes.length);
      const speed = lengths.reduce((a, b) => a + b, 0) / (2 - lift * strokes.length);
      let t = 0;
      for (const [k, p] of strokes.entries()) {
        const d = lengths[k] / Math.max(speed, 1);
        p.dataset.t = String(Math.round(t * 1000)); p.dataset.d = String(Math.round(d * 1000));
        t += d + lift;
      }
      svg.dataset.split = String(Math.round(t * 1000));
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-draw]').forEach((s) => io.observe(s));
}
