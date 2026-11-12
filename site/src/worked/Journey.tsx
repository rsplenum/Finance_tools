/**
 * A journey across (NEW1d, Rahul, 12-11-2026: "The long long vertical scroll in professional mode, why can't we also make
 * it horizontal journey (really top class and sophisticated CSS elements guiding it)"). The chapters stand side by side
 * on a track that snaps a chapter at a time: a swipe, a trackpad, Tab, a stop on the rail, or Next and Back at a
 * chapter's foot move along it. The rail's line fills as the track moves (`--p`, 0 to 1, written as it scrolls); the next
 * chapter shows at the edge under a fade; each heading trails in as its chapter arrives (a scroll-driven animation, in
 * the CSS, where the browser has one and motion is welcome). The track takes the height of the chapter in view, so a
 * short chapter leaves no gap under it. Every chapter stays in the page (never hidden, never inert): a field's Change
 * link or Tab glides to its chapter, a screen reader reads on, and a check can fill any field.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

export interface Chapter { id: string; short: string; body: ComponentChildren }
export interface JourneyWords { label: string; step: (i: number, n: number) => string; next: (name: string) => string; back: string }

/** Where the track rests for a chapter: its start, or the track's end for the last (it cannot scroll further). */
const restOf = (t: HTMLElement, el: HTMLElement) => Math.min(el.offsetLeft - (parseFloat(getComputedStyle(t).scrollPaddingInlineStart) || 0), t.scrollWidth - t.clientWidth);

/** `pin` stays in sight above the chapters on a phone (from 1024 px the page has room for what it holds, and it goes);
 * `lead` stands under it, above the rail; `end` closes the last chapter. */
