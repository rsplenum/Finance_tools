/**
 * The home page's motion (AG1, D-UX-66): the fields of dashes, the typed headings, the rise into view, the top bar that
 * hides while reading down, the DSCR story's steps, the chips that drift with the scroll and the use cases' buttons. What
 * starts by itself stops within 5 s or follows the reader; the story, which runs longer, has a Stop (WCAG 2.2.2). Under
 * reduced motion Base.astro leaves out the `js` mark: the fields are drawn once, still, and everything shows.
 */
export function start() {
  const motion = document.documentElement.classList.contains('js');
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]')) field(c, motion);
  slider(motion);
  if (!motion) return;
  typing();
  rising();
  header();
  story();
  drift();
}

interface Dash { hx: number; hy: number; a: number; c: number; ox: number; oy: number }
const SETTLE = 2400; // ms for the dashes to drift into place
const REACH = 130; // px around the pointer that the dashes move away from

/** A field of short dashes in a ring around the words; they drift in once, then move only away from the pointer. */
function field(canvas: HTMLCanvasElement, motion: boolean) {
  const ctx = canvas.getContext('2d'), host = canvas.parentElement;
  if (!ctx || !host) return;
  let dashes: Dash[] = [], w = 0, h = 0, raf = 0, born = 0, px = -1e4, py = -1e4;
  const layout = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = Math.round(Math.min(420, (w * h) / 2600)), cx = w / 2, cy = h / 2;
    dashes = Array.from({ length: n }, () => {
      const t = rnd() * Math.PI * 2, k = 0.45 + Math.sqrt(rnd()) * 0.6; // emptier in the middle, where the words are
      return { hx: cx + Math.cos(t) * w * 0.6 * k, hy: cy + Math.sin(t) * h * 0.6 * k, a: t + (rnd() - 0.5) * 0.8, c: Math.floor(rnd() * 3), ox: 0, oy: 0 };
    });
  };
  const draw = (e: number) => {
    const css = getComputedStyle(canvas), cx = w / 2, cy = h / 2, len = 2 + 3 * e;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.75 * e;
    for (let c = 0; c < 3; c++) {
      ctx.strokeStyle = css.getPropertyValue(`--spark-${c + 1}`).trim();
      ctx.beginPath();
      for (const d of dashes) {
        if (d.c !== c) continue;
        const x = cx + (d.hx - cx) * (0.7 + 0.3 * e) + d.ox, y = cy + (d.hy - cy) * (0.7 + 0.3 * e) + d.oy;
        ctx.moveTo(x - Math.cos(d.a) * len, y - Math.sin(d.a) * len); ctx.lineTo(x + Math.cos(d.a) * len, y + Math.sin(d.a) * len);
      }
      ctx.stroke();
    }
  };
  const tick = (now: number) => {
    raf = 0;
    const p = Math.min(1, (now - born) / SETTLE), e = 1 - (1 - p) ** 3;
    let busy = p < 1;
    for (const d of dashes) {
      const dx = d.hx - px, dy = d.hy - py, r = Math.hypot(dx, dy), push = r < REACH ? ((1 - r / REACH) ** 2 * 26) / (r || 1) : 0;
      const tx = dx * push, ty = dy * push;
      d.ox += (tx - d.ox) * 0.16; d.oy += (ty - d.oy) * 0.16;
      if (Math.abs(tx - d.ox) + Math.abs(ty - d.oy) > 0.1) busy = true;
    }
    draw(e);
    if (busy) raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  layout();
  if (!motion) {
    draw(1);
    new ResizeObserver(() => { layout(); draw(1); }).observe(canvas);
    new MutationObserver(() => draw(1)).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return;
  }
  draw(0);
  const seen = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { seen.disconnect(); born = performance.now(); wake(); } });
  seen.observe(canvas);
  let wide = w;
  new ResizeObserver(() => { if (Math.abs(canvas.getBoundingClientRect().width - wide) < 1 && born) return; layout(); wide = w; if (born) wake(); }).observe(canvas);
  new MutationObserver(() => { if (born) wake(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  host.addEventListener('pointermove', (ev) => { const r = canvas.getBoundingClientRect(); px = ev.clientX - r.left; py = ev.clientY - r.top; if (born) wake(); });
  host.addEventListener('pointerleave', () => { px = py = -1e4; if (born) wake(); });
}

/** A heading types itself once in view; its words are all in the page from the start (the rest is only unseen). */
function typing() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); type(e.target as HTMLElement); }
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-typed]').forEach((el) => io.observe(el));
}

