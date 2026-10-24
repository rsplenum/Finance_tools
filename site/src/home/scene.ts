/**
 * The DSCR scene's motion (HOME1d, D-UX-125; Scene.astro, docs/DESIGN-MOTION.md): the five beats in 12.8 s, played once
 * when the scene comes into view, loaded after the page. Every move is a Web Animation (element.animate), never a timer or
 * a frame loop, so `document.getAnimations()` can pause and seek the whole scene (the video studio, D-TECH-56). Springs
 * are underdamped (damping ratio about 0.7, the brackets' snap about 0.45) and written as CSS `linear()` easings; cards
 * stagger by 60 ms; wires are flat-tangent curves drawn by their dash offset and lit by a marigold pulse (the owner's
 * analysis, D-UX-123). The HTML is the finished state: at the end every animation is cancelled and the page stands as built.
 */

/** When each beat starts, in ms, and the whole (F9 waits for it, D-UX-125). */
const BEAT = [0, 1600, 4000, 7000, 9800], WHOLE = 12800;

/** A damped spring from 0 to 1 sampled into a CSS `linear()` easing; it settles within the animation's duration. */
function spring(zeta: number, n = 40) {
  const w = 6.4 / zeta, wd = w * Math.sqrt(1 - zeta * zeta), pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    pts.push((1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))).toFixed(4));
  }
  return `linear(${pts.join(', ')}, 1)`;
}
const LINEAR_OK = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
const SPRING = LINEAR_OK ? spring(0.7) : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
const SNAP = LINEAR_OK ? spring(0.45) : 'cubic-bezier(0.34, 1.8, 0.64, 1)';
const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)', OUT = 'cubic-bezier(0.2, 0.7, 0.3, 1)', GLIDE = 'cubic-bezier(0.45, 0, 0.2, 1)';
const SVG = 'http://www.w3.org/2000/svg';
/** A wire drawn from its start to its end (pathLength 1). */
const DRAW: Keyframe[] = [{ strokeDasharray: '1', strokeDashoffset: '1' }, { strokeDasharray: '1', strokeDashoffset: '0' }];

type Pt = { x: number; y: number };
/** A flat-tangent curve (weight 0.55 of the run) from a to b, along x on a desktop and along y on a phone. */
const curve = (a: Pt, b: Pt, across: boolean) => {
  const k = 0.55 * (across ? b.x - a.x : b.y - a.y);
  return across ? `M${a.x} ${a.y}C${a.x + k} ${a.y} ${b.x - k} ${b.y} ${b.x} ${b.y}` : `M${a.x} ${a.y}C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`;
};

/** The scene's parts, found once. */
function parts(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(s: string, from: ParentNode = root) => from.querySelector(s) as T;
  const qa = <T extends Element = HTMLElement>(s: string, from: ParentNode = root) => [...from.querySelectorAll<T>(s)] as T[];
  return {
    stage: q('[data-stage]'), inputs: q('[data-inputs]'), cards: qa('[data-card]'), term: q('[data-term]'),
    hub: q('[data-hub]'), panel: q('[data-panel]'), rows: qa('[data-yr]'), rowsBox: q('[data-rows]'), doc: q('[data-doc]'),
    lens: q('[data-lens]'), frame: q('[data-rframe]'), button: q<HTMLButtonElement>('[data-replay]'),
    names: qa('[data-beat-name]'), caps: qa('[data-cap]'), steps: qa('[data-step]'), q, qa,
  };
}
type Parts = ReturnType<typeof parts>;

/** The wires' geometry in the stage's own pixels: each answer into the hub, the hub out to the years, and on to the statement. */
function geometry(p: Parts) {
  const o = p.stage.getBoundingClientRect(), across = matchMedia('(min-width: 1024px)').matches;
  const r = (el: Element) => { const b = el.getBoundingClientRect(); return { l: b.left - o.left, t: b.top - o.top, r: b.right - o.left, b: b.bottom - o.top, w: b.width, h: b.height }; };
  const hub = r(p.hub), hin = across ? { x: hub.l + 2, y: hub.t + hub.h / 2 } : { x: hub.l + hub.w / 2, y: hub.t + 2 };
  const hout = across ? { x: hub.r - 2, y: hub.t + hub.h / 2 } : { x: hub.l + hub.w / 2, y: hub.b - 2 };
  const box = r(p.inputs), panel = r(p.panel.firstElementChild as Element), doc = r(p.doc);
  const ins = p.cards.map((c) => { const k = r(c); return curve(across ? { x: k.r, y: k.t + k.h / 2 } : { x: k.l + k.w / 2, y: box.b }, hin, across); });
  const outs = across ? p.rows.map((row) => { const k = r(row); return curve(hout, { x: panel.l, y: k.t + k.h / 2 }, true); }) : [curve(hout, { x: panel.l + panel.w / 2, y: panel.t }, false)];
  const toDoc = curve(hout, across ? { x: doc.l, y: doc.t + Math.min(72, doc.h / 2) } : { x: doc.l + doc.w / 2, y: doc.t }, across);
  return { w: o.width, h: o.height, across, ins, outs, toDoc };
}