export function Journey({ chapters, words, pin, lead, end }: { chapters: Chapter[]; words: JourneyWords; pin?: ComponentChildren; lead?: ComponentChildren; end?: ComponentChildren }) {
  const n = chapters.length;
  const [now, setNow] = useState(0);
  const at = Math.min(now, n - 1);
  const root = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), panels = useRef<(HTMLElement | null)[]>([]);
  const atNow = useRef(at);
  atNow.current = at;

  // The chapter the track rests on, and how far along it is: between two chapters' resting places, a fraction.
  useEffect(() => {
    const t = track.current, r = root.current;
    if (!t || !r) return;
    let frame = 0, settle = 0;
    const rests = () => panels.current.slice(0, n).map((el) => (el ? restOf(t, el) : 0));
    const progress = () => {
      frame = 0;
      const x = t.scrollLeft, rs = rests();
      let f = 0;
      for (let i = 0; i < rs.length - 1; i++) {
        if (x >= rs[i + 1]) { f = i + 1; continue; }
        f = i + Math.max(0, (x - rs[i]) / Math.max(1, rs[i + 1] - rs[i]));
        break;
      }
      r.style.setProperty('--p', n > 1 ? String(Math.min(1, f / (n - 1))) : '1');
    };
    const rest = () => {
      clearTimeout(settle);
      const x = t.scrollLeft, rs = rests();
      let best = 0;
      rs.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(rs[best] - x)) best = i; });
      setNow(best);
    };
    const onScroll = () => {
      if (t.scrollTop) t.scrollTop = 0; // across only: a focused box never shifts the chapters up inside the track
      if (!frame) frame = requestAnimationFrame(progress);
      clearTimeout(settle);
      settle = window.setTimeout(rest, 140);
    };
    // A box taken by Tab or a Change link in another chapter: the track stands on that chapter, in full and at its height,
    // at once, before the browser brings the box into view (it does so after this event), so the page can scroll to it. A
    // chapter's heading, taken by Next, Back or a stop, leaves the height to glide.
    const onFocus = (e: FocusEvent) => {
      const i = panels.current.findIndex((el) => el?.contains(e.target as Node));
      const el = panels.current[i];
      if (!el || i === atNow.current) return;
      if (!(e.target as Element).matches('[data-journey-title]')) {
        el.setAttribute('data-now', '');
        t.style.transition = 'none';
        const h = `${el.offsetHeight}px`;
        t.style.setProperty('--h', h);
        t.style.height = h;
        void t.offsetHeight;
        t.style.transition = '';
        t.scrollTo({ left: restOf(t, el), behavior: 'instant' });
      }
      setNow(i);
    };
    progress();
    t.addEventListener('scroll', onScroll, { passive: true });
    t.addEventListener('scrollend', rest);
    t.addEventListener('focusin', onFocus);
    return () => { t.removeEventListener('scroll', onScroll); t.removeEventListener('scrollend', rest); t.removeEventListener('focusin', onFocus); cancelAnimationFrame(frame); clearTimeout(settle); };
  }, [n]);

  // The track's height is the resting chapter's own; the others are cut to it (CSS), so the track never scrolls up or down.
  useLayoutEffect(() => {
    const t = track.current, el = panels.current[at];
    if (!t || !el) return;
    const fit = () => { const h = `${el.offsetHeight}px`; t.style.setProperty('--h', h); t.style.height = h; };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    // A box taken by Tab or a Change link in a chapter that was cut: once its chapter is in full, it is brought into view.
    const box = document.activeElement;
    if (box instanceof HTMLElement && el.contains(box) && box !== el.querySelector('[data-journey-title]')) requestAnimationFrame(() => box.scrollIntoView({ block: 'nearest' }));
    return () => watch.disconnect();
  }, [at, n]);

  /** To a chapter: the track glides there (smooth unless motion is reduced, in the CSS), the page brings the journey's
   * top into view when the reader is below it, and the chapter's heading takes the focus. */
  const go = (i: number) => {
    const t = track.current, el = panels.current[i], r = root.current;
    if (!t || !el || !r) return;
    t.scrollTo({ left: restOf(t, el) });
    if (r.getBoundingClientRect().top < 0) r.scrollIntoView({ block: 'start' });
    el.querySelector<HTMLElement>('[data-journey-title]')?.focus({ preventScroll: true });
  };

  return <div ref={root} data-testid="journey" data-chapter-now={chapters[at]?.id} data-one={n === 1 ? '' : undefined} class="journey" style={{ '--n': n }}>
    {pin && <div class="journey-pin">{pin}<span aria-hidden="true" class="journey-hair" /></div>}
    {lead}
    {n > 1 && <nav aria-label={words.label} class="journey-rail">
      <span aria-hidden="true" class="journey-line"><span class="journey-fill" /></span>
      <ol class="journey-stops">
        {chapters.map((c, i) => <li key={c.id}>
          <button type="button" data-testid={`stop-${c.id}`} aria-current={i === at ? 'step' : undefined}
            data-state={i < at ? 'done' : i === at ? 'now' : 'ahead'} class="journey-stop-button" onClick={() => go(i)}>
            <span aria-hidden="true" class="journey-dot">{i + 1}</span>
            <span class="journey-name"><span class="sr-only">{words.step(i + 1, n)}: </span>{c.short}</span>
          </button>
        </li>)}
      </ol>
    </nav>}
    <div ref={track} data-testid="journey-track" class="journey-track" data-last={at === n - 1 && n > 1 ? '' : undefined}>
      {chapters.map((c, i) => <div key={c.id} ref={(el) => { panels.current[i] = el; }} data-chapter={c.id} data-now={i === at ? '' : undefined}
        role="group" aria-roledescription="step" aria-label={`${words.step(i + 1, n)}: ${c.short}`} class="journey-panel">
        {n > 1 && <p data-journey-title tabIndex={-1} class="journey-step">{words.step(i + 1, n)}</p>}
        {c.body}
        {(n > 1 || end) && <div class="journey-foot">
          {i < n - 1 && <button type="button" data-testid={`next-${c.id}`} class="journey-next" onClick={() => go(i + 1)}>{words.next(chapters[i + 1].short)}<span aria-hidden="true" class="journey-arrow">→</span></button>}
          {i === n - 1 && end}
          {i > 0 && <button type="button" data-testid={`back-${c.id}`} class="journey-back" onClick={() => go(i - 1)}><span aria-hidden="true">←</span> {words.back}</button>}
        </div>}
      </div>)}
    </div>
  </div>;
}