function type(el: HTMLElement) {
  const done = el.querySelector('.done'), rest = el.querySelector('.rest');
  if (!done || !rest) return;
  const text = (done.textContent ?? '') + (rest.textContent ?? ''), each = Math.max(16, Math.min(45, 1600 / text.length)), t0 = performance.now();
  el.classList.add('typing');
  const tick = (now: number) => {
    const i = Math.min(text.length, Math.floor((now - t0) / each));
    done.textContent = text.slice(0, i); rest.textContent = text.slice(i);
    if (i < text.length) requestAnimationFrame(tick);
    else setTimeout(() => el.classList.remove('typing'), 1600);
  };
  requestAnimationFrame(tick);
}

/** Blocks rise into view once; one that takes the focus first shows at once. */
function rising() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('risen'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-rise]').forEach((el) => io.observe(el));
  document.addEventListener('focusin', (e) => {
    const r = (e.target as Element).closest?.<HTMLElement>('[data-rise]:not(.risen)');
    if (r) { r.style.transition = 'none'; r.classList.add('risen'); }
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

/** The DSCR story: the answers one by one, the bars, the verdict, the fix and the bars again; Stop shows it all. */
function story() {
  const box = document.querySelector<HTMLElement>('[data-story]'), play = box?.querySelector<HTMLButtonElement>('[data-play]');
  if (!box || !play) return;
  const steps = [...box.querySelectorAll<HTMLElement>('[data-at]')], last = Math.max(...steps.map((s) => Number(s.dataset.at)));
  let at = 0, timer = 0, running = false;
  const show = () => steps.forEach((s) => s.classList.toggle('on', Number(s.dataset.at) <= at));
  const say = () => { play.textContent = running ? 'Stop and show it all' : 'Play it again'; };
  const next = () => {
    at += 1; show();
    if (at >= last) { running = false; say(); return; }
    timer = window.setTimeout(next, at < 7 ? 650 : 1500);
  };
  const go = () => { at = 0; show(); running = true; say(); timer = window.setTimeout(next, 300); };
  const stop = () => { clearTimeout(timer); at = last; show(); running = false; say(); };
  play.hidden = false;
  say();
  play.addEventListener('click', () => (running ? stop() : go()));
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: 0.25 });
  io.observe(box);
}

/** The row of chips slides sideways as its section passes through the screen. */
function drift() {
  const row = document.querySelector<HTMLElement>('[data-drift]'), host = row?.parentElement;
  if (!row || !host) return;
  let raf = 0;
  const set = () => {
    raf = 0;
    const r = host.getBoundingClientRect(), span = row.offsetWidth - host.clientWidth;
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    row.style.setProperty('--drift', `${span > 0 ? -span * p : 0}px`);
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(set); }, { passive: true });
  addEventListener('resize', set);
  set();
}

/** Previous and Next scroll the use cases a card at a time; each says when it is at its end. */
function slider(motion: boolean) {
  const list = document.querySelector<HTMLElement>('[data-slider]'), pair = document.querySelector<HTMLElement>('[data-slide-buttons]');
  if (!list || !pair) return;
  const buttons = [...pair.querySelectorAll<HTMLButtonElement>('[data-slide]')];
  const ends = () => {
    const max = list.scrollWidth - list.clientWidth - 2;
    for (const b of buttons) b.setAttribute('aria-disabled', String(Number(b.dataset.slide) < 0 ? list.scrollLeft <= 2 : list.scrollLeft >= max));
  };
  for (const b of buttons) b.addEventListener('click', () => {
    const card = list.querySelector('li');
    list.scrollBy({ left: Number(b.dataset.slide) * ((card?.getBoundingClientRect().width ?? 300) + 16), behavior: motion ? 'smooth' : 'auto' });
  });
  list.addEventListener('scroll', ends, { passive: true });
  addEventListener('resize', ends);
  pair.hidden = false;
  ends();
}