/** The wires' layer, behind the cards; `final` keeps only what the finished state shows: the answers in, the hub to the statement. */
function wires(p: Parts, final: boolean) {
  p.stage.querySelector(':scope > svg[data-wires]')?.remove();
  const g = geometry(p), svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('data-wires', '');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: '0' });
  const path = (d: string, kind: string) => {
    const e = document.createElementNS(SVG, 'path');
    e.setAttribute('d', d);
    e.setAttribute('fill', 'none');
    e.setAttribute('stroke', 'oklch(1 0 0 / 0.3)');
    e.setAttribute('stroke-width', '1.25');
    e.setAttribute('pathLength', '1');
    e.dataset.wire = kind;
    svg.append(e);
    return e;
  };
  const ins = g.ins.map((d) => path(d, 'in')), outs = final ? [] : g.outs.map((d) => path(d, 'out')), toDoc = path(g.toDoc, 'doc');
  p.stage.prepend(svg);
  return { svg, ins, outs, toDoc, across: g.across };
}

/** A run of the scene: its animations, and the elements made for it alone. */
class Run {
  anims: Animation[] = [];
  made: Element[] = [];
  private had = new WeakMap<Element, Set<string>>();
  /** An element's first animation of a property fills both ways, so it holds its first frame until it starts; a later one
   *  of the same property fills forwards, or it would hold that element at its own first frame from the start (GOTCHAS, HOME1c). */
  add(el: Element, kf: Keyframe[], at: number, ms: number, easing = OUT) {
    const props = Object.keys(kf[0]).filter((k) => k !== 'offset' && k !== 'easing'), seen = this.had.get(el) ?? new Set<string>();
    const fill: FillMode = props.some((k) => seen.has(k)) ? 'forwards' : 'both';
    for (const k of props) seen.add(k);
    this.had.set(el, seen);
    const a = el.animate(kf, { delay: at, duration: Math.max(1, ms), easing, fill });
    this.anims.push(a);
    return a;
  }
  /** Shown from `from` to `to` within the whole, faded in and out over 160 ms; the last beat's stays. */
  window(el: Element, from: number, to: number, on: Keyframe = { opacity: 1 }, off: Keyframe = { opacity: 0 }) {
    const f = (t: number) => Math.min(1, Math.max(0, t / WHOLE));
    const kf: Keyframe[] = [{ ...off, offset: 0 }];
    if (from > 0) kf.push({ ...off, offset: f(from) });
    kf.push({ ...on, offset: f(from + 160) });
    if (to < WHOLE) kf.push({ ...on, offset: f(to) }, { ...off, offset: f(to + 160) });
    kf.push({ ...(to < WHOLE ? off : on), offset: 1 });
    return this.add(el, kf, 0, WHOLE, 'linear');
  }
  make<T extends Element>(el: T) { this.made.push(el); return el; }
}

/** A marigold pulse along a wire: its points sampled from the path, moved by transform. */
function pulse(r: Run, svg: SVGSVGElement, path: SVGPathElement, at: number, ms: number) {
  const len = path.getTotalLength(), dot = r.make(document.createElementNS(SVG, 'circle'));
  dot.setAttribute('r', '4');
  dot.setAttribute('fill', 'var(--marigold)');
  dot.setAttribute('style', 'filter: drop-shadow(0 0 6px var(--marigold))');
  svg.append(dot);
  const n = 16, kf: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const pt = path.getPointAtLength((len * i) / n);
    kf.push({ transform: `translate(${pt.x}px, ${pt.y}px)`, opacity: i === 0 || i === n ? 0 : 1, offset: i / n });
  }
  r.add(dot, kf, at, ms, 'cubic-bezier(0.4, 0, 0.3, 1)');
}

