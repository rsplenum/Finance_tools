/**
 * One question a screen (NEW1b, Rahul's review of 12-11-2026: "one has to constantly adjust the scrolling to see what
 * input one is entering after the keyboard appears"). The question covers the whole screen, as an app's step does, with
 * nothing above it (the site's bar would push it down), so the box and Next stand in the top third, where a phone's
 * keyboard never reaches and nothing has to scroll: the step, the question, one plain hint, a large box (or the choices),
 * what the figure reads as, and Next straight under the box. Enter is Next, Escape is Back. The box is the same element
 * from step to step and Next does not take the focus, so the keyboard stays up through the questions. Each tool hands in
 * its questions, its checks and its read-back; nothing is worked out here.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MAIN, QUIET } from './parts';

export interface AskQuestion {
  id: string; question: string; hint: string;
  /** The answer so far, in the box. */
  value: string;
  unit?: string; inputMode?: 'decimal' | 'numeric';
  /** A fact chosen, not typed (who the borrower is). */
  choices?: { value: string; label: string }[];
  /** A fact that may be nil: a None button, and an empty box is none. */
  none?: boolean;
}
export interface AskWords { next: string; done: string; last: string; back: string; none: string; step: (i: number, n: number) => string; reads: (t: string) => string }

export function Ask(p: {
  q: AskQuestion; at: number; of: number; words: AskWords;
  /** Editing one answer from the report: Done goes back to it. */
  single?: boolean;
  problem: (t: string) => string | undefined;
  /** What a figure typed reads as (Rs. 6 lakh), from the tool's engine; undefined when it says nothing new. */
  reads: (t: string) => string | undefined;
  onAnswer: (t: string) => void;
  onBack: () => void;
}) {
  const q = p.q, [text, setText] = useState(q.value), [said, setSaid] = useState<string>();
  const top = useRef<HTMLElement>(null), box = useRef<HTMLInputElement>(null), first = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { setText(q.value); setSaid(undefined); }, [q.id]);
  // While the questions show, the rest of the page is put away, not just covered: nothing behind them scrolls, takes a
  // Tab or is read aloud. Each element beside the questions' own line of parents is hidden, and shown again after.
  useLayoutEffect(() => {
    const put: [HTMLElement, string][] = [];
    for (let at = top.current; at && at !== document.body; at = at.parentElement) {
      for (const el of at.parentElement?.children ?? []) {
        if (el === at || !(el instanceof HTMLElement) || /^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) continue;
        put.push([el, el.style.display]); el.style.display = 'none'; el.inert = true;
      }
    }
    return () => put.forEach(([el, d]) => { el.style.display = d; el.inert = false; });
  }, []);
  // Each question from its top, the focus in its box.
  useEffect(() => {
    top.current?.scrollTo({ top: 0 });
    (box.current ?? first.current)?.focus({ preventScroll: true });
  }, [q.id]);
  const go = (t: string) => {
    const bad = p.problem(t);
    if (bad) { setSaid(bad); box.current?.focus({ preventScroll: true }); return; }
    p.onAnswer(t);
  };
  // A tap on Next or None keeps the focus in the box, so a phone's keyboard does not drop and rise between questions.
  const keep = (e: MouseEvent) => { if (document.activeElement === box.current) e.preventDefault(); };
  const id = `ask-${q.id}`, hintId = `${id}-hint`, read = !said && text.trim() ? p.reads(text) : undefined;
  const label = p.single ? p.words.done : p.at === p.of ? p.words.last : p.words.next;
  return <section ref={top} data-testid="ask" data-step={q.id} role="dialog" aria-modal="true" aria-labelledby="ask-q"
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); p.onBack(); } }}
    class="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-canvas">
    <div class="mx-auto max-w-xl px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-10 sm:pt-12">
    <div class="flex min-h-11 items-center justify-between gap-3">
      <button type="button" data-testid="ask-back" class="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-medium text-link hover:bg-ink/6" onClick={p.onBack}>
        <svg aria-hidden="true" viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M10 3L5 8l5 5" /></svg>{p.words.back}</button>
      {!p.single && <p data-testid="ask-step" class="text-sm text-ink-muted tabular-nums">{p.words.step(p.at, p.of)}</p>}
    </div>
    {!p.single && <div aria-hidden="true" class="mt-1 flex gap-1">{Array.from({ length: p.of }, (_, i) =>
      <span key={i} class={`h-1 flex-1 rounded-full ${i < p.at ? 'bg-ink' : 'bg-ink/12'}`} />)}</div>}
    <h1 id="ask-q" class="mt-4 font-display text-[1.5rem] leading-[1.2] font-semibold text-ink text-balance sm:text-[2rem]">
      {q.choices ? q.question : <label for={id}>{q.question}</label>}</h1>
    <p id={hintId} class="mt-1.5 text-base text-ink-muted">{q.hint}</p>
    {q.choices
      ? <div role="radiogroup" aria-labelledby="ask-q" aria-describedby={hintId} class="mt-4 grid gap-2">
        {q.choices.map((c, i) => <button key={c.value} ref={i === 0 ? first : undefined} type="button" role="radio" aria-checked={text === c.value}
          data-testid={`ask-choice-${c.value}`} onClick={() => { setText(c.value); go(c.value); }}
          class={`min-h-14 rounded-control border px-4 text-left text-lg ${text === c.value ? 'border-ink bg-ink font-semibold text-canvas' : 'border-edge bg-field text-ink hover:bg-ink/6'}`}>{c.label}</button>)}
      </div>
      : <div class="relative mt-4">
        {q.unit === 'Rs.' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-2xl text-ink-muted">Rs.</span>}
        <input ref={box} id={id} data-testid="ask-field" type="text" inputMode={q.inputMode ?? 'decimal'} autoComplete="off" enterKeyHint={p.single || p.at === p.of ? 'done' : 'next'}
          value={text} aria-describedby={`${hintId} ask-said`} aria-invalid={!!said}
          onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setSaid(undefined); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(text); } }}
          class={`min-h-16 w-full min-w-0 rounded-control border border-edge bg-field text-[1.75rem] font-semibold text-ink tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus ${q.unit === 'Rs.' ? 'pl-16' : 'pl-4'} ${q.unit && q.unit !== 'Rs.' ? 'pr-24' : 'pr-4'}`} />
        {q.unit && q.unit !== 'Rs.' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-2xl text-ink-muted">{q.unit}</span>}
      </div>}
    <p id="ask-said" data-testid="ask-said" aria-live="polite" class={`mt-1.5 min-h-6 text-base ${said ? 'font-medium text-bad' : 'text-ink-muted'}`}>{said ?? (read ? p.words.reads(read) : '')}</p>
    {!q.choices && <div class="mt-2 flex flex-wrap items-center gap-3">
      <button type="button" data-testid="ask-next" class={MAIN} onMouseDown={keep} onClick={() => go(text)}>{label}</button>
      {q.none && <button type="button" data-testid="ask-none" class={QUIET} onMouseDown={keep} onClick={() => { setText(''); go(''); }}>{p.words.none}</button>}
    </div>}
    </div>
  </section>;
}