/** A ring that leaves the hub once. */
function ripple(r: Run, hub: HTMLElement, at: number) {
  const e = r.make(document.createElement('span'));
  Object.assign(e.style, { position: 'absolute', inset: '0', borderRadius: '999px', border: '1.5px solid var(--marigold)', pointerEvents: 'none' });
  hub.append(e);
  r.add(e, [{ opacity: 0.8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.55)' }], at, 750, 'ease-out');
}

/** The scene's controller: plays it, ends it on "Show it all", and plays it again. */
export function scene(root: HTMLElement) {
  const p = parts(root);
  let run: Run | undefined;
  const css = getComputedStyle(root), ink = css.getPropertyValue('--ink').trim(), miss = css.getPropertyValue('--miss').trim();

  const end = () => {
    if (!run) return;
    const r = run;
    run = undefined;
    for (const a of r.anims) a.cancel();
    for (const e of r.made) e.remove();
    wires(p, true);
    root.removeAttribute('data-running');
    root.setAttribute('data-played', '');
    p.button.textContent = 'Play it again';
    p.button.hidden = false;
  };

  const play = () => {
    if (run) end();
    root.removeAttribute('data-played');
    root.setAttribute('data-running', '');
    const r = (run = new Run()), w = wires(p, false);
    const across = w.across, B = BEAT;

    // The beat's name, its caption and its place on the rail.
    p.names.forEach((e, i) => r.window(e, B[i], B[i + 1] ?? WHOLE));
    p.caps.forEach((e, i) => r.window(e, B[i] + 120, B[i + 1] ?? WHOLE, { opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }));
    p.steps.forEach((e, i) => {
      const dot = e.querySelector('i') as HTMLElement, label = e.querySelector('span') as HTMLElement;
      r.add(dot, [{ opacity: 0.3, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.35)' }], B[i], 450, SNAP);
      if (i < B.length - 1) r.add(dot, [{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], B[i + 1], 300);
      r.window(label, B[i], B[i + 1] ?? WHOLE, { opacity: 1 }, { opacity: 0.55 });
    });

    // 1. The bank's question: the year-by-year panel, empty, its target drawn down the tracks.
    r.add(p.panel, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], 120, 500, SPRING);
    p.qa('[data-tl]').forEach((e, i) => r.add(e, [{ transform: 'scaleY(0)', transformOrigin: 'top' }, { transform: 'scaleY(1)', transformOrigin: 'top' }], 450 + i * 50, 380, OUT));
    r.add(p.q('.tlabel'), [{ opacity: 0 }, { opacity: 1 }], 600, 300);
    p.rows.forEach((row, i) => { if (!row.querySelector('[data-t]')) r.add(row.querySelector('.fy') as Element, [{ opacity: 0 }, { opacity: 1 }], B[3] + 2000 + i * 60, 250); });

    // 2. Seven answers: the cards settle one after another, their wires draw into the hub and a pulse runs each.
    p.cards.forEach((c, i) => r.add(c, [{ opacity: 0, transform: across ? 'translateX(-20px) scale(0.96)' : 'translateY(14px) scale(0.96)' }, { opacity: 1, transform: 'none' }], B[1] + 100 + i * 60, 650, SPRING));
    w.ins.forEach((e, i) => r.add(e, DRAW, B[1] + 650 + i * 60, 500, EXPO));
    r.add(p.hub, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], B[1] + 900, 700, SPRING);
    w.ins.forEach((e, i) => pulse(r, w.svg, e, B[1] + 1350 + i * 60, 600));
    ripple(r, p.hub, B[1] + 2000);

    // 3. Every year worked out: the dial turns, the years fill, the lens stops on the weakest and the brackets snap on it.
    const dial = p.q('[data-dial]');
    r.add(dial, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], B[2], 1400, GLIDE);
    w.outs.forEach((e, i) => r.add(e, DRAW, (i < 6 || !across ? B[2] + 300 : B[3] + 2000) + i * 50, 500, EXPO));
    const typedRows = p.rows.filter((row) => row.querySelector('[data-t]'));
    (across ? w.outs.slice(0, typedRows.length) : w.outs).forEach((e, i) => pulse(r, w.svg, e, B[2] + 500 + i * 50, 500));
    p.rows.forEach((row, i) => {
      const bar = row.querySelector('[data-yb]') as HTMLElement, t = row.querySelector('[data-t]'), f = row.querySelector('[data-f]') as Element;
      const ratio = Number(bar.dataset.ratio), was = bar.hasAttribute('data-miss') ? miss : ink;
      if (t) {
        r.add(bar, [{ transform: 'scaleX(0)', backgroundColor: was }, { transform: `scaleX(${ratio})`, backgroundColor: was }], B[2] + 600 + i * 60, 650, SPRING);
        r.add(t, [{ opacity: 0 }, { opacity: 1 }], B[2] + 800 + i * 60, 250);
        r.add(bar, [{ transform: `scaleX(${ratio})`, backgroundColor: was }, { transform: 'scaleX(1)', backgroundColor: ink }], B[3] + 1700 + i * 60, 750, SPRING);
        r.add(t, [{ opacity: 1 }, { opacity: 0 }], B[3] + 1700 + i * 60, 250);
      } else r.add(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], B[3] + 2050 + i * 60, 750, SPRING);
      r.add(f, [{ opacity: 0 }, { opacity: 1 }], B[3] + 1850 + i * 60, 300);
    });
    // Geometry first, then the moves (GOTCHAS, HOME1c): each row's top within the rows' box, and where the lens rides.
    const top = (row: HTMLElement) => row.getBoundingClientRect().top - p.rowsBox.getBoundingClientRect().top;
    const track = p.rows[0].querySelector('.track') as HTMLElement, lx = track.offsetLeft + track.offsetWidth * 0.45 - 20, rh = p.rows[0].offsetHeight;
    const weakT = p.rows.findIndex((x) => x.hasAttribute('data-weak-typed')), weakF = p.rows.findIndex((x) => x.hasAttribute('data-weak-fixed'));
    const at = (i: number) => `translate(${lx}px, ${top(p.rows[i]) + rh / 2 - 22}px)`;
    const glide: Keyframe[] = typedRows.slice(0, weakT + 1).map((_, i) => ({ transform: at(i) }));
    r.add(p.lens, glide.length > 1 ? glide : [glide[0], glide[0]], B[2] + 1400, 1000, GLIDE);
    r.add(p.lens, [{ opacity: 0 }, { opacity: 1 }], B[2] + 1350, 250);
    r.add(p.lens, [{ transform: at(weakT) }, { transform: at(weakF) }], B[3] + 2300, 600, SPRING);
    r.add(p.lens, [{ opacity: 1 }, { opacity: 0 }], B[4], 300);
    const fT = `translateY(${top(p.rows[weakT])}px)`, fF = `translateY(${top(p.rows[weakF])}px)`;
    r.add(p.frame, [{ opacity: 0, transform: `${fT} scale(1.08)` }, { opacity: 1, transform: fT }], B[2] + 2350, 450, SNAP);
    r.add(p.frame, [{ transform: fT, backgroundColor: 'oklch(0.72 0.16 22 / 0.14)' }, { transform: fF, backgroundColor: 'oklch(0.82 0.15 76 / 0.12)' }], B[3] + 2300, 600, SPRING);
    // The weakest year's sum, and the chip under it.
    const [labelT, figT, chipT] = p.qa('.sum [data-t]'), [labelF, figF, chipF] = p.qa('.sum [data-f]');
    r.add(labelT, [{ opacity: 0 }, { opacity: 1 }], B[2] + 2450, 250);
    r.add(figT, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], B[2] + 2550, 400, SPRING);
    r.add(chipT, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'none' }], B[2] + 2700, 450, SNAP);
    for (const e of [labelF, figF, chipF]) r.add(e, [{ opacity: 0 }, { opacity: 0 }], 0, 1);
    [labelT, figT, chipT].forEach((e, i) => r.add(e, [{ opacity: 1 }, { opacity: 0 }], B[3] + 2400 + i * 60, 220));
    r.add(labelF, [{ opacity: 0 }, { opacity: 1 }], B[3] + 2500, 250);
    r.add(figF, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], B[3] + 2560, 400, SPRING);
    r.add(chipF, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'none' }], B[3] + 2700, 450, SNAP);

    // 4. The change that passes: brackets snap onto the term, 60 lifts out leaving its slot dashed, 80 springs in, and the
    //    hub and the years follow.
    p.qa('[data-brk]', p.term).forEach((e, i) => {
      r.add(e, [{ opacity: 0, transform: 'scale(1.9)' }, { opacity: 1, transform: 'none' }], B[3] + 80 + i * 30, 420, SNAP);
      r.add(e, [{ opacity: 1 }, { opacity: 0 }], B[4], 300);
    });
    r.add(p.term, [{ transform: 'none', boxShadow: '0 0 0 0 transparent' }, { transform: 'translateY(-4px)', boxShadow: '0 18px 40px -12px oklch(0 0 0 / 0.65)' }], B[3] + 150, 350, SPRING);
    r.add(p.term, [{ transform: 'translateY(-4px)', boxShadow: '0 18px 40px -12px oklch(0 0 0 / 0.65)' }, { transform: 'none', boxShadow: '0 0 0 0 transparent' }], B[3] + 1350, 400, SPRING);
    const slot = p.term.querySelector('.slot') as HTMLElement, ghost = r.make(document.createElement('span'));
    Object.assign(ghost.style, { gridArea: '1 / 1', border: '1.5px dashed var(--marigold)', borderRadius: '0.375rem', margin: '-0.0625rem -0.25rem', pointerEvents: 'none' });
    slot.append(ghost);
    r.add(ghost, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], B[3] + 400, 700, 'linear');
    const [termWas, termNow] = [slot.querySelector('[data-was]') as Element, slot.querySelector('[data-now]') as Element];
    r.add(termWas, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-16px)' }], B[3] + 350, 320, OUT);
    r.add(termNow, [{ opacity: 0, transform: 'translateY(-20px) scale(1.05)' }, { opacity: 1, transform: 'none' }], B[3] + 750, 550, SPRING);
    pulse(r, w.svg, w.ins[p.cards.indexOf(p.term)], B[3] + 1250, 450);
    const [hubWas, hubNow] = [p.q('[data-was]', p.hub), p.q('[data-now]', p.hub)];
    r.add(hubWas, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], B[3] + 1550, 250);
    r.add(hubNow, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], B[3] + 1650, 450, SPRING);
    r.add(dial, [{ transform: 'rotate(360deg)' }, { transform: 'rotate(720deg)' }], B[3] + 1550, 1000, GLIDE);
    ripple(r, p.hub, B[3] + 1650);
    (across ? w.outs : w.outs.slice(0, 1)).forEach((e, i) => pulse(r, w.svg, e, B[3] + 1800 + i * 50, 450));

    // 5. The statement for the lender: the panel lifts away, the statement settles in its place and shows what it holds.
    r.add(p.panel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px) scale(0.97)' }], B[4], 450, OUT);
    w.outs.forEach((e) => r.add(e, [{ opacity: 1 }, { opacity: 0 }], B[4], 300));
    r.add(p.doc, [{ opacity: 0, transform: 'translateY(26px) scale(0.96)' }, { opacity: 1, transform: 'none' }], B[4] + 250, 700, SPRING);
    r.add(w.toDoc, DRAW, B[4] + 450, 550, EXPO);
    pulse(r, w.svg, w.toDoc, B[4] + 800, 500);
    p.qa('[data-dl]', p.doc).forEach((e, i) => r.add(e, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], B[4] + 650 + i * 160, 500, SPRING));
    p.qa('[data-mb]', p.doc).forEach((e, i) => r.add(e, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], B[4] + 850 + i * 50, 550, SPRING));
    p.qa('.lines svg, .verdict svg', p.doc).forEach((e, i) => r.add(e, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'none' }], B[4] + 750 + i * 160, 380, SNAP));
    p.qa('[data-file]', p.doc).forEach((e, i) => r.add(e, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], B[4] + 1700 + i * 90, 500, SPRING));
    r.add(p.q('.ready', p.doc), [{ opacity: 0 }, { opacity: 1 }], B[4] + 2050, 400);

    p.button.textContent = 'Show it all';
    p.button.hidden = false;
    void Promise.all(r.anims.map((a) => a.finished)).then(() => { if (run === r) end(); }, () => undefined);
  };

  p.button.addEventListener('click', () => (run ? end() : play()));
  addEventListener('beforeprint', end);
  // A change of width moves every wire: a run ends at once, and the finished wires are drawn again.
  let width = root.offsetWidth;
  new ResizeObserver(() => {
    if (root.offsetWidth === width) return;
    width = root.offsetWidth;
    if (run) end();
    else if (root.querySelector('svg[data-wires]')) wires(p, true);
  }).observe(root);
  return { play, end, still: () => wires(p, true) };
}
